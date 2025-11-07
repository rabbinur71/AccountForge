import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/admin';

const router = Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// User management
router.get('/users', AdminController.getUsers);
router.get('/users/:userId', AdminController.getUserById);
router.patch('/users/:userId', AdminController.updateUser);
router.delete('/users/:userId', requireSuperAdmin, AdminController.deleteUser);

// Audit logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Dashboard
router.get('/dashboard/stats', AdminController.getDashboardStats);

export default router;