import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';

export const getQueryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Login required',
      });
    }

    let query;

    if (user.userRole === 1) {
      query = await ProjectQuery.findById(id);
    } else {
      query = await ProjectQuery.findOne({
        _id: id,
        userId: user.userId,
      });
    }

    if (!query) {
      return res.status(404).json({
        message: 'Query not found or access denied',
      });
    }

    res.status(200).json(query);

    return res.json({
      success: true,
      data: query,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching query',
    });
  }
};
