import { Router } from 'express';
import { getCashClosing, closeCashDay } from '../controllers/cashClosingController.js';
import { authenticate, requireGymContext, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

// Get cash closing summary & transactions for a single date
router.get('/', getCashClosing);

// Close and lock cash drawer for a single date (Owner & Receptionist)
router.post('/', requireRole('owner', 'receptionist', 'superadmin'), closeCashDay);

export default router;