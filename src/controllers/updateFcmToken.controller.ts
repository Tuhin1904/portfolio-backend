import { Request, Response } from 'express';
import { User } from '../models/user.model';

export const updateFcmToken = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { fcmToken } = req.body;

    if (fcmToken === undefined) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken is required',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        fcmToken: updatedUser.fcmToken,
      },
    });
  } catch (error) {
    console.error('Update FCM token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error,
    });
  }
};
