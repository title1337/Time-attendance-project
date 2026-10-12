import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveHistory,
  getAllLeaveRequests,
  updateLeaveStatus,
} from '../controllers/leave.controller.js';
import { authMiddleware, requireManager } from '../middleware/auth.middleware.js';

const router = Router();

// Every route requires authentication
router.use(authMiddleware);

// User endpoints
router.post('/request', createLeaveRequest);
router.get('/my-history', getMyLeaveHistory);

// Manager / Admin approval endpoints
router.get('/all', requireManager, getAllLeaveRequests);
router.patch('/:id/status', requireManager, updateLeaveStatus);

export default router;
