import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';
import supabase from '../config/supabase.js';

const ALLOWED_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);

const sanitizeText = (str = '') =>
  typeof str === 'string'
    ? str.replace(/[<>]/g, '').trim()
    : '';

/**
 * POST /api/overtime/request
 * ส่งคำขอล่วงเวลา (OT)
 */
export const createOvertimeRequest = async (req, res) => {
  const { id: userId } = req.user;
  const { workDate, startTime, endTime, reason } = req.body;

  if (!workDate || !startTime || !endTime) {
    return badRequest(res, 'กรุณาระบุวันที่และช่วงเวลาให้ครบถ้วน');
  }

  if (startTime >= endTime) {
    return badRequest(res, 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด');
  }

  const cleanReason = sanitizeText(reason);

  try {
    const { data, error } = await supabase
      .from('overtime_requests')
      .insert({
        user_id: userId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        reason: cleanReason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    return created(res, { message: 'ส่งคำขอทำงานล่วงเวลาเรียบร้อยแล้ว', data });
  } catch (error) {
    return serverError(res, error, 'createOvertimeRequest');
  }
};

/**
 * GET /api/overtime/my-history
 * ประวัติ OT ของผู้ใช้
 */
export const getMyOvertimeHistory = async (req, res) => {
  const { id: userId } = req.user;
  const { status, month, year } = req.query;

  try {
    let query = supabase
      .from('overtime_requests')
      .select('*')
      .eq('user_id', userId)
      .order('work_date', { ascending: false });

    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      query = query
        .gte('work_date', `${year}-${monthStr}-01`)
        .lte('work_date', `${year}-${monthStr}-31`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ok(res, { data: data ?? [] });
  } catch (error) {
    return serverError(res, error, 'getMyOvertimeHistory');
  }
};

/**
 * GET /api/overtime/all (Manager / Admin)
 * รายการ OT ทั้งหมด
 */
export const getAllOvertimeRequests = async (req, res) => {
  const { status, search } = req.query;

  try {
    let query = supabase
      .from('overtime_requests')
      .select(`
        *,
        users:user_id (
          id, employee_code, first_name, last_name, department, position
        )
      `)
      .order('work_date', { ascending: false });

    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (item) =>
          item.users?.first_name?.toLowerCase().includes(q) ||
          item.users?.last_name?.toLowerCase().includes(q) ||
          item.users?.employee_code?.toLowerCase().includes(q)
      );
    }

    return ok(res, { data: results });
  } catch (error) {
    return serverError(res, error, 'getAllOvertimeRequests');
  }
};

/**
 * PATCH /api/overtime/:id/status (Manager / Admin)
 * อนุมัติ / ปฏิเสธ OT
 */
export const updateOvertimeStatus = async (req, res) => {
  const { id: requestId } = req.params;
  const { status } = req.body;
  const { id: approverId } = req.user;

  if (!ALLOWED_STATUSES.includes(status)) {
    return badRequest(res, 'สถานะไม่ถูกต้อง');
  }

  try {
    const { data, error } = await supabase
      .from('overtime_requests')
      .update({
        status,
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return notFound(res, 'ไม่พบคำขอ OT นี้');

    return ok(res, { message: 'อัปเดตสถานะ OT สำเร็จ', data });
  } catch (error) {
    return serverError(res, error, 'updateOvertimeStatus');
  }
};
