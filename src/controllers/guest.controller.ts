import { Request, Response } from 'express';
import { Guest } from '../models/guest.model';

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

    const guest = await Guest.create(guestData);

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
    const queries = await Guest.find().sort({ createdAt: -1 });

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
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatus = ['pending', 'rejected', 'working', 'cancelled', 'completed'];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // get logged-in user
    const user = (req as any).user;

    // find the query first
    const query = await Guest.findById(id);

    if (!query) {
      return res.status(404).json({
        success: false,
        message: 'Query not found',
      });
    }

    const isAdmin = user.userRole === 1;
    const isOwner = query.userId?.toString() === user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this request status',
      });
    }

    const updated = await Guest.findByIdAndUpdate(id, { status }, { new: true });

    // query.status = status;
    // await query.save();

    // return res.json({
    //   success: true,
    //   data: query,
    // });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Wrong project selected!',
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
};
