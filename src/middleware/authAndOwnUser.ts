import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    userRole: number;
    type: string;
  };
}

export const authAndOwnUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthRequest['user'];

    // Ensure it's access token
    if (decoded?.type !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    req.user = decoded;

    const requestedUserId = req.params.id || req.body.userId;

    if (!requestedUserId) {
      return res.status(400).json({ message: 'User ID missing in request' });
    }

    // Ownership check
    if (requestedUserId !== decoded?.userId) {
      return res.status(403).json({
        message: 'You are not allowed to modify this user',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }
};
