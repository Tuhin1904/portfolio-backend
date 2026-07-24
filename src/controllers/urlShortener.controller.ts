import { Request, Response } from 'express';
import mongoose from 'mongoose';
import geoip from 'geoip-lite';
import { UrlShortener } from '../models/urlShortener.model';
import { User } from '../models/user.model';

import {
  generateRandomCode,
  isValidUrl,
  isReservedWord,
  isValidCustomCode,
} from '../utils/shortCodeGenerator';



const getBaseDomain = (req: Request): string => {
  if (process.env.SHORT_URL_BASE_DOMAIN) {
    return process.env.SHORT_URL_BASE_DOMAIN.replace(/\/+$/, '');
  }
  const host = req.get('host') || 'localhost:8080';
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}`;
};

// POST /api/url-shortener
export const createShortUrl = async (req: Request, res: Response) => {
  try {
    const { originalUrl, customCode, title, expiresAt, email, userEmail } = req.body;
    let userId = (req as any).user?.userId || null;
    let creatorEmail = (email || userEmail || '').trim().toLowerCase();

    // If logged in via JWT token, fetch user email if not supplied in body
    if (userId) {
      const userDoc = await User.findById(userId).select('email');
      if (userDoc && userDoc.email) {
        creatorEmail = userDoc.email.toLowerCase();
      }
    } else if (creatorEmail) {
      // If email provided without token, attempt user lookup to link createdBy
      const userDoc = await User.findOne({ email: creatorEmail });
      if (userDoc) {
        userId = userDoc._id;
      }
    }

    // ── Validate originalUrl ───────────────────────────────────────────
    if (!originalUrl || typeof originalUrl !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'originalUrl is required',
      });
    }

    const trimmedUrl = originalUrl.trim();
    if (!isValidUrl(trimmedUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid originalUrl format. Must start with http:// or https://',
      });
    }

    let finalShortCode = '';

    // ── Handle Custom Code ─────────────────────────────────────────────
    if (customCode && typeof customCode === 'string' && customCode.trim().length > 0) {
      const code = customCode.trim();

      if (!isValidCustomCode(code)) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid customCode. Must be 3-30 characters long and contain only letters, numbers, hyphens, or underscores',
        });
      }

      if (isReservedWord(code)) {
        return res.status(400).json({
          success: false,
          message: `The short code "${code}" is a reserved system keyword`,
        });
      }

      const existing = await UrlShortener.findOne({ shortCode: code });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `The short code "${code}" is already taken`,
        });
      }

      finalShortCode = code;
    } else {
      // ── Auto-generate Random Code ─────────────────────────────────────
      let attempts = 0;
      let isUnique = false;

      while (!isUnique && attempts < 10) {
        attempts++;
        const candidate = generateRandomCode(6);
        if (!isReservedWord(candidate)) {
          const existing = await UrlShortener.findOne({ shortCode: candidate });
          if (!existing) {
            finalShortCode = candidate;
            isUnique = true;
          }
        }
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate a unique short code. Please try again.',
        });
      }
    }

    // ── Handle Expiration ──────────────────────────────────────────────
    let parsedExpiry: Date | undefined = undefined;
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'expiresAt must be a valid date in the future',
        });
      }
      parsedExpiry = expDate;
    }

    // ── Save Record ───────────────────────────────────────────────────
    const urlDoc = await UrlShortener.create({
      originalUrl: trimmedUrl,
      shortCode: finalShortCode,
      title: title?.trim() || '',
      createdBy: userId,
      creatorEmail,
      expiresAt: parsedExpiry,
    });


    const baseDomain = getBaseDomain(req);
    const shortUrl = `${baseDomain}/s/${urlDoc.shortCode}`;

    return res.status(201).json({
      success: true,
      message: 'Short URL created successfully',
      data: {
        ...urlDoc.toObject(),
        shortUrl,
      },
    });
  } catch (error) {
    console.error('createShortUrl error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /s/:shortCode & GET /api/url-shortener/redirect/:shortCode
export const redirectShortUrl = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    if (!shortCode) {
      return res.status(400).json({ success: false, message: 'Short code is required' });
    }

    const codeStr = Array.isArray(shortCode) ? shortCode[0] : shortCode;
    const urlDoc = await UrlShortener.findOne({ shortCode: codeStr.trim() });


    if (!urlDoc) {
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(404).json({ success: false, message: 'Short URL not found' });
      }
      const frontendUrl = process.env.SHORT_URL_BASE_DOMAIN || 'https://tuhindev.me';
      return res.redirect(302, `${frontendUrl}/404`);
    }

    if (!urlDoc.isActive) {
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(410).json({ success: false, message: 'This short link has been disabled' });
      }
      return res.status(410).send('This short link has been disabled.');
    }

    if (urlDoc.expiresAt && new Date() > new Date(urlDoc.expiresAt)) {
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.status(410).json({ success: false, message: 'This short link has expired' });
      }
      return res.status(410).send('This short link has expired.');
    }

    // ── Log Click Analytics Asynchronously ────────────────────────────
    const referrer = (req.get('referrer') || req.get('referer') || '').slice(0, 500);
    const userAgent = (req.get('user-agent') || '').slice(0, 500);
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

    // Fallback for local testing or missing city data
    if (location === 'Unknown' || isLocalIp) {
      try {
        const queryTarget = isLocalIp ? '' : ip;
        const geoRes = await fetch(`http://ip-api.com/json/${queryTarget}`, { signal: AbortSignal.timeout(2000) });
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (geoData && geoData.status === 'success') {
            city = geoData.city || city;
            country = geoData.countryCode || geoData.country || country;
            if (city && country) {
              location = `${city}, ${country}`;
            } else if (country) {
              location = country;
            }
          }
        }
      } catch (e) {
        if (isLocalIp) location = 'Localhost (Dev)';
      }
    }


    UrlShortener.updateOne(
      { _id: urlDoc._id },
      {
        $inc: { clicks: 1 },
        $push: {
          analytics: {
            $each: [{ timestamp: new Date(), referrer, userAgent, ip, location, country, city }],
            $slice: -100, // Keep last 100 clicks
          },
        },
      },
    ).catch((err) => console.error('Failed to record click analytics:', err));


    // If client specified json response requested
    if (req.query.json === 'true') {
      return res.status(200).json({
        success: true,
        originalUrl: urlDoc.originalUrl,
      });
    }

    // Standard HTTP 302 Found redirect
    return res.redirect(302, urlDoc.originalUrl);
  } catch (error) {
    console.error('redirectShortUrl error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/url-shortener
export const getAllShortUrls = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const skip = (page - 1) * pageSize;
    const queryStr = (req.query.query as string || '').trim();
    const isActiveFilter = req.query.isActive;

    const filter: any = {};

    const user = (req as any).user;
    const idsParam = (req.query.ids as string || '').trim();
    const emailParam = (req.query.email as string || req.query.userEmail as string || '').trim().toLowerCase();

    // Helper to safely parse Mongoose ObjectIds
    const parseValidObjectIds = (str: string): string[] => {
      if (!str) return [];
      return str
        .split(',')
        .map((s) => s.trim())
        .filter((s) => mongoose.Types.ObjectId.isValid(s));
    };

    // Access Scoping Rules:
    // 1. Admin (userRole === 1): Can view ALL short URLs across the database.
    // 2. Logged in / Specified User: Filter by userId or creatorEmail.
    // 3. Guest User: Filter strictly by their browser session localStorage IDs.
    if (user && user.userRole === 1) {
      // Admin — view all by default, or filter if specific email/ids provided
      if (emailParam) {
        filter.$or = [{ creatorEmail: emailParam }];
      } else if (idsParam) {
        const idList = parseValidObjectIds(idsParam);
        if (idList.length > 0) {
          filter._id = { $in: idList };
        }
      }
    } else if (user) {
      // Authenticated user
      const userDoc = await User.findById(user.userId).select('email');
      const userEmailStr = userDoc?.email?.toLowerCase() || emailParam;
      filter.$or = [
        { createdBy: user.userId },
        ...(userEmailStr ? [{ creatorEmail: userEmailStr }] : []),
      ];
    } else if (emailParam) {
      // Guest with email specified in request
      const foundUser = await User.findOne({ email: emailParam });
      filter.$or = [
        { creatorEmail: emailParam },
        ...(foundUser ? [{ createdBy: foundUser._id }] : []),
      ];
    } else {
      // Unauthenticated Guest user without email — scope to local browser IDs
      const validIds = parseValidObjectIds(idsParam);
      if (validIds.length > 0) {
        filter._id = { $in: validIds };
      } else {
        // No valid IDs supplied by guest -> return empty result cleanly
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page,
            pageSize,
            totalCount: 0,
            totalPages: 0,
          },
        });
      }
    }



    if (isActiveFilter !== undefined && isActiveFilter !== '') {
      filter.isActive = isActiveFilter === 'true';
    }

    if (queryStr) {
      filter.$or = [
        { title: { $regex: queryStr, $options: 'i' } },
        { shortCode: { $regex: queryStr, $options: 'i' } },
        { originalUrl: { $regex: queryStr, $options: 'i' } },
      ];
    }


    const [urls, totalCount] = await Promise.all([
      UrlShortener.find(filter)
        .populate('createdBy', 'userName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      UrlShortener.countDocuments(filter),
    ]);

    const baseDomain = getBaseDomain(req);
    const items = urls.map((doc) => ({
      ...doc.toObject(),
      shortUrl: `${baseDomain}/s/${doc.shortCode}`,
    }));

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('getAllShortUrls error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/url-shortener/:id
export const getShortUrlById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let urlDoc = await UrlShortener.findById(id).populate('createdBy', 'userName email');

    if (!urlDoc) {
      // Try searching by shortCode
      urlDoc = await UrlShortener.findOne({ shortCode: id }).populate('createdBy', 'userName email');
    }

    if (!urlDoc) {
      return res.status(404).json({ success: false, message: 'Short URL not found' });
    }

    const user = (req as any).user;
    if (user && user.userRole !== 1 && urlDoc.createdBy && urlDoc.createdBy.toString() !== user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const baseDomain = getBaseDomain(req);
    return res.status(200).json({
      success: true,
      data: {
        ...urlDoc.toObject(),
        shortUrl: `${baseDomain}/s/${urlDoc.shortCode}`,
      },
    });
  } catch (error) {
    console.error('getShortUrlById error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/url-shortener/:id
export const updateShortUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { originalUrl, title, isActive, expiresAt, customCode } = req.body;
    const user = (req as any).user;

    const urlDoc = await UrlShortener.findById(id);
    if (!urlDoc) {
      return res.status(404).json({ success: false, message: 'Short URL not found' });
    }

    // Check ownership
    if (user.userRole !== 1 && urlDoc.createdBy && urlDoc.createdBy.toString() !== user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (originalUrl !== undefined) {
      const trimmed = originalUrl.trim();
      if (!isValidUrl(trimmed)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid originalUrl format. Must start with http:// or https://',
        });
      }
      urlDoc.originalUrl = trimmed;
    }

    if (title !== undefined) {
      urlDoc.title = title.trim();
    }

    if (isActive !== undefined) {
      urlDoc.isActive = Boolean(isActive);
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        urlDoc.expiresAt = undefined;
      } else {
        const expDate = new Date(expiresAt);
        if (isNaN(expDate.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid expiresAt date format' });
        }
        urlDoc.expiresAt = expDate;
      }
    }

    if (customCode !== undefined && customCode.trim() !== urlDoc.shortCode) {
      const newCode = customCode.trim();
      if (!isValidCustomCode(newCode)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customCode format (3-30 alphanumeric, hyphen, underscore)',
        });
      }
      if (isReservedWord(newCode)) {
        return res.status(400).json({
          success: false,
          message: `The short code "${newCode}" is a reserved system keyword`,
        });
      }
      const existing = await UrlShortener.findOne({ shortCode: newCode });
      if (existing && existing._id.toString() !== id) {
        return res.status(409).json({
          success: false,
          message: `The short code "${newCode}" is already taken`,
        });
      }
      urlDoc.shortCode = newCode;
    }

    await urlDoc.save();

    const baseDomain = getBaseDomain(req);
    return res.status(200).json({
      success: true,
      message: 'Short URL updated successfully',
      data: {
        ...urlDoc.toObject(),
        shortUrl: `${baseDomain}/s/${urlDoc.shortCode}`,
      },
    });
  } catch (error) {
    console.error('updateShortUrl error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/url-shortener/:id
export const deleteShortUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const urlDoc = await UrlShortener.findById(id);
    if (!urlDoc) {
      return res.status(404).json({ success: false, message: 'Short URL not found' });
    }

    // Check ownership
    if (user.userRole !== 1 && urlDoc.createdBy && urlDoc.createdBy.toString() !== user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await UrlShortener.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Short URL deleted successfully',
    });
  } catch (error) {
    console.error('deleteShortUrl error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
