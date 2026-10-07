import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Local Disk Storage Engine (Default)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

// Memory Storage for Cloudinary stream routing
const memoryStorage = multer.memoryStorage();

const useCloudinary =
  process.env.STORAGE_PROVIDER === 'cloudinary' && isCloudinaryConfigured;

export const uploadMiddleware = multer({
  storage: useCloudinary ? memoryStorage : diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  },
});

/**
 * Helper to process the uploaded file and return public URL & storage metadata
 */
export const processUploadedFile = async (req, file) => {
  if (!file) return null;

  if (useCloudinary) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'ironman_gym', resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            provider: 'cloudinary',
            publicId: result.public_id,
            filename: file.originalname,
          });
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  // Local storage resolution
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${baseUrl}/uploads/${file.filename}`;
  return {
    url: fileUrl,
    provider: 'local',
    filename: file.filename,
    path: `/uploads/${file.filename}`,
  };
};
