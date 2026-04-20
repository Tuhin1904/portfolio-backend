import { Router } from 'express';
import { getMyQueries } from '../../controllers/getmyQueries.controller';
import { protect } from '../../middleware/auth.middleware';
import { getQueryById } from '../../controllers/getProjectById.controller';

const router = Router();

// Logged-in user → their own queries
router.get('/', protect, getMyQueries);

//get individual query
router.get('/:id', protect, getQueryById);

export default router;
