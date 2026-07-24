import { Request, Response } from 'express';
import geoip from 'geoip-lite';
import { SiteAnalytics } from '../models/siteAnalytics.model';
import { User } from '../models/user.model';

// POST /api/analytics/track
export const trackPageView = async (req: Request, res: Response) => {
  try {
    const { pageUrl, referrer, durationSeconds = 0, sessionId, userName: bodyName, userEmail: bodyEmail } = req.body;

    if (!pageUrl || typeof pageUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'pageUrl is required' });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, message: 'sessionId is required' });
    }

    const authUser = (req as any).user;
    let userId = authUser?.userId || null;
    let userName = bodyName || 'Guest';
    let userEmail = bodyEmail || '';

    // If user is authenticated, retrieve full name and email from DB if not provided
    if (userId) {
      const userDoc = await User.findById(userId).select('userName email');
      if (userDoc) {
        userName = userDoc.userName || userName;
        userEmail = userDoc.email || userEmail;
      }
    }

    // Extract IP & resolve location
    const forwardedHeader = req.headers['x-forwarded-for'];
    const rawIp = Array.isArray(forwardedHeader)
      ? forwardedHeader[0]
      : forwardedHeader || req.socket.remoteAddress || '';
    const ip = rawIp.split(',')[0].trim().slice(0, 100);

    let location = 'Unknown';
    let country = '';
    let city = '';

    const isLocalIp = !ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.');

    if (!isLocalIp) {
      const geo = geoip.lookup(ip);
      if (geo) {
        city = geo.city || '';
        country = geo.country || '';
        if (city && country) location = `${city}, ${country}`;
        else if (country) location = country;
      }
    }

    // Dev mode fallback or missing GeoIP lookup
    if (location === 'Unknown' || isLocalIp) {
      try {
        const queryTarget = isLocalIp ? '' : ip;
        const geoRes = await fetch(`http://ip-api.com/json/${queryTarget}`, { signal: AbortSignal.timeout(2000) });
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (geoData && geoData.status === 'success') {
            city = geoData.city || city;
            country = geoData.countryCode || geoData.country || country;
            if (city && country) location = `${city}, ${country}`;
            else if (country) location = country;
          }
        }
      } catch (e) {
        if (isLocalIp) location = 'Localhost (Dev)';
      }
    }

    const userAgent = (req.get('user-agent') || '').slice(0, 500);
    const cleanedReferrer = (referrer || req.get('referrer') || req.get('referer') || '').slice(0, 500);
    const parsedDuration = Math.max(0, Math.round(Number(durationSeconds) || 0));

    // Upsert record for the current session + pageUrl
    const analyticsDoc = await SiteAnalytics.findOneAndUpdate(
      { sessionId, pageUrl },
      {
        $set: {
          pageUrl,
          referrer: cleanedReferrer,
          userAgent,
          ip,
          location,
          country,
          city,
          ...(userId && { userId }),
          ...(userName && userName !== 'Guest' && { userName }),
          ...(userEmail && { userEmail }),
        },
        $max: { durationSeconds: parsedDuration },
      },
      { upsert: true, returnDocument: 'after' },

    );

    return res.status(200).json({
      success: true,
      message: 'Analytics tracked',
      data: {
        id: analyticsDoc._id,
        durationSeconds: analyticsDoc.durationSeconds,
      },
    });
  } catch (error) {
    console.error('trackPageView error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/analytics/summary — Admin analytics overview
export const getAnalyticsSummary = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;

    const [
      totalVisits,
      uniqueVisitors,
      totalDuration,
      locationBreakdown,
      topPages,
      recentVisits,
    ] = await Promise.all([
      SiteAnalytics.countDocuments(),
      SiteAnalytics.distinct('sessionId').then((arr) => arr.length),
      SiteAnalytics.aggregate([{ $group: { _id: null, totalSec: { $sum: '$durationSeconds' } } }]),
      SiteAnalytics.aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      SiteAnalytics.aggregate([
        {
          $group: {
            _id: '$pageUrl',
            visits: { $sum: 1 },
            avgDurationSeconds: { $avg: '$durationSeconds' },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 10 },
      ]),
      SiteAnalytics.find()
        .populate('userId', 'userName email profilePicUrl')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalVisits,
        uniqueVisitors,
        totalDurationSeconds: totalDuration[0]?.totalSec || 0,
        locationBreakdown,
        topPages,
        recentVisits,
      },
      pagination: {
        page,
        pageSize,
        totalVisits,
        totalPages: Math.ceil(totalVisits / pageSize),
      },
    });
  } catch (error) {
    console.error('getAnalyticsSummary error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
