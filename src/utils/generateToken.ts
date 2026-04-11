import jwt from 'jsonwebtoken';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ userId, type: 'access' }, process.env.JWT_SECRET as string, { expiresIn: '24h' });

  const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_REFRESH as string, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};
