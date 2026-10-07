import { Router } from 'express';
import { uploadMiddleware } from '../middleware/upload.js';
import { uploadFile } from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, uploadMiddleware.single('file'), uploadFile);

export default router;
