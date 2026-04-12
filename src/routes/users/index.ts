import { Router } from 'express';
import signin from './signInUser.route';
import createUser from './createUser.route';

const router = Router();

// api/users/create
router.use('/signup', createUser);

// api/users/register
router.use('/signin', signin);

export default router;
