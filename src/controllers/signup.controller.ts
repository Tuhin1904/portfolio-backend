import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { sendOtpEmail } from '../utils/email';

export const signup = async (req: Request, res: Response) => {
  try {
    const { userName, email, phone, location, password, fcmToken } = req.body;

    if (!userName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and password are required',
      });
    }

    // Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      } else {
        // Clean up unverified user with same email
        await User.deleteOne({ _id: existingUser._id });
      }
    }

    // Check existing phone
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      if (existingPhone.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Phone already registered',
        });
      } else {
        // Clean up unverified user with same phone
        await User.deleteOne({ _id: existingPhone._id });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = await User.create({
      userName,
      email,
      phone,
      location,
      password: hashedPassword,
      userRole: 2,
      fcmToken: fcmToken || '',
      isVerified: false,
      otp,
      otpExpires,
    });

    try {
      await sendOtpEmail(email, userName, otp);
    } catch (emailError) {
      console.error('Error sending signup OTP email:', emailError);
      // Clean up the user we just created if email failed
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Signup initiated. OTP sent to your email.',
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
