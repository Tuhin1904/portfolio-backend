import express from 'express';
import { upload } from '../../middleware/multer';
import { uploadImage } from '../../controllers/upload.controller';

const router = express.Router();

router.post('/upload', upload.single('image'), uploadImage);

export default router;
