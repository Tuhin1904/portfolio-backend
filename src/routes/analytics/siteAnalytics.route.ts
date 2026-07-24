import { Router } from 'express';
import { optionalAuth, protect } from '../../middleware/auth.middleware';
import { isAdmin } from '../../middleware/admin.middleware';
import { trackPageView, getAnalyticsSummary } from '../../controllers/siteAnalytics.controller';

const router = Router();

// POST /api/analytics/track — Track page visit and stay duration (Optional Auth)
router.post('/track', optionalAuth, trackPageView);

// GET /api/analytics/summary — Admin view site visitor analytics
router.get('/summary', protect, isAdmin, getAnalyticsSummary);

export default router;
