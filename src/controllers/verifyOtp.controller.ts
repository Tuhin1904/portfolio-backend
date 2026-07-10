import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { generateTokens } from '../utils/generateToken';
import { sendWelcomeEmail } from '../utils/email';

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
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
        message: 'User is already verified. Please login.',
      });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.userRole);
    user.refreshToken = refreshToken;

    await user.save();

    // Send welcome email asynchronously so it doesn't block the client response
    sendWelcomeEmail(user.email, user.userName).catch((welcomeEmailError) => {
      console.error('Error sending welcome email in background:', welcomeEmailError);
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.userName,
          email: user.email,
          phone: user.phone,
          profilePicUrl: user?.profilePicUrl || '',
          userRole: user?.userRole || '',
        },
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
