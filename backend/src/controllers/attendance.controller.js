import supabase from '../config/supabase.js';
import { ok, created, badRequest, serverError } from '../utils/response.js';

// ─── Private helpers ─────────────────────────────────────────────────────────

/** Returns today's date in YYYY-MM-DD (server local date) */
const getTodayDate = () => new Date().toISOString().split('T')[0];

/** Returns current time as HH:MM:SS */
const getCurrentTime = () =>
  new Date().toTimeString().split(' ')[0];

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

    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        work_date: workDate,
        check_in_time: checkInTime,
        status: 'present',
      })
      .select()
      .single();

    if (error) throw error;

    return created(res, { message: 'ลงเวลาเข้างานสำเร็จ', data: record });
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

    return ok(res, { data, meta: { total: count, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    return serverError(res, error, 'getMyHistory');
  }
};
