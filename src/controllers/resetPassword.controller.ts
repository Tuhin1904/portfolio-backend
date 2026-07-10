import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP',
      });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or OTP',
      });
    }

    if (user.resetPasswordOtpExpires && user.resetPasswordOtpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new reset code.',
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear reset password fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    // Invalidate refresh token on password reset for security
    user.refreshToken = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
