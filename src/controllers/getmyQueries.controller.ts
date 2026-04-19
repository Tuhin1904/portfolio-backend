import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';

export const getMyQueries = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const queries = await ProjectQuery.find({
      userId: user.userId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: queries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching your queries',
    });
  }
};
