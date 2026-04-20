import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // (req as any).user = null;
      // (req as any).isGuest = true;
      // return next();
      return res.status(401).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };

    (req as any).user = decoded;
    // (req as any).isGuest = false;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
