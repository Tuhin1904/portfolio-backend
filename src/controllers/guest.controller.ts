import { Request, Response } from 'express';
import { ProjectQuery } from '../models/projectQuery.model';

import { Project } from '../models/project.model';

const defaultMilestones = [
  { title: 'Requirement Discussion', completed: false },
  { title: 'Planning', completed: false },
  { title: 'Execution', completed: false },
  { title: 'Review', completed: false },
  { title: 'Delivery', completed: false },
];

export const createGuestQuery = async (req: Request, res: Response) => {
  try {
    // console.log('req.body :', req);
    const { name, email, workType, budget, message, typeOfUser } = req.body;

    // basic validation
    if (!name || !email || !workType || !budget || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    let userId = null;

    // if registered → get userId from token
    if (typeOfUser === 'registered') {
      userId = (req as any).user?.userId;
    }

    const guestData: any = {
      name,
      email,
      workType,
      budget,
      message,
      typeOfUser,
    };

    if (userId) {
      guestData.userId = userId;
    }

    const guest = await ProjectQuery.create(guestData);

    return res.status(201).json({
      success: true,
      message: 'Query submitted successfully',
      data: guest,
    });
  } catch (error: any) {
    console.error('Error creating query : ', error);
    return res.status(500).json({
      success: false,
      message: error.errors || 'Server error',
    });
  }
};

export const getAllGuestQueries = async (req: Request, res: Response) => {
  try {
    const queries = await ProjectQuery.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: queries,
    });
  } catch (error) {
    console.log('Error :', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const allowedStatus = ['pending', 'rejected', 'accepted', 'working', 'cancelled', 'completed'];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // find the query first
    const query = (req as any).queryDoc;

    if (status === 'working') {
      const existingProject = await Project.findOne({ guestId: query._id });

      if (!existingProject) {
        await Project.create({
          workType: query.workType,
          totalBudget: query.budget,
          userId: query.userId,
          guestId: query._id,
          milestones: defaultMilestones,
          progress: 0,
        });
      }
    }

    query.status = status;
    await query.save();

    return res.json({
      success: true,
      data: query,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
};

// const validTransitions: Record<string, string[]> = {
//   pending: ['accepted', 'rejected'],
//   accepted: ['working', 'cancelled'],
//   working: ['completed', 'cancelled'],
// };

// if (
//   validTransitions[query.status] && !validTransitions[query.status].includes(status)
// ) {
//   return res.status(400).json({
//     success: false,
//     message: `Invalid status transition from ${query.status} to ${status}`,
//   });
// }
