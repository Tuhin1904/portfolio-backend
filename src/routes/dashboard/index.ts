import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { isAdmin } from '../../middleware/admin.middleware';
import { getDashboardStats } from '../../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/stats  — Admin only
router.get('/stats', protect, isAdmin, getDashboardStats);

export default router;
