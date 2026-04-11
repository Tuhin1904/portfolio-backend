import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.model';

export const signup = async (req: Request, res: Response) => {
  try {
    const { userName, email, phone, location, password } = req.body;

    if (!userName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone and password are required',
      });
    }

    const existingUser = await User.findOne({ email });
    const existingPhone = await User.findOne({ phone });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userName,
      email,
      phone,
      location,
      password: hashedPassword,
      userRole: 2,
    });

    const userResponse = {
      _id: user._id,
      name: user.userName,
      email: user.email,
      phone: user.phone,
      location: user.location,
      userRole: user.userRole,
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: userResponse,
    });
  } catch (error) {
    console.error('Signup error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
