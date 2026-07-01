import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { submitReview, getAllReviews, getReviewByQueryId } from '../../controllers/review.controller';

const router = Router();

// POST /api/reviews  — Authenticated user, project must be "completed"
router.post('/', protect, submitReview);

// GET /api/reviews   — Public (for portfolio display with rating summary)
router.get('/', getAllReviews);

// GET /api/reviews/query/:queryId  — Auth (owner or admin)
router.get('/query/:queryId', protect, getReviewByQueryId);

export default router;
