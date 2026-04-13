import { Request, Response, NextFunction } from 'express';
import { Guest } from '../models/guest.model';

export const updateByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const query = await Guest.findById(id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }
    const isOwner = query.userId?.toString() === user.userId;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    (req as any).queryDoc = query;

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authorization failed' });
  }
};
