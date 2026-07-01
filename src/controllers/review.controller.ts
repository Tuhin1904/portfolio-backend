import { Request, Response } from 'express';
import { Review } from '../models/review.model';
import { ProjectQuery } from '../models/projectQuery.model';

// POST /api/reviews
// Only the owner of a "completed" project query can submit a review
export const submitReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { queryId, rating, comment } = req.body;

    // ── Validate input ─────────────────────────────────────────────────
    if (!queryId) {
      return res.status(400).json({ success: false, message: 'queryId is required' });
    }

    const ratingNum = Number(rating);
    if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5',
      });
    }

    // ── Find the query ─────────────────────────────────────────────────
    const query = await ProjectQuery.findById(queryId);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Project query not found' });
    }

    // ── Guard: must be the owner ───────────────────────────────────────
    if (!query.userId || query.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only review your own projects',
      });
    }

    // ── Guard: project must be completed ──────────────────────────────
    if (query.status !== 'completed') {
      return res.status(403).json({
        success: false,
        message: `Reviews can only be submitted after a project is completed. Current status: "${query.status}"`,
      });
    }

    // ── Guard: prevent duplicate reviews ──────────────────────────────
    const existing = await Review.findOne({ queryId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this project',
      });
    }

    // ── Create review ─────────────────────────────────────────────────
    const review = await Review.create({
      queryId,
      userId,
      rating: ratingNum,
      comment: comment?.trim() || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    console.error('submitReview error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reviews
// Public — returns all reviews with rating summary (for portfolio display)
export const getAllReviews = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const skip = (page - 1) * pageSize;

    const [reviews, totalCount, ratingStats] = await Promise.all([
      Review.find()
        .populate('userId', 'userName profilePicUrl')
        .populate('queryId', 'workType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),

      Review.countDocuments(),

      // Aggregate average rating and count per star
      Review.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const summary = ratingStats[0] ?? {
      averageRating: 0,
      totalReviews: 0,
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    };

    return res.status(200).json({
      success: true,
      summary: {
        averageRating: parseFloat((summary.averageRating ?? 0).toFixed(1)),
        totalReviews: summary.totalReviews,
        breakdown: {
          5: summary.fiveStar,
          4: summary.fourStar,
          3: summary.threeStar,
          2: summary.twoStar,
          1: summary.oneStar,
        },
      },
      data: reviews,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: page < Math.ceil(totalCount / pageSize),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('getAllReviews error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/reviews/query/:queryId
// Get the review for a specific project (auth — owner or admin)
export const getReviewByQueryId = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.userRole;
    const { queryId } = req.params;

    const review = await Review.findOne({ queryId })
      .populate('userId', 'userName profilePicUrl')
      .populate('queryId', 'workType status');

    if (!review) {
      return res.status(404).json({ success: false, message: 'No review found for this project' });
    }

    // Only admin or the review owner can access
    const isAdmin = userRole === 1;
    const isOwner = review.userId.toString() === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('getReviewByQueryId error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
