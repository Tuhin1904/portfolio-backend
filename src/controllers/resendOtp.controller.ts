import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { sendOtpEmail } from '../utils/email';

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified',
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      await sendOtpEmail(email, user.userName, otp);
    } catch (emailError) {
      console.error('Error resending OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to resend verification email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
