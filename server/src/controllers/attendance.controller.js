import supabase from '../config/supabase.js';
import { ok, created, badRequest, serverError } from '../utils/response.js';

// ─── Private helpers ─────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD (server local date) */
const getTodayDate = () =>
  new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Bangkok',
  });

/** Returns current time as HH:MM:SS */
const getCurrentTime = () =>
  new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
  });
// ─── Controllers ─────────────────────────────────────────────────────────────

/** POST /api/attendance/checkin */
export const checkIn = async (req, res) => {
  const { id: userId } = req.user;
  const workDate = getTodayDate();
  const checkInTime = getCurrentTime();

  try {
    // Duplicate check
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .maybeSingle();

    if (existing) return badRequest(res, 'ลงเวลาเข้างานวันนี้แล้ว');

    // Find assigned shift for this user for today's date (or general assignment)
    let isLate = false;
    let assignedShift = null;

    // 1. Check if there is a specific shift assigned for today (workDate)
    const { data: dateSpecificShift } = await supabase
      .from('user_shifts')
      .select('shifts:shift_id (id, shift_name, start_time, end_time)')
      .eq('user_id', userId)
      .eq('effective_date', workDate)
      .maybeSingle();

    if (dateSpecificShift?.shifts?.start_time) {
      assignedShift = dateSpecificShift.shifts;
    } else {
      // 2. Fallback to latest general user shift assignment
      const { data: generalUserShift } = await supabase
        .from('user_shifts')
        .select('shifts:shift_id (id, shift_name, start_time, end_time)')
        .eq('user_id', userId)
        .is('effective_date', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (generalUserShift?.shifts?.start_time) {
        assignedShift = generalUserShift.shifts;
      } else {
        // 3. Fallback to any recent assigned shift for this user
        const { data: anyUserShift } = await supabase
          .from('user_shifts')
          .select('shifts:shift_id (id, shift_name, start_time, end_time)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyUserShift?.shifts?.start_time) {
          assignedShift = anyUserShift.shifts;
        } else {
          // 4. Default standard shift (กะเช้า)
          const { data: defaultShift } = await supabase
            .from('shifts')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (defaultShift) assignedShift = defaultShift;
        }
      }
    }

    if (assignedShift?.start_time) {
      // Compare checkInTime with shift start_time (HH:MM:SS)
      if (checkInTime > assignedShift.start_time) {
        isLate = true;
      }
    }

    const attendanceStatus = isLate ? 'late' : 'present';

    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        work_date: workDate,
        check_in_time: checkInTime,
        status: attendanceStatus,
      })
      .select()
      .single();

    if (error) throw error;

    const message = isLate
      ? `ลงเวลาเข้างานสำเร็จ (สาย - กำหนดเข้างาน ${assignedShift?.start_time?.slice(0, 5)})`
      : 'ลงเวลาเข้างานสำเร็จ';

    return created(res, { message, data: record, isLate });
  } catch (error) {
    return serverError(res, error, 'checkIn');
  }
};

/** POST /api/attendance/checkout */
export const checkOut = async (req, res) => {
  const { id: userId } = req.user;
  const workDate = getTodayDate();
  const checkOutTime = getCurrentTime();

  try {
    const { data: record } = await supabase
      .from('attendance_records')
      .select('id, check_out_time')
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .maybeSingle();

    if (!record) return badRequest(res, 'ยังไม่ได้ลงเวลาเข้างาน');
    if (record.check_out_time) return badRequest(res, 'ลงเวลาออกงานวันนี้แล้ว');

    const { data: updated, error } = await supabase
      .from('attendance_records')
      .update({ check_out_time: checkOutTime })
      .eq('id', record.id)
      .select()
      .single();

    if (error) throw error;

    return ok(res, { message: 'ลงเวลาออกงานสำเร็จ', data: updated });
  } catch (error) {
    return serverError(res, error, 'checkOut');
  }
};

/** GET /api/attendance/today */
export const getTodayStatus = async (req, res) => {
  const { id: userId } = req.user;
  const workDate = getTodayDate();

  try {
    const { data: record, error } = await supabase
      .from('attendance_records')
      .select()
      .eq('user_id', userId)
      .eq('work_date', workDate)
      .maybeSingle();

    if (error) throw error;

    return ok(res, { data: record ?? null });
  } catch (error) {
    return serverError(res, error, 'getTodayStatus');
  }
};

/** GET /api/attendance/my-history?month=10&year=2026&page=1&limit=20 */
export const getMyHistory = async (req, res) => {
  const { id: userId } = req.user;
  const { month, year, page = 1, limit = 20 } = req.query;

  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  try {
    let query = supabase
      .from('attendance_records')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('work_date', { ascending: false })
      .range(from, to);

    if (month && year) {
      // Filter by year-month prefix e.g. "2026-10"
      const monthStr = String(month).padStart(2, '0');
      query = query
        .gte('work_date', `${year}-${monthStr}-01`)
        .lte('work_date', `${year}-${monthStr}-31`);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    return ok(res, {
      data,
      meta: { total: count, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    return serverError(res, error, 'getMyHistory');
  }
};

/** Matches 24-hour time in HH:MM format */
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_NOTE_LENGTH = 255;

/** PATCH /api/attendance/:id */
export const updateRecord = async (req, res) => {
  const { id: userId } = req.user;
  const { id: recordId } = req.params;
  const { check_in_time, check_out_time, note } = req.body;

  const checkInText = String(check_in_time || '');
  const isCheckInValid = TIME_PATTERN.test(checkInText);

  if (!isCheckInValid) {
    return badRequest(res, 'รูปแบบเวลาเข้างานไม่ถูกต้อง (HH:MM)');
  }

  const hasCheckOut = Boolean(check_out_time);

  if (hasCheckOut) {
    const checkOutText = String(check_out_time);
    const isCheckOutValid = TIME_PATTERN.test(checkOutText);

    if (!isCheckOutValid) {
      return badRequest(res, 'รูปแบบเวลาออกงานไม่ถูกต้อง (HH:MM)');
    }

    const isOutAfterIn = checkOutText > checkInText;

    if (!isOutAfterIn) {
      return badRequest(res, 'เวลาออกงานต้องมากกว่าเวลาเข้างาน');
    }
  }

  const trimmedNote = typeof note === 'string' ? note.trim() : '';

  if (trimmedNote.length > MAX_NOTE_LENGTH) {
    return badRequest(res, `หมายเหตุต้องไม่เกิน ${MAX_NOTE_LENGTH} ตัวอักษร`);
  }

  try {
    // Ownership check: only the record owner can edit
    const { data: existing, error: findError } = await supabase
      .from('attendance_records')
      .select('id, check_in_time, check_out_time, note')
      .eq('id', recordId)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: 'ไม่พบรายการลงเวลา' });
    }

    const newValues = {
      check_in_time: `${checkInText}:00`,
      check_out_time: hasCheckOut ? `${check_out_time}:00` : null,
      note: trimmedNote || null,
    };

    const oldValues = {
      check_in_time: existing.check_in_time,
      check_out_time: existing.check_out_time,
      note: existing.note,
    };

    const { data: updated, error: updateError } = await supabase
      .from('attendance_records')
      .update(newValues)
      .eq('id', recordId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const { error: logError } = await supabase
      .from('attendance_edit_logs')
      .insert({
        attendance_id: existing.id,
        edited_by: userId,
        old_values: oldValues,
        new_values: newValues,
      });

    if (logError) {
      throw logError;
    }

    return ok(res, { message: 'แก้ไขเวลาสำเร็จ', data: updated });
  } catch (error) {
    return serverError(res, error, 'updateRecord');
  }
};
