import { Router } from 'express';
import { getPayments, recordPayment } from '../controllers/paymentController.js';
import { authenticate, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

router.get('/', getPayments);
router.post('/', recordPayment);

export default router;
