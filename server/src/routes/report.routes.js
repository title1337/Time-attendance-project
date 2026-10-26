import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getAttendanceReport } from '../controllers/report.controller.js';
import {
  authMiddleware,
  requireManagerAccess,
} from '../middleware/auth.middleware.js';

const router = Router();
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authMiddleware, requireManagerAccess);
router.get('/attendance', reportLimiter, getAttendanceReport);
export default router;
