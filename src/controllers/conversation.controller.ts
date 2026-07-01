import { Request, Response } from 'express';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

// GET /api/chat/conversations
// Returns all conversations for the logged-in user (admin or regular user)
export const getMyConversations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'userName email profilePicUrl userRole')
      .sort({ lastMessageAt: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error('getMyConversations error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/conversations/:id/messages?page=1&pageSize=30
// Paginated message history for a conversation
export const getConversationMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: id,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied',
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 30));
    const skip = (page - 1) * pageSize;

    const [messages, totalCount] = await Promise.all([
      Message.find({ conversationId: id })
        .populate('senderId', 'userName profilePicUrl')
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(pageSize),
      Message.countDocuments({ conversationId: id }),
    ]);

    return res.status(200).json({
      success: true,
      data: messages.reverse(), // return in chronological order
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
    console.error('getConversationMessages error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/chat/conversations/:id/read
// Mark all unread messages in a conversation as read by the current user
export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    // Verify participant
    const conversation = await Conversation.findOne({ _id: id, participants: userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    await Message.updateMany(
      {
        conversationId: id,
        senderId: { $ne: userId },     // not sent by me
        readBy: { $ne: userId },       // not already read by me
      },
      { $addToSet: { readBy: userId } },
    );

    return res.status(200).json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('markMessagesAsRead error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
