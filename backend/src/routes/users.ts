import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);
router.post('/change-password', UserController.changePassword);

// Avatar routes
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);
router.delete('/avatar', UserController.deleteAvatar);

export default router;