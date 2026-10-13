import { Router } from 'express';
import {
  checkIn,
  getAttendanceLogs,
  getAttendanceHistory,
} from '../controllers/attendanceController.js';
import { authenticate, requireGymContext } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireGymContext);

router.get('/', getAttendanceLogs);
router.get('/history', getAttendanceHistory);
router.post('/checkin', checkIn);

export default router;

