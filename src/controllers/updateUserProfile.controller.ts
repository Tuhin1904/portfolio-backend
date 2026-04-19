import { Request, Response } from 'express';
import { User } from '../models/user.model';

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const allowedFields = ['userName', 'phone', 'location', 'profilePicUrl'];

    const updates: any = {};

    // pick only allowed fields
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // If user tries to send restricted fields
    const restrictedFields = ['email', 'userRole', 'password'];
    const attemptedRestrictedUpdate = restrictedFields.some((field) => field in req.body);

    if (attemptedRestrictedUpdate) {
      return res.status(403).json({
        message: 'You cannot update restricted fields',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password -refreshToken');

    return res.status(200).json({
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Something went wrong',
      error,
    });
  }
};
