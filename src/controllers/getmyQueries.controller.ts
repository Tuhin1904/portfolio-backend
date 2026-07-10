import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';

export const getMyQueries = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { search } = req.query;

    const filter: any = { userId: user.userId };

    if (search) {
      const escapedSearch = (search as string).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { message: searchRegex },
        { workType: searchRegex },
        { status: searchRegex },
      ];
    }

    const queries = await ProjectQuery.find(filter).sort({ createdAt: -1 });

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
