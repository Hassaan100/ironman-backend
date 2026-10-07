import { Router } from 'express';
import {
  getDashboardStats,
  getSuperAdminStats,
  getReportsOverview,
  getIncomeExpenseReport,
  getMembersReport,
  getDuesReport,
  getAttendanceReport,
  getRetentionReport,
  getTrainersReport,
  getEquipmentReport,
  getCashClosingReport,
} from '../controllers/reportController.js';
import { authenticate, requireRole, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Reports endpoints (Gym Owner & Staff with proper RBAC)
router.get('/overview', requireGymContext, getReportsOverview);
router.get('/income-expense', requireGymContext, getIncomeExpenseReport);
router.get('/members', requireGymContext, getMembersReport);
router.get('/dues', requireGymContext, getDuesReport);
router.get('/attendance', requireGymContext, getAttendanceReport);
router.get('/retention', requireGymContext, getRetentionReport);
router.get('/cash-closing', requireGymContext, getCashClosingReport);
router.get('/trainers', requireGymContext, getTrainersReport);
router.get('/equipment', requireGymContext, getEquipmentReport);

// Tenant Dashboard metrics
router.get('/dashboard', requireGymContext, getDashboardStats);

// SuperAdmin SaaS metrics
router.get('/admin-platform', requireRole('superadmin'), getSuperAdminStats);

export default router;
