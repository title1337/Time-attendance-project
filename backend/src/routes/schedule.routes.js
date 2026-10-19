import { Router } from 'express';
import {
  getAllShifts,
  createShift,
  updateShift,
  deleteShift,
  getMyCurrentShift,
  getAllUserShifts,
  assignUserShift,
} from '../controllers/schedule.controller.js';
import { authMiddleware, requireAdminAccess } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

// Shift routes
router.get('/shifts', getAllShifts);
router.post('/shifts', requireAdminAccess, createShift);
router.put('/shifts/:id', requireAdminAccess, updateShift);
router.delete('/shifts/:id', requireAdminAccess, deleteShift);

// User schedule assignment routes
router.get('/my-shift', getMyCurrentShift);
router.get('/user-shifts', getAllUserShifts);
router.post('/assign', assignUserShift);

export default router;
