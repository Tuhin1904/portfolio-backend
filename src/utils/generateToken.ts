import jwt from 'jsonwebtoken';

export const generateTokens = (userId: string, userRole: number) => {
  const accessToken = jwt.sign({ userId, userRole, type: 'access' }, process.env.JWT_SECRET as string, {
    expiresIn: '24h',
  });

  const refreshToken = jwt.sign({ userId, userRole, type: 'refresh' }, process.env.JWT_REFRESH as string, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};
