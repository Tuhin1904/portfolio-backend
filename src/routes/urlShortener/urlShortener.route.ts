import { Router } from 'express';
import { protect, optionalAuth } from '../../middleware/auth.middleware';
import {
  createShortUrl,
  getAllShortUrls,
  getShortUrlById,
  updateShortUrl,
  deleteShortUrl,
  redirectShortUrl,
} from '../../controllers/urlShortener.controller';

const router = Router();

// POST /api/url-shortener — Create short link (optional auth)
router.post('/', optionalAuth, createShortUrl);

// GET /api/url-shortener — List short links (optional auth filter)
router.get('/', optionalAuth, getAllShortUrls);

// GET /api/url-shortener/redirect/:shortCode — API level redirect or URL fetch
router.get('/redirect/:shortCode', redirectShortUrl);

// GET /api/url-shortener/:id — Get short link details & stats
router.get('/:id', optionalAuth, getShortUrlById);

// PUT /api/url-shortener/:id — Update short link (Protected)
router.put('/:id', protect, updateShortUrl);

// DELETE /api/url-shortener/:id — Delete short link (Protected)
router.delete('/:id', protect, deleteShortUrl);

export default router;
