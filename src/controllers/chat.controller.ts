import { Request, Response } from 'express';
import { Message } from '../models/message.model';
import { ProjectQuery } from '../models/projectQuery.model';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { queryId } = req.params;
    const user = (req as any).user;

    if (!queryId) {
      return res.status(400).json({
        success: false,
        message: 'Query ID is required',
      });
    }

    // Find the project inquiry to check permissions
    const query = await ProjectQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Project inquiry not found',
      });
    }

    const isAdmin = user?.userRole === 1;
    const isOwner = query.userId?.toString() === user?.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this chat history.',
      });
    }

    // Clients can only access chat if the admin has accepted the inquiry
    if (!isAdmin && (query.status === 'pending' || query.status === 'rejected')) {
      return res.status(403).json({
        success: false,
        message: 'Chat history is unavailable. The admin has not accepted the chat request yet.',
      });
    }

    // Fetch and populate message list
    const messages = await Message.find({ queryId })
      .populate('senderId', 'userName email profilePicUrl userRole')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
