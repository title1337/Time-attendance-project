import { Router } from 'express';
import { listUsers, updateUser } from '../controllers/users.controller.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware, requireAdmin);
router.get('/', listUsers);
router.patch('/:id', updateUser);
export default router;
