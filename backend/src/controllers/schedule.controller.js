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
  const targetDate = req.query.date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  try {
    // 1. Try date-specific shift
    let userShiftRecord = null;
    const { data: dateShift } = await supabase
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
      .eq('effective_date', targetDate)
      .maybeSingle();

    if (dateShift) {
      userShiftRecord = dateShift;
    } else {
      // 2. Fallback to latest general user_shift
      const { data: latestShift } = await supabase
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

      userShiftRecord = latestShift;
    }

    const data = userShiftRecord;

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
 * GET /api/schedules/user-shifts?month=10&year=2026
 * ดูรายการกะของพนักงานทุกคน พร้อมตารางกะรายวันในเดือนนั้น (Matrix Table)
 */
export const getAllUserShifts = async (req, res) => {
  const { month, year } = req.query;

  try {
    // 1. Get all active and existing employees
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, employee_code, first_name, last_name, department, position, role, is_active')
      .order('department', { ascending: true })
      .order('employee_code', { ascending: true });

    if (userError) throw userError;

    // 2. Query user_shifts
    let query = supabase
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

    // If month and year provided, get shifts for that month (plus general shifts without date)
    if (month && year) {
      const monthStr = String(month).padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-31`;
      query = query.or(`effective_date.gte.${startDate},effective_date.is.null`)
                   .or(`effective_date.lte.${endDate},effective_date.is.null`);
    }

    const { data: userShifts, error: shiftError } = await query;
    if (shiftError) throw shiftError;

    // Build schedule map per user:
    // userDailyMap: Map<user_id, Map<YYYY-MM-DD, shift>>
    // userDefaultMap: Map<user_id, shift>
    const userDailyMap = new Map();
    const userDefaultMap = new Map();

    userShifts?.forEach((us) => {
      if (us.effective_date) {
        if (!userDailyMap.has(us.user_id)) {
          userDailyMap.set(us.user_id, new Map());
        }
        const daily = userDailyMap.get(us.user_id);
        if (!daily.has(us.effective_date)) {
          daily.set(us.effective_date, {
            assignment_id: us.id,
            shift_id: us.shift_id,
            shift: us.shifts,
          });
        }
      } else {
        if (!userDefaultMap.has(us.user_id)) {
          userDefaultMap.set(us.user_id, {
            assignment_id: us.id,
            shift_id: us.shift_id,
            shift: us.shifts,
          });
        }
      }
    });

    const result = users.map((u) => {
      const dailySchedulesObj = {};
      if (userDailyMap.has(u.id)) {
        userDailyMap.get(u.id).forEach((val, dateKey) => {
          dailySchedulesObj[dateKey] = val;
        });
      }

      const defaultShift = userDefaultMap.get(u.id) || null;

      return {
        ...u,
        default_shift: defaultShift?.shift || null,
        daily_schedules: dailySchedulesObj,
      };
    });

    return ok(res, { data: result });
  } catch (error) {
    return serverError(res, error, 'getAllUserShifts');
  }
};

/**
 * POST /api/schedules/assign
 * มอบหมาย/เปลี่ยนกะการทำงานให้พนักงาน (รายวันหรือกะหลัก)
 */
export const assignUserShift = async (req, res) => {
  const { id: currentUserId, role } = req.user;
  const {
    user_id,
    shift_id,
    effective_date,
    is_custom,
    custom_name,
    custom_start_time,
    custom_end_time,
  } = req.body;

  // If not admin, employees can only assign/update their own shift
  const targetUserId = role === 'admin' ? (user_id || currentUserId) : currentUserId;

  let assignedShiftId = shift_id;

  try {
    // If user provided a custom work time (เลือกเวลาการทำงานได้เอง)
    if (is_custom || (!shift_id && custom_start_time && custom_end_time)) {
      if (!custom_start_time || !TIME_REGEX.test(custom_start_time)) {
        return badRequest(res, 'กรุณาระบุเวลาเริ่มงานที่ถูกต้อง (HH:MM)');
      }
      if (!custom_end_time || !TIME_REGEX.test(custom_end_time)) {
        return badRequest(res, 'กรุณาระบุเวลาเลิกงานที่ถูกต้อง (HH:MM)');
      }

      const formattedStart = formatTimeToSeconds(custom_start_time);
      const formattedEnd = formatTimeToSeconds(custom_end_time);
      const shiftName = custom_name?.trim() || `กำหนดเอง (${custom_start_time.slice(0, 5)} - ${custom_end_time.slice(0, 5)})`;

      // Check if an identical shift already exists or create new
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('start_time', formattedStart)
        .eq('end_time', formattedEnd)
        .limit(1)
        .maybeSingle();

      if (existingShift?.id) {
        assignedShiftId = existingShift.id;
      } else {
        const { data: newShift, error: createError } = await supabase
          .from('shifts')
          .insert({
            shift_name: shiftName,
            start_time: formattedStart,
            end_time: formattedEnd,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        assignedShiftId = newShift.id;
      }
    }

    if (!assignedShiftId) {
      return badRequest(res, 'กรุณาเลือกกะการทำงานหรือระบุเวลาที่กำหนดเอง');
    }

    // Validate that shift exists
    const { data: shift, error: shiftFindError } = await supabase
      .from('shifts')
      .select('id, shift_name')
      .eq('id', assignedShiftId)
      .maybeSingle();

    if (shiftFindError || !shift) {
      return badRequest(res, 'ไม่พบกะการทำงานที่ระบุ');
    }

    // Check if user already has an assignment for this date
    let findQuery = supabase
      .from('user_shifts')
      .select('id')
      .eq('user_id', targetUserId);

    if (effective_date) {
      findQuery = findQuery.eq('effective_date', effective_date);
    } else {
      findQuery = findQuery.is('effective_date', null);
    }

    const { data: existing } = await findQuery.maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_shifts')
        .update({
          shift_id: assignedShiftId,
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
          shift_id: assignedShiftId,
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
