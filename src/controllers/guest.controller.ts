import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { sendPushNotification, storeNotificationInFirestore } from '../utils/firebase';
import { sendQueryStatusEmail } from '../utils/email';
import { getIo } from '../utils/socket';

const defaultMilestones = [
  { title: 'Requirement Discussion', completed: false },
  { title: 'Planning', completed: false },
  { title: 'Execution', completed: false },
  { title: 'Review', completed: false },
  { title: 'Delivery', completed: false },
];

export const createGuestQuery = async (req: Request, res: Response) => {
  try {
    // console.log('req.body :', req);
    const { name, email, workType, budget, message, typeOfUser } = req.body;

    // basic validation
    if (!name || !email || !workType || !budget || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    let userId = null;

    // if registered → get userId from token
    if (typeOfUser === 'registered') {
      userId = (req as any).user?.userId;

      if (userId) {
        // Limit of max 3 active (incomplete) query requests
        const activeCount = await ProjectQuery.countDocuments({
          userId: userId,
          status: { $nin: ['completed', 'rejected', 'cancelled'] },
        });

        if (activeCount >= 3) {
          return res.status(400).json({
            success: false,
            message: 'You already have 3 active project requests. Please wait until at least one of them is completed or resolved.',
          });
        }
      }
    }

    const guestData: any = {
      name,
      email,
      workType,
      budget,
      message,
      typeOfUser,
    };

    if (userId) {
      guestData.userId = userId;
    }

    const guest = await ProjectQuery.create(guestData);

    // Trigger Firebase Push Notification and Firestore entry for registered user queries
    if (typeOfUser === 'registered') {
      try {
        const admins = await User.find({ userRole: 1 });
        for (const adminUser of admins) {
          // Store notification history in Firestore
          storeNotificationInFirestore({
            title: `New Query from ${name}`,
            body: message,
            recipientId: adminUser._id.toString(),
            queryId: guest._id.toString(),
            senderName: name,
            senderEmail: email,
            workType,
            budget,
          }).catch((err) => {
            console.error('Error saving notification in Firestore:', err);
          });

          // Send push notification if token is available
          if (adminUser.fcmToken) {
            sendPushNotification(
              adminUser.fcmToken,
              `New Query from ${name}`,
              message,
              {
                queryId: guest._id.toString(),
                status: guest.status || 'pending',
                workType,
              }
            ).catch((err) => {
              console.error(`Error sending notification to admin ${adminUser._id}:`, err);
            });
          }
        }
      } catch (err) {
        console.error('Error handling admin notification:', err);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      data: guest,
    });
  } catch (error: any) {
    console.error('Error creating query : ', error);
    return res.status(500).json({
      success: false,
      message: error.errors || 'Server error',
    });
  }
};

export const getAllGuestQueries = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const skip = (page - 1) * pageSize;
    const { search } = req.query;

    const filter: any = {};

    if (search) {
      const escapedSearch = (search as string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { message: searchRegex },
        { workType: searchRegex },
        { status: searchRegex },
      ];
    }

    const [queries, totalCount] = await Promise.all([
      ProjectQuery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      ProjectQuery.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return res.status(200).json({
      success: true,
      data: queries,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log('Error :', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const allowedStatus = ['pending', 'rejected', 'accepted', 'working', 'cancelled', 'completed', 'accepted_by_client', 'delivered'];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const query = (req as any).queryDoc;
    const user = (req as any).user;
    const isAdmin = user?.userRole === 1;
    const isOwner = query.userId?.toString() === user?.userId;

    const adminOnlyStatuses = ['accepted', 'working', 'completed', 'rejected', 'pending'];
    if (adminOnlyStatuses.includes(status) && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: `Only the administrator can set the status to "${status}".`,
      });
    }

    const clientOnlyStatuses = ['accepted_by_client', 'delivered'];
    if (clientOnlyStatuses.includes(status) && !isOwner) {
      return res.status(403).json({
        success: false,
        message: `Only the client who created this query can set the status to "${status}".`,
      });
    }

    if (status === 'working') {
      const existingProject = await Project.findOne({ guestId: query._id });

      if (!existingProject) {
        await Project.create({
          workType: query.workType,
          totalBudget: query.budget,
          userId: query.userId,
          guestId: query._id,
          milestones: defaultMilestones,
          progress: 0,
        });
      }
    }

    const oldStatus = query.status;
    query.status = status;
    await query.save();

    // If cancelled → broadcast chat_disabled via socket immediately
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      const ioInstance = getIo();
      if (ioInstance) {
        ioInstance.to(query._id.toString()).emit('chat_disabled', {
          queryId: query._id.toString(),
          reason: 'This project enquiry has been cancelled. The chat is now read-only.',
        });
      }
    }

    // Trigger notification if status changes
    if (oldStatus !== status) {
      if (isAdmin) {
        // Updated by Admin -> Notify Client
        if (query.userId) {
          const recipientUser = await User.findById(query.userId);
          if (recipientUser) {
            const title = `Project Status Updated!`;
            const body = `Your project inquiry "${query.workType}" status has been updated to "${status}".`;

            if (recipientUser.fcmToken) {
              await sendPushNotification(recipientUser.fcmToken, title, body);
            }
            await storeNotificationInFirestore({
              recipientId: recipientUser._id.toString(),
              title,
              body,
            });

            // Send email to client
            sendQueryStatusEmail(
              recipientUser.email,
              recipientUser.userName,
              query.workType,
              status,
              oldStatus
            ).catch((emailError) => {
              console.error('Error sending query status email to client in background:', emailError);
            });
          }
        }
      } else if (isOwner) {
        // Updated by Client -> Notify all Admin users
        const admins = await User.find({ userRole: 1 });
        const title = `Project Status Updated by Client!`;
        const body = `Client ${user?.name || 'User'} has updated status of "${query.workType}" to "${status}".`;

        for (const admin of admins) {
          if (admin.fcmToken) {
            await sendPushNotification(admin.fcmToken, title, body);
          }
          await storeNotificationInFirestore({
            recipientId: admin._id.toString(),
            title,
            body,
          });

          // Send email to admin
          sendQueryStatusEmail(
            admin.email,
            admin.userName,
            query.workType,
            status,
            oldStatus
          ).catch((emailError) => {
            console.error(`Error sending query status email to admin (${admin.email}) in background:`, emailError);
          });
        }
      }
    }

    return res.json({
      success: true,
      data: query,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
};

// const validTransitions: Record<string, string[]> = {
//   pending: ['accepted', 'rejected'],
//   accepted: ['working', 'cancelled'],
//   working: ['completed', 'cancelled'],
// };

// if (
//   validTransitions[query.status] && !validTransitions[query.status].includes(status)
// ) {
//   return res.status(400).json({
//     success: false,
//     message: `Invalid status transition from ${query.status} to ${status}`,
//   });
// }
