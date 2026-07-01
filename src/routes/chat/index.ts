import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware';
import { isAdmin } from '../../middleware/admin.middleware';
import {
  sendChatRequest,
  respondToChatRequest,
  getPendingRequests,
  getMyRequests,
} from '../../controllers/chatRequest.controller';
import {
  getMyConversations,
  getConversationMessages,
  markMessagesAsRead,
} from '../../controllers/conversation.controller';

const router = Router();

// ── Chat Requests ──────────────────────────────────────────────────────
// User sends a request to admin
router.post('/request', protect, sendChatRequest);

// Admin responds (accept/reject)
router.post('/request/:id/respond', protect, isAdmin, respondToChatRequest);

// Admin views pending incoming requests
router.get('/requests/pending', protect, isAdmin, getPendingRequests);

// User views their own requests
router.get('/requests/my', protect, getMyRequests);

// ── Conversations ──────────────────────────────────────────────────────
// List all conversations for the logged-in user
router.get('/conversations', protect, getMyConversations);

// Paginated message history
router.get('/conversations/:id/messages', protect, getConversationMessages);

// Mark messages in a conversation as read
router.patch('/conversations/:id/read', protect, markMessagesAsRead);

export default router;
