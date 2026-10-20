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

const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
});

export const requireAdminAccess = (req, res, next) => {
  const userRole = req.user?.role;
  const isAdmin = userRole === ROLES.ADMIN;

  if (!isAdmin) {
    return forbidden(res, 'ต้องการสิทธิ์ผู้ดูแลระบบ');
  }

  return next();
};

export const requireManagerAccess = (req, res, next) => {
  const userRole = req.user?.role;
  const isAdmin = userRole === ROLES.ADMIN;
  const isManager = userRole === ROLES.MANAGER;
  const hasManagementAccess = isAdmin || isManager;

  if (!hasManagementAccess) {
    return forbidden(res, 'ต้องการสิทธิ์ผู้จัดการขึ้นไป');
  }

  return next();
};
