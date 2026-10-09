/**
 * Centralized HTTP response helpers — ES6 best practice
 * ใช้ consistent response shape ทั่วทั้ง API
 */

export const ok = (res, data = {}, statusCode = 200) =>
  res.status(statusCode).json({ success: true, ...data });

export const created = (res, data = {}) => ok(res, data, 201);

export const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

export const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, message });

export const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, message });

export const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, message });

export const serverError = (res, error, context = '') => {
  console.error(`[${context || 'Server'}]`, error?.message ?? error);
  return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' });
};
