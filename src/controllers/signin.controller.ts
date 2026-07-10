import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { generateTokens } from '../utils/generateToken';
import { sendOtpEmail } from '../utils/email';

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password, fcmToken } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // check user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // check if user is verified
    if (!user.isVerified) {
      // Auto-generate & send a fresh OTP so user can verify immediately
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
      await user.save();

      // Fire email in background — don't block the response
      sendOtpEmail(user.email, user.userName, otp).catch((err) =>
        console.error('Failed to send verification OTP on sign-in:', err)
      );

      return res.status(400).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email before signing in. A new OTP has been sent to your inbox.',
      });
    }

    // generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.userRole);

    // (optional but recommended) store refresh token in DB
    user.refreshToken = refreshToken;
    if (fcmToken) {
      user.fcmToken = fcmToken;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.userName,
          email: user.email,
          profilePicUrl: user?.profilePicUrl || '',
          userRole: user?.userRole || '',
        },
      },
    });
  } catch (error) {
    console.error('Signin error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
