import jwt from 'jsonwebtoken';
import { unauthorized, forbidden } from '../utils/response.js';

// ─── Token verification ───────────────────────────────────────────────────────

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization ?? '';

  if (!authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'กรุณาเข้าสู่ระบบก่อนใช้งาน');
  }

  const token = authHeader.slice(7); // faster than split(' ')[1]

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return unauthorized(res, 'Token ไม่ถูกต้องหรือหมดอายุ');
  }
};

// ─── Role guards ──────────────────────────────────────────────────────────────

const ROLES = Object.freeze({ ADMIN: 'admin' });

export const requireAdminAccess = (req, res, next) =>
  req.user?.role === ROLES.ADMIN
    ? next()
    : forbidden(res, 'ต้องการสิทธิ์ผู้ดูแลระบบ');

