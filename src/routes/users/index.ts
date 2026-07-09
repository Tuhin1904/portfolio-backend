import { Router } from 'express';
import signin from './signInUser.route';
import createUser from './createUser.route';
import updateUser from './updateUser.route';
import refreshToken from './refreshToken.route';
import updateFcmToken from './updateFcmToken.route';

const router = Router();

// api/users/signup
router.use('/signup', createUser);

// api/users/signin
router.use('/signin', signin);

// api/users/update-profile
router.use('/update-profile', updateUser);

// api/users/refresh-token
router.use('/refresh-token', refreshToken);

// api/users/fcm-token
router.use('/fcm-token', updateFcmToken);

export default router;
