import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getAttendanceReport } from '../controllers/report.controller.js';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';

const router = Router();
const reportLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.use(authMiddleware, requireManager);
router.get('/attendance', reportLimiter, getAttendanceReport);
export default router;
