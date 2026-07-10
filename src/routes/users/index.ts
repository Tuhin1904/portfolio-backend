import { Router } from 'express';
import signin from './signInUser.route';
import createUser from './createUser.route';
import updateUser from './updateUser.route';
import refreshToken from './refreshToken.route';
import updateFcmToken from './updateFcmToken.route';
import verifyOtp from './verifyOtp.route';
import resendOtp from './resendOtp.route';
import forgotPassword from './forgotPassword.route';
import resetPassword from './resetPassword.route';

const router = Router();

// api/users/signup
router.use('/signup', createUser);

// api/users/verify-otp
router.use('/verify-otp', verifyOtp);

// api/users/resend-otp
router.use('/resend-otp', resendOtp);

// api/users/forgot-password
router.use('/forgot-password', forgotPassword);

// api/users/reset-password
router.use('/reset-password', resetPassword);

// api/users/signin
router.use('/signin', signin);

// api/users/update-profile
router.use('/update-profile', updateUser);

// api/users/refresh-token
router.use('/refresh-token', refreshToken);

// api/users/fcm-token
router.use('/fcm-token', updateFcmToken);

export default router;
