import { Router } from 'express';
import { getChatHistory } from '../../controllers/chat.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

router.get('/:queryId/history', protect, getChatHistory);

export default router;
