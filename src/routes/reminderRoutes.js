import { Router } from 'express';
import { getReminders, getRemindersSummary } from '../controllers/reminderController.js';
import { authenticate, requireGymContext, requireRole } from '../middleware/auth.js';

const router = Router();

// Apply authentication, tenant context, and RBAC (owner, receptionist, superadmin)
router.use(authenticate, requireGymContext, requireRole('superadmin', 'owner', 'receptionist'));

router.get('/summary', getRemindersSummary);
router.get('/', getReminders);

export default router;
