import { Router } from 'express';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  togglePlanStatus,
  deletePlan,
} from '../controllers/planController.js';
import { authenticate, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

router.get('/', getPlans);
router.get('/:id', getPlanById);
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.patch('/:id', updatePlan);
router.put('/:id/status', togglePlanStatus);
router.patch('/:id/status', togglePlanStatus);
router.delete('/:id', deletePlan);

export default router;
