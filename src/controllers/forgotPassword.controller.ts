import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { sendResetPasswordEmail } from '../utils/email';

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Deceptive success message to prevent email enumeration
    const successResponse = {
      success: true,
      message: 'If the email is registered, a password reset OTP has been sent.',
    };

    if (!user) {
      return res.status(200).json(successResponse);
    }

    // Only allow verified users to reset password
    if (!user.isVerified) {
      return res.status(200).json(successResponse);
    }

    // Generate reset password OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = otpExpires;
    await user.save();

    try {
      await sendResetPasswordEmail(email, user.userName, otp);
    } catch (emailError) {
      console.error('Error sending reset password email:', emailError);
      // We still return 200/success to maintain the flow, but log the error
    }

    return res.status(200).json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
