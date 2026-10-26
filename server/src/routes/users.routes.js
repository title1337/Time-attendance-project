import { Router } from 'express';
import { listUsers, updateUser } from '../controllers/users.controller.js';
import {
  authMiddleware,
  requireAdminAccess,
} from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware, requireAdminAccess);
router.get('/', listUsers);
router.patch('/:id', updateUser);
export default router;
