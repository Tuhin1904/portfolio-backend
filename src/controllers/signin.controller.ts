import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';
import { generateTokens } from '../utils/generateToken';

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // check user
    const user = await User.findOne({ email });
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

    // generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.userRole);

    // (optional but recommended) store refresh token in DB
    user.refreshToken = refreshToken;
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
