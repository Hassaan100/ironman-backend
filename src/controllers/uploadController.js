import { processUploadedFile } from '../middleware/upload.js';

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const fileResult = await processUploadedFile(req, req.file);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: fileResult,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
