import {
  ok,
  created,
  badRequest,
  notFound,
  forbidden,
  serverError,
} from '../utils/response.js';
import supabase from '../config/supabase.js';

const ALLOWED_LEAVE_TYPES = Object.freeze(['annual', 'sick', 'personal']);
const ALLOWED_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

/**
 * Sanitize text input to prevent XSS / malicious injections
 */
const sanitizeText = (str = '') =>
  typeof str === 'string' ? str.replace(/[<>]/g, '').trim() : '';

/**
 * Validate leave payload (shared by create & update)
 * คืนข้อความ error ถ้าไม่ผ่าน, คืน null ถ้าผ่าน
 */
const validateLeavePayload = ({ leaveType, startDate, endDate }) => {
  if (!leaveType || !startDate || !endDate) {
    return 'กรุณากรอกข้อมูลวันที่และประเภทการลาให้ครบถ้วน';
  }

  if (!ALLOWED_LEAVE_TYPES.includes(leaveType)) {
    return 'ประเภทการลาไม่ถูกต้อง';
  }

  const startTime = new Date(startDate);
  const endTime = new Date(endDate);
  if (startTime > endTime) {
    return 'วันที่เริ่มลาต้องไม่เกินวันที่สิ้นสุด';
  }

  return null;
};

/**
 * วันที่วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD
 * (เทียบกับคอลัมน์ DATE ในฐานข้อมูลได้ตรงๆ)
 */
const getTodayInBangkok = () => {
  const now = new Date();
  const todayText = now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Bangkok',
  });
  return todayText;
};

/**
 * หาคำขอลาที่เป็นของ user คนนี้เท่านั้น (null ถ้าไม่พบ หรือไม่ใช่ของเขา)
 */
const findOwnLeaveRequest = async (requestId, userId) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * POST /api/leave/request
 * สร้างคำขอลางาน (อนุมัติอัตโนมัติ ไม่ต้องรอหัวหน้า)
 */
export const createLeaveRequest = async (req, res) => {
  const { id: userId } = req.user;
  const { leaveType, startDate, endDate, reason } = req.body;

  const validationMessage = validateLeavePayload({
    leaveType,
    startDate,
    endDate,
  });
  if (validationMessage) {
    return badRequest(res, validationMessage);
  }

  const cleanReason = sanitizeText(reason);
  const approvedAt = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: cleanReason,
        status: 'approved',
        approved_at: approvedAt,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return created(res, { message: 'ส่งคำขอลางานเรียบร้อยแล้ว', data });
  } catch (error) {
    return serverError(res, error, 'createLeaveRequest');
  }
};

/**
 * PUT /api/leave/:id
 * แก้ไขคำขอลาของตนเอง (แก้ได้เฉพาะรายการที่ยังไม่สิ้นสุด)
 */
export const updateMyLeaveRequest = async (req, res) => {
  const { id: userId } = req.user;
  const { id: requestId } = req.params;
  const { leaveType, startDate, endDate, reason } = req.body;

  const validationMessage = validateLeavePayload({
    leaveType,
    startDate,
    endDate,
  });
  if (validationMessage) {
    return badRequest(res, validationMessage);
  }

  const cleanReason = sanitizeText(reason);

  try {
    const existingLeave = await findOwnLeaveRequest(requestId, userId);
    if (!existingLeave) {
      return notFound(res, 'ไม่พบคำขอลางานนี้');
    }

    const today = getTodayInBangkok();
    const isAlreadyFinished = existingLeave.end_date < today;
    if (isAlreadyFinished) {
      return badRequest(res, 'ไม่สามารถแก้ไขการลาที่สิ้นสุดไปแล้วได้');
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: cleanReason,
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return ok(res, { message: 'แก้ไขคำขอลางานเรียบร้อยแล้ว', data });
  } catch (error) {
    return serverError(res, error, 'updateMyLeaveRequest');
  }
};

/**
 * DELETE /api/leave/:id
 * ยกเลิก (ลบ) คำขอลาของตนเอง (ยกเลิกได้เฉพาะรายการที่ยังไม่สิ้นสุด)
 */
export const deleteMyLeaveRequest = async (req, res) => {
  const { id: userId } = req.user;
  const { id: requestId } = req.params;

  try {
    const existingLeave = await findOwnLeaveRequest(requestId, userId);
    if (!existingLeave) {
      return notFound(res, 'ไม่พบคำขอลางานนี้');
    }

    const today = getTodayInBangkok();
    const isAlreadyFinished = existingLeave.end_date < today;
    if (isAlreadyFinished) {
      return badRequest(res, 'ไม่สามารถยกเลิกการลาที่สิ้นสุดไปแล้วได้');
    }

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', requestId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return ok(res, { message: 'ยกเลิกคำขอลางานเรียบร้อยแล้ว' });
  } catch (error) {
    return serverError(res, error, 'deleteMyLeaveRequest');
  }
};

/**
 * GET /api/leave/my-history
 * ประวัติการลาของตนเอง พร้อมตัวกรองประเภทการลา & สถานะ
 */
export const getMyLeaveHistory = async (req, res) => {
  const { id: userId } = req.user;
  const { status, leaveType } = req.query;

  try {
    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    if (leaveType && ALLOWED_LEAVE_TYPES.includes(leaveType)) {
      query = query.eq('leave_type', leaveType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ok(res, { data: data ?? [] });
  } catch (error) {
    return serverError(res, error, 'getMyLeaveHistory');
  }
};

/**
 * GET /api/leave/all (Manager & Admin only)
 * ดูคำขอลางานทั้งหมด
 */
export const getAllLeaveRequests = async (req, res) => {
  const { status, search } = req.query;

  try {
    let query = supabase
      .from('leave_requests')
      .select(
        `
        *,
        users:user_id (
          id, employee_code, first_name, last_name, department, position
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Filter by employee search if provided
    let results = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.users?.first_name?.toLowerCase().includes(q) ||
          item.users?.last_name?.toLowerCase().includes(q) ||
          item.users?.employee_code?.toLowerCase().includes(q),
      );
    }

    return ok(res, { data: results });
  } catch (error) {
    return serverError(res, error, 'getAllLeaveRequests');
  }
};

/**
 * PATCH /api/leave/:id/status (Manager & Admin only)
 * อนุมัติ / ปฏิเสธคำขอลา
 */
export const updateLeaveStatus = async (req, res) => {
  const { id: requestId } = req.params;
  const { status } = req.body;
  const { id: approverId } = req.user;

  if (!ALLOWED_STATUSES.includes(status)) {
    return badRequest(res, 'สถานะไม่ถูกต้อง');
  }

  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return notFound(res, 'ไม่พบคำขอลางานนี้');

    return ok(res, { message: 'อัปเดตสถานะคำขอลาสำเร็จ', data });
  } catch (error) {
    return serverError(res, error, 'updateLeaveStatus');
  }
};
