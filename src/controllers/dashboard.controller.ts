import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';
import { User } from '../models/user.model';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      // ── Project Queries ────────────────────────────────────────────────
      totalQueryCount,
      queryStatusBreakdown,
      guestQueryCount,
      registeredQueryCount,

      // ── Users ──────────────────────────────────────────────────────────
      totalUserCount,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      // Total queries (all types)
      ProjectQuery.countDocuments(),

      // Query count grouped by status
      ProjectQuery.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Guest-submitted queries
      ProjectQuery.countDocuments({ typeOfUser: 'guest' }),

      // Registered-user queries
      ProjectQuery.countDocuments({ typeOfUser: 'registered' }),

      // Total registered users (excluding admins)
      User.countDocuments({ userRole: 2 }),

      // New registered users in last 7 days
      User.countDocuments({
        userRole: 2,
        createdAt: { $gte: last7Days },
      }),

      // New registered users in last 30 days
      User.countDocuments({
        userRole: 2,
        createdAt: { $gte: last30Days },
      }),
    ]);

    // ── Format query status into a clean object ─────────────────────────
    const queryByStatus: Record<string, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      working: 0,
      cancelled: 0,
      completed: 0,
    };
    queryStatusBreakdown.forEach((item: { _id: string; count: number }) => {
      if (item._id) queryByStatus[item._id] = item.count;
    });

    // ── Guest vs Registered ratio ───────────────────────────────────────
    const totalQueries = guestQueryCount + registeredQueryCount;
    const guestRatio =
      totalQueries > 0 ? parseFloat(((guestQueryCount / totalQueries) * 100).toFixed(1)) : 0;
    const registeredRatio = totalQueries > 0 ? parseFloat((100 - guestRatio).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        queries: {
          total: totalQueryCount,
          byStatus: queryByStatus,
          guestCount: guestQueryCount,
          registeredCount: registeredQueryCount,
          ratio: {
            guest: guestRatio,       // percentage
            registered: registeredRatio,
          },
        },
        users: {
          total: totalUserCount,
          newLast7Days: newUsersLast7Days,
          newLast30Days: newUsersLast30Days,
        },
      },
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

