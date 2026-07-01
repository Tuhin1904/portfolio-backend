import { Request, Response } from 'express';
import { ChatRequest } from '../models/chatRequest.model';
import { Conversation } from '../models/conversation.model';
import { User } from '../models/user.model';

// POST /api/chat/request
// Registered user sends a chat request to the admin
export const sendChatRequest = async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).user.userId;

    // Find the admin (userRole: 1)
    const admin = await User.findOne({ userRole: 1 });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Prevent sending if user is the admin themselves
    if (senderId === admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot send a request to themselves',
      });
    }

    // Prevent duplicate pending/accepted requests
    const existing = await ChatRequest.findOne({
      senderId,
      receiverId: admin._id,
      status: { $in: ['pending', 'accepted'] },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          existing.status === 'accepted'
            ? 'You already have an active conversation with the admin'
            : 'A chat request is already pending',
      });
    }

    const chatRequest = await ChatRequest.create({
      senderId,
      receiverId: admin._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Chat request sent to admin',
      data: chatRequest,
    });
  } catch (error) {
    console.error('sendChatRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/chat/request/:id/respond
// Admin accepts or rejects a request
export const respondToChatRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const adminId = (req as any).user.userId;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action must be either "accept" or "reject"',
      });
    }

    const chatRequest = await ChatRequest.findById(id);

    if (!chatRequest) {
      return res.status(404).json({ success: false, message: 'Chat request not found' });
    }

    if (chatRequest.receiverId.toString() !== adminId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (chatRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${chatRequest.status}`,
      });
    }

    if (action === 'reject') {
      chatRequest.status = 'rejected';
      await chatRequest.save();
      return res.status(200).json({ success: true, message: 'Chat request rejected', data: chatRequest });
    }

    // Accept — create a Conversation
    chatRequest.status = 'accepted';
    await chatRequest.save();

    // Check if conversation already exists (idempotent)
    let conversation = await Conversation.findOne({ chatRequestId: id });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [chatRequest.senderId, chatRequest.receiverId],
        chatRequestId: chatRequest._id,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chat request accepted. Conversation started.',
      data: { chatRequest, conversation },
    });
  } catch (error) {
    console.error('respondToChatRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/requests/pending
// Admin views all pending incoming requests
export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.userId;

    const requests = await ChatRequest.find({
      receiverId: adminId,
      status: 'pending',
    })
      .populate('senderId', 'userName email profilePicUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/requests/my
// Registered user views their own requests
export const getMyRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const requests = await ChatRequest.find({ senderId: userId })
      .populate('receiverId', 'userName email profilePicUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('getMyRequests error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
