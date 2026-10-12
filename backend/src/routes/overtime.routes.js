import { Router } from 'express';
import {
  createOvertimeRequest,
  getMyOvertimeHistory,
  getAllOvertimeRequests,
  updateOvertimeStatus,
} from '../controllers/overtime.controller.js';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/request', createOvertimeRequest);
router.get('/my-history', getMyOvertimeHistory);

router.get('/all', requireManager, getAllOvertimeRequests);
router.patch('/:id/status', requireManager, updateOvertimeStatus);

export default router;
