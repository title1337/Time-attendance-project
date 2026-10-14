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
  requireAdminAccess,
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
router.get('/all', requireAdminAccess, getAllLeaveRequests);
router.patch('/:id/status', requireAdminAccess, updateLeaveStatus);

export default router;
