import { Router } from 'express';
import {
  createOvertimeRequest,
  getMyOvertimeHistory,
  getAllOvertimeRequests,
  updateOvertimeStatus,
} from '../controllers/overtime.controller.js';
import {
  authMiddleware,
  requireManagerAccess,
} from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/request', createOvertimeRequest);
router.get('/my-history', getMyOvertimeHistory);

router.get('/all', requireManagerAccess, getAllOvertimeRequests);
router.patch('/:id/status', requireManagerAccess, updateOvertimeStatus);

export default router;
