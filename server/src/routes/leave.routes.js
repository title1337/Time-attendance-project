import { Router } from 'express';
import {
  createLeaveRequest,
  getMyLeaveHistory,
  updateMyLeaveRequest,
  deleteMyLeaveRequest,
  getAllLeaveRequests,
  updateLeaveStatus,
} from '../controllers/leave.controller.js';
import {
  authMiddleware,
  requireManagerAccess,
} from '../middleware/auth.middleware.js';

const router = Router();

// Every route requires authentication
router.use(authMiddleware);

// User endpoints
router.post('/request', createLeaveRequest);
router.get('/my-history', getMyLeaveHistory);
router.put('/:id', updateMyLeaveRequest);
router.delete('/:id', deleteMyLeaveRequest);

// Manager / Admin approval endpoints
router.get('/all', requireManagerAccess, getAllLeaveRequests);
router.patch('/:id/status', requireManagerAccess, updateLeaveStatus);

export default router;
