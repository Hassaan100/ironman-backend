import { Router } from 'express';
import {
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from '../controllers/equipmentController.js';
import { authenticate, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

router.get('/', getEquipment);
router.post('/', createEquipment);
router.put('/:id', updateEquipment);
router.delete('/:id', deleteEquipment);

export default router;
