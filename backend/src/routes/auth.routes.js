import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.post('/logout', authMiddleware, logout);

export default router;
