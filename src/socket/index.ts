import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

interface TokenPayload {
  userId: string;
  userRole: number;
  type: string;
}

// Extend Socket to carry authenticated user info
interface AuthSocket extends Socket {
  user?: TokenPayload;
}

export const initSocket = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'https://tuhindev.me'],
      credentials: true,
    },
  });

  // ── Auth Middleware ────────────────────────────────────────────────────
  // Validates JWT on every socket connection
  io.use((socket: AuthSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;

      if (decoded.type !== 'access') {
        return next(new Error('Invalid token type'));
      }

      (socket as AuthSocket).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────
  io.on('connection', (socket: AuthSocket) => {
    const user = socket.user!;
    console.log(`[Socket] Connected: userId=${user.userId} role=${user.userRole}`);

    // ── join_conversation ────────────────────────────────────────────────
    // Client joins a conversation room. Validates they are a participant.
    socket.on('join_conversation', async ({ conversationId }: { conversationId: string }) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: user.userId,
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found or access denied' });
          return;
        }

        socket.join(conversationId);
        socket.emit('joined', { conversationId });
        console.log(`[Socket] userId=${user.userId} joined room=${conversationId}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ── send_message ─────────────────────────────────────────────────────
    // Client sends a message. Saved to MongoDB, then broadcast to the room.
    socket.on(
      'send_message',
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        try {
          if (!content || !content.trim()) {
            socket.emit('error', { message: 'Message content cannot be empty' });
            return;
          }

          // Verify participant
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: user.userId,
          });

          if (!conversation) {
            socket.emit('error', { message: 'Not a participant of this conversation' });
            return;
          }

          // Save to MongoDB (sender is automatically added to readBy)
          const message = await Message.create({
            conversationId,
            senderId: user.userId,
            content: content.trim(),
            readBy: [user.userId],
          });

          // Update conversation's last message preview
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: content.trim().slice(0, 100),
            lastMessageAt: new Date(),
          });

          const populated = await message.populate('senderId', 'userName profilePicUrl');
          const msgObj = populated.toObject();

          // Broadcast to everyone in the room (including sender for confirmation)
          io.to(conversationId).emit('receive_message', {
            _id: msgObj._id,
            conversationId,
            senderId: msgObj.senderId,
            content: msgObj.content,
            readBy: msgObj.readBy,
            createdAt: msgObj.createdAt,
          });
        } catch (err) {
          console.error('[Socket] send_message error:', err);
          socket.emit('error', { message: 'Failed to send message' });
        }
      },
    );

    // ── typing ───────────────────────────────────────────────────────────
    // Broadcast typing indicator to others in the room (not the sender)
    socket.on(
      'typing',
      ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
        socket.to(conversationId).emit('user_typing', {
          userId: user.userId,
          isTyping,
        });
      },
    );

    // ── mark_read ────────────────────────────────────────────────────────
    // Mark all messages in a conversation as read by the current user.
    // Notifies the other participant so they can update their UI.
    socket.on('mark_read', async ({ conversationId }: { conversationId: string }) => {
      try {
        const result = await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: user.userId },
            readBy: { $ne: user.userId },
          },
          { $addToSet: { readBy: user.userId } },
        );

        if (result.modifiedCount > 0) {
          // Notify others in the room that messages were read
          socket.to(conversationId).emit('message_read', {
            conversationId,
            readByUserId: user.userId,
          });
        }
      } catch (err) {
        console.error('[Socket] mark_read error:', err);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // ── disconnect ───────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: userId=${user.userId}, reason=${reason}`);
    });
  });

  return io;
};
