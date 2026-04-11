import { Router } from 'express';
import { getAllGuestQueries } from '../controllers/guest.controller';

import { protect } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';

const router = Router();

// Admin only
router.get('/', protect, isAdmin, getAllGuestQueries);

export default router;
