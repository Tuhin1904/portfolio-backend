import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { generateTokens } from '../utils/generateToken';

interface RefreshTokenPayload {
  userId: string;
  userRole: number;
  type: string;
}

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Verify the token using the REFRESH secret
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH as string) as RefreshTokenPayload;
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    // Ensure this is actually a refresh token, not an access token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Find user and check stored refresh token matches (prevent token reuse after logout)
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.refreshToken !== token) {
      // Token mismatch — possible reuse after logout or rotation attack
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
      });
    }

    // Issue new token pair (rotate refresh token)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id.toString(),
      user.userRole,
    );

    // Persist the new refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
