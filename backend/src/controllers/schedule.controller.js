import supabase from '../config/supabase.js';
import { ok, created, badRequest, notFound, serverError } from '../utils/response.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Format time to HH:MM:SS
 */
const formatTimeToSeconds = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length === 2) return `${timeStr}:00`;
  return timeStr;
};

// ─── Shift Templates (กะการทำงาน) ──────────────────────────────────────────

/**
 * GET /api/schedules/shifts
 * ดูรายการกะการทำงานทั้งหมด (พนักงาน & admin ดูได้)
 */
export const getAllShifts = async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ok(res, { data: data ?? [] });
  } catch (error) {
    return serverError(res, error, 'getAllShifts');
  }
};

/**
 * POST /api/schedules/shifts
 * สร้างกะการทำงานใหม่ (Admin only)
 */
export const createShift = async (req, res) => {
  const { shift_name, start_time, end_time } = req.body;

  if (!shift_name?.trim()) {
    return badRequest(res, 'กรุณาระบุชื่อกะการทำงาน');
  }
  if (!start_time || !TIME_REGEX.test(start_time)) {
    return badRequest(res, 'รูปแบบเวลาเริ่มงานไม่ถูกต้อง (HH:MM หรือ HH:MM:SS)');
  }
  if (!end_time || !TIME_REGEX.test(end_time)) {
    return badRequest(res, 'รูปแบบเวลาเลิกงานไม่ถูกต้อง (HH:MM หรือ HH:MM:SS)');
  }

  try {
    const { data, error } = await supabase
      .from('shifts')
      .insert({
        shift_name: shift_name.trim(),
        start_time: formatTimeToSeconds(start_time),
        end_time: formatTimeToSeconds(end_time),
      })
      .select()
      .single();

    if (error) throw error;
    return created(res, { message: 'สร้างกะการทำงานสำเร็จ', data });
  } catch (error) {
    return serverError(res, error, 'createShift');
  }
};

/**
 * PUT /api/schedules/shifts/:id
 * แก้ไขกะการทำงาน (Admin only)
 */
export const updateShift = async (req, res) => {
  const { id } = req.params;
  const { shift_name, start_time, end_time } = req.body;

  if (!shift_name?.trim()) {
    return badRequest(res, 'กรุณาระบุชื่อกะการทำงาน');
  }
  if (!start_time || !TIME_REGEX.test(start_time)) {
    return badRequest(res, 'รูปแบบเวลาเริ่มงานไม่ถูกต้อง');
  }
  if (!end_time || !TIME_REGEX.test(end_time)) {
    return badRequest(res, 'รูปแบบเวลาเลิกงานไม่ถูกต้อง');
  }

  try {
    const { data, error } = await supabase
      .from('shifts')
      .update({
        shift_name: shift_name.trim(),
        start_time: formatTimeToSeconds(start_time),
        end_time: formatTimeToSeconds(end_time),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return notFound(res, 'ไม่พบกะการทำงานที่ต้องการแก้ไข');

    return ok(res, { message: 'แก้ไขกะการทำงานสำเร็จ', data });
  } catch (error) {
    return serverError(res, error, 'updateShift');
  }
};

/**
 * DELETE /api/schedules/shifts/:id
 * ลบกะการทำงาน (Admin only)
 */
export const deleteShift = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if shift is currently assigned to users
    const { count } = await supabase
      .from('user_shifts')
      .select('*', { count: 'exact', head: true })
      .eq('shift_id', id);

    if (count && count > 0) {
      return badRequest(res, `ไม่สามารถลบกะนี้ได้เนื่องจากมีพนักงานใช้งานอยู่ (${count} คน)`);
    }

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return ok(res, { message: 'ลบกะการทำงานสำเร็จ' });
  } catch (error) {
    return serverError(res, error, 'deleteShift');
  }
};

// ─── User Shift Assignments (ตารางกะการทำงานของพนักงาน) ─────────────────────────

/**
 * GET /api/schedules/my-shift
 * ดึงข้อมูลกะการทำงานปัจจุบันของตนเอง (สำหรับ Dashboard & พนักงาน)
 */
export const getMyCurrentShift = async (req, res) => {
  const { id: userId } = req.user;

  try {
    // Get latest active user_shift
    const { data, error } = await supabase
      .from('user_shifts')
      .select(`
        id,
        user_id,
        shift_id,
        effective_date,
        created_at,
        shifts:shift_id (
          id,
          shift_name,
          start_time,
          end_time
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    // Fallback if no specific shift is assigned: default to first available shift
    let shiftData = data?.shifts ?? null;
    if (!shiftData) {
      const { data: defaultShift } = await supabase
        .from('shifts')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      shiftData = defaultShift ?? {
        id: null,
        shift_name: 'เวลามาตรฐาน',
        start_time: '08:30:00',
        end_time: '17:30:00',
      };
    }

    return ok(res, {
      data: {
        assignment_id: data?.id ?? null,
        effective_date: data?.effective_date ?? null,
        shift: shiftData,
      },
    });
  } catch (error) {
    return serverError(res, error, 'getMyCurrentShift');
  }
};

/**
 * GET /api/schedules/user-shifts
 * ดูรายการกะของพนักงานทุกคน (Admin or Employee viewing roster)
 */
export const getAllUserShifts = async (_req, res) => {
  try {
    // Get all users and their assigned shifts
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, employee_code, first_name, last_name, department, position, role, is_active')
      .order('employee_code', { ascending: true });

    if (userError) throw userError;

    const { data: userShifts, error: shiftError } = await supabase
      .from('user_shifts')
      .select(`
        id,
        user_id,
        shift_id,
        effective_date,
        shifts:shift_id (
          id,
          shift_name,
          start_time,
          end_time
        )
      `)
      .order('created_at', { ascending: false });

    if (shiftError) throw shiftError;

    // Map latest shift for each user
    const shiftMap = new Map();
    userShifts?.forEach((us) => {
      if (!shiftMap.has(us.user_id)) {
        shiftMap.set(us.user_id, us);
      }
    });

    const result = users.map((u) => {
      const assigned = shiftMap.get(u.id);
      return {
        ...u,
        assignment_id: assigned?.id ?? null,
        shift_id: assigned?.shift_id ?? null,
        effective_date: assigned?.effective_date ?? null,
        shift: assigned?.shifts ?? null,
      };
    });

    return ok(res, { data: result });
  } catch (error) {
    return serverError(res, error, 'getAllUserShifts');
  }
};

/**
 * POST /api/schedules/assign
 * มอบหมาย/เปลี่ยนกะการทำงานให้พนักงาน (Admin or Employee for self/others)
 * รองรับทั้งพนักงานเลือกกะของตนเอง และ Admin จัดตารางให้พนักงาน
 */
export const assignUserShift = async (req, res) => {
  const { id: currentUserId, role } = req.user;
  const { user_id, shift_id, effective_date } = req.body;

  // If not admin, employees can only assign/update their own shift
  const targetUserId = role === 'admin' ? (user_id || currentUserId) : currentUserId;

  if (!shift_id) {
    return badRequest(res, 'กรุณาเลือกกะการทำงาน');
  }

  try {
    // Validate that shift exists
    const { data: shift, error: shiftFindError } = await supabase
      .from('shifts')
      .select('id, shift_name')
      .eq('id', shift_id)
      .maybeSingle();

    if (shiftFindError || !shift) {
      return badRequest(res, 'ไม่พบกะการทำงานที่ระบุ');
    }

    // Check if user already has an assignment
    const { data: existing } = await supabase
      .from('user_shifts')
      .select('id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_shifts')
        .update({
          shift_id,
          effective_date: effective_date || null,
        })
        .eq('id', existing.id)
        .select(`
          id,
          user_id,
          shift_id,
          effective_date,
          shifts:shift_id (id, shift_name, start_time, end_time)
        `)
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_shifts')
        .insert({
          user_id: targetUserId,
          shift_id,
          effective_date: effective_date || null,
        })
        .select(`
          id,
          user_id,
          shift_id,
          effective_date,
          shifts:shift_id (id, shift_name, start_time, end_time)
        `)
        .single();

      if (error) throw error;
      result = data;
    }

    return ok(res, {
      message: 'บันทึกตารางกะการทำงานเรียบร้อยแล้ว',
      data: result,
    });
  } catch (error) {
    return serverError(res, error, 'assignUserShift');
  }
};
