import supabase from '../config/supabase.js';
import { ok, badRequest, serverError } from '../utils/response.js';

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export const getAttendanceReport = async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
    return badRequest(res, 'วันที่เริ่มต้นหรือสิ้นสุดไม่ถูกต้อง');
  }
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
  if (days > 90) return badRequest(res, 'Report date range cannot exceed 90 days');
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, work_date, check_in_time, check_out_time, status, note, users!inner(id, employee_code, first_name, last_name, department)')
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false })
      .range(0, 999);
    if (error) throw error;
    return ok(res, { data, meta: { returned: data.length, limit: 1000 } });
  } catch (error) {
    return serverError(res, error, 'getAttendanceReport');
  }
};
