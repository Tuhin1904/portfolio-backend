import { Router } from 'express';
import signin from './signInUser.route';
import createUser from './createUser.route';
import updateUser from './updateUser.route'

const router = Router();

// api/users/create
router.use('/signup', createUser);

// api/users/register
router.use('/signin', signin);

// profile update
router.use('/update-profile',updateUser );

export default router;
