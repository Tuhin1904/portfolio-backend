import { Request, Response, NextFunction } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';

export const canUpdateQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const query = await ProjectQuery.findById(id);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found' });
    }

    const isAdmin = user.userRole === 1;
    const isOwner = query.userId?.toString() === user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // const updated = await Guest.findByIdAndUpdate(id, { status }, { new: true });
    // if (!updated) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'Wrong project selected!',
    //   });
    // }
    // res.json({ success: true, data: updated });

    (req as any).queryDoc = query;

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authorization failed' });
  }
};
