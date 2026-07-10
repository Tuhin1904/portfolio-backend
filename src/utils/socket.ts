import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Message } from '../models/message.model';
import { User } from '../models/user.model';
import { ProjectQuery } from '../models/projectQuery.model';
import { sendPushNotification, storeNotificationInFirestore } from './firebase';

let io: Server | null = null;

// Track active sockets: socketId -> { userId, currentRoom }
const activeSockets = new Map<string, { userId: string; currentRoom: string }>();

// Track online users: userId -> Set of socketIds (multiple tabs support)
const onlineUsers = new Map<string, Set<string>>();

/** Mark user as online in DB and broadcast to all rooms they are in */
const setUserOnline = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { isOnline: true });
};

/** Mark user as offline (lastSeen = now) in DB and broadcast to rooms */
const setUserOffline = async (userId: string) => {
  const lastSeen = new Date();
  await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
  return lastSeen;
};

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'https://tuhindev.me', 'https://www.tuhindev.me'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // ─── Register active user connection ──────────────────────────────────────
    socket.on('register_user', async ({ userId }) => {
      if (!userId) return;

      activeSockets.set(socket.id, { userId, currentRoom: '' });

      // Track online sockets per user
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Mark user online in DB (only on first socket connection)
      if (onlineUsers.get(userId)!.size === 1) {
        await setUserOnline(userId);
      }

      console.log(`Socket ${socket.id} registered user: ${userId} (online)`);
    });

    // ─── Join query chat room ─────────────────────────────────────────────────
    socket.on('join_query_room', async ({ queryId, userId }) => {
      if (!queryId) return;

      try {
        const queryDoc = await ProjectQuery.findById(queryId);
        if (!queryDoc) {
          socket.emit('chat_error', { message: 'Project inquiry not found' });
          return;
        }

        const user = await User.findById(userId);
        const isAdmin = user?.userRole === 1;

        // Block clients from joining if chat not yet accepted (pending/rejected = no access)
        if (!isAdmin && (queryDoc.status === 'pending' || queryDoc.status === 'rejected')) {
          socket.emit('chat_error', { message: 'Chat request has not been accepted by the admin yet.' });
          return;
        }

        // Cancelled: allow joining (to read history) but immediately emit chat_disabled flag
        const isCancelled = queryDoc.status === 'cancelled';

        socket.join(queryId);

        const existingData = activeSockets.get(socket.id) || { userId: userId || '', currentRoom: '' };
        activeSockets.set(socket.id, { ...existingData, currentRoom: queryId });

        // Emit room joined confirmation
        socket.emit('room_joined', { queryId });

        // Broadcast online status of joining user to others in room
        socket.to(queryId).emit('user_status_change', {
          userId,
          isOnline: true,
          lastSeen: null,
        });

        // Emit current online status of ALL users in room back to joiner
        const roomSockets = io!.sockets.adapter.rooms.get(queryId);
        if (roomSockets) {
          const onlineInRoom: string[] = [];
          roomSockets.forEach((sid) => {
            const data = activeSockets.get(sid);
            if (data && data.userId !== userId) {
              onlineInRoom.push(data.userId);
            }
          });
          if (onlineInRoom.length > 0) {
            socket.emit('room_online_status', { onlineUserIds: onlineInRoom });
          }
        }

        // Notify joiner (and room) that chat is locked due to cancellation
        if (isCancelled) {
          io?.to(queryId).emit('chat_disabled', {
            queryId,
            reason: 'This project enquiry has been cancelled. The chat is now read-only.',
          });
        }

        console.log(`User ${userId} joined room: ${queryId}`);
      } catch (err) {
        console.error('Error joining query room:', err);
        socket.emit('chat_error', { message: 'Failed to join chat room' });
      }
    });

    // ─── Leave query chat room ────────────────────────────────────────────────
    socket.on('leave_query_room', ({ queryId }) => {
      if (!queryId) return;

      socket.leave(queryId);
      const existingData = activeSockets.get(socket.id);
      if (existingData) {
        activeSockets.set(socket.id, { ...existingData, currentRoom: '' });

        // Notify others in room that this user left (not necessarily offline globally)
        const stillOnline = Array.from(activeSockets.values()).some(
          (s) => s.userId === existingData.userId && s.currentRoom === queryId
        );
        if (!stillOnline) {
          socket.to(queryId).emit('user_status_change', {
            userId: existingData.userId,
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      }

      console.log(`Socket ${socket.id} left room: ${queryId}`);
    });

    // ─── Mark messages as read ────────────────────────────────────────────────
    socket.on('mark_as_read', async ({ queryId, userId }) => {
      if (!queryId || !userId) return;

      try {
        // Mark all unread messages in this room (not sent by this user) as read
        await Message.updateMany(
          {
            queryId,
            senderId: { $ne: userId },
            readBy: { $ne: userId },
          },
          { $addToSet: { readBy: userId } }
        );

        // Notify others in the room that messages were read by this user
        socket.to(queryId).emit('messages_read', { queryId, readByUserId: userId });
      } catch (err) {
        console.error('Error marking messages as read:', err);
      }
    });

    // ─── Send chat message ────────────────────────────────────────────────────
    socket.on('send_chat_message', async ({ queryId, senderId, messageText }) => {
      try {
        if (!queryId || !senderId || !messageText) {
          socket.emit('chat_error', { message: 'Invalid payload' });
          return;
        }

        const queryDoc = await ProjectQuery.findById(queryId);
        if (!queryDoc) {
          socket.emit('chat_error', { message: 'Project inquiry not found' });
          return;
        }

        const senderUser = await User.findById(senderId);
        const isSenderAdmin = senderUser?.userRole === 1;

        // Block everyone from sending when the query is cancelled
        if (queryDoc.status === 'cancelled') {
          socket.emit('chat_error', { message: 'This project enquiry has been cancelled. The chat is read-only.' });
          return;
        }

        // Block clients from sending if not accepted (pending or rejected)
        if (!isSenderAdmin && (queryDoc.status === 'pending' || queryDoc.status === 'rejected')) {
          socket.emit('chat_error', { message: 'Chat has not been accepted by the admin yet.' });
          return;
        }

        // Block admin from sending if status is pending or rejected
        if (isSenderAdmin && (queryDoc.status === 'pending' || queryDoc.status === 'rejected')) {
          socket.emit('chat_error', { message: 'Accept the inquiry before starting a conversation.' });
          return;
        }

        // Check if recipient is actively in the room to auto-mark read
        const recipientId = isSenderAdmin
          ? (queryDoc.userId?.toString() || '')
          : (await User.findOne({ userRole: 1 }))?._id.toString() || '';

        const isRecipientInRoom = Array.from(activeSockets.values()).some(
          (s) => s.userId === recipientId && s.currentRoom === queryId
        );

        // Save message — pre-mark as read by sender; also by recipient if they're in room
        const readBy = [senderId];
        if (isRecipientInRoom && recipientId) readBy.push(recipientId);

        const newMessage = await Message.create({
          queryId,
          senderId,
          message: messageText,
          readBy,
        });

        // Populate sender info for frontend display
        const populatedMessage = await Message.findById(newMessage._id).populate(
          'senderId',
          'userName email profilePicUrl userRole'
        );

        // Broadcast to query room participants
        if (io) {
          io.to(queryId).emit('receive_chat_message', populatedMessage);
        }

        // Offline notification if recipient is not in room
        if (!isRecipientInRoom && recipientId) {
          const recipientUser = await User.findById(recipientId);
          if (recipientUser) {
            await sendOfflineMessageNotification(recipientUser, senderUser?.userName || 'User', messageText, queryId);
          }
        } else if (!isSenderAdmin) {
          // Also notify other admins who aren't in room
          const admins = await User.find({ userRole: 1 });
          for (const admin of admins) {
            const adminId = admin._id.toString();
            const isAdminInRoom = Array.from(activeSockets.values()).some(
              (s) => s.userId === adminId && s.currentRoom === queryId
            );
            if (!isAdminInRoom) {
              await sendOfflineMessageNotification(admin, senderUser?.userName || 'Client', messageText, queryId);
            }
          }
        }
      } catch (err) {
        console.error('Socket error processing chat message:', err);
        socket.emit('chat_error', { message: 'Server failed to process message' });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userData = activeSockets.get(socket.id);
      activeSockets.delete(socket.id);

      if (userData?.userId) {
        const userSocketSet = onlineUsers.get(userData.userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);

          // Only go offline if no more sockets open for this user
          if (userSocketSet.size === 0) {
            onlineUsers.delete(userData.userId);
            const lastSeen = await setUserOffline(userData.userId);

            // Broadcast offline to all rooms this user was part of
            if (userData.currentRoom) {
              io?.to(userData.currentRoom).emit('user_status_change', {
                userId: userData.userId,
                isOnline: false,
                lastSeen,
              });
            }
          }
        }
      }
    });
  });
};

const sendOfflineMessageNotification = async (recipient: any, senderName: string, text: string, queryId: string) => {
  const title = `New message from ${senderName}`;
  const body = text.length > 60 ? `${text.substring(0, 57)}...` : text;

  if (recipient.fcmToken) {
    try {
      await sendPushNotification(recipient.fcmToken, title, body, { queryId, type: 'chat' });
    } catch (fcmErr) {
      console.error(`FCM failed for ${recipient.email}:`, fcmErr);
    }
  }

  try {
    await storeNotificationInFirestore({
      title,
      body,
      recipientId: recipient._id.toString(),
      queryId,
      type: 'chat',
    });
  } catch (dbErr) {
    console.error('Failed to store Firestore notification:', dbErr);
  }
};

/** Returns the singleton Socket.IO server instance — used by REST controllers to emit events */
export const getIo = () => io;
