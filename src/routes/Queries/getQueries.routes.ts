import { Router } from 'express';
import { getAllGuestQueries } from '../../controllers/guest.controller';

import { protect } from '../../middleware/auth.middleware';
import { isAdmin } from '../../middleware/admin.middleware';
import { getQueryById } from '../../controllers/getProjectById.controller';

const router = Router();

// Admin only
router.get('/', protect, isAdmin, getAllGuestQueries);

// Individual query by Admin
router.get('/:id', protect, isAdmin, getQueryById);

export default router;
