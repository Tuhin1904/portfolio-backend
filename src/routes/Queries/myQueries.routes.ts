import { Router } from 'express';
import { getMyQueries } from '../../controllers/getmyQueries.controller';
import { protect } from '../../middleware/auth.middleware';

const router = Router();

// Logged-in user → their own queries
router.get('/my', protect, getMyQueries);

export default router;
