import { Router } from 'express';
import {
  createOvertimeRequest,
  getMyOvertimeHistory,
  getAllOvertimeRequests,
  updateOvertimeStatus,
} from '../controllers/overtime.controller.js';
import { authMiddleware, requireAdminAccess } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/request', createOvertimeRequest);
router.get('/my-history', getMyOvertimeHistory);

router.get('/all', requireAdminAccess, getAllOvertimeRequests);
router.patch('/:id/status', requireAdminAccess, updateOvertimeStatus);

export default router;
