import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayStatus,
  getMyHistory,
  updateRecord,
} from '../controllers/attendance.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth to all attendance routes
router.use(authMiddleware);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/today', getTodayStatus);
router.get('/my-history', getMyHistory);
router.patch('/:id', updateRecord);

export default router;
