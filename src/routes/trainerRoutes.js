import { Router } from 'express';
import {
  getTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
} from '../controllers/trainerController.js';
import { authenticate, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

router.get('/', getTrainers);
router.post('/', createTrainer);
router.put('/:id', updateTrainer);
router.delete('/:id', deleteTrainer);

export default router;
