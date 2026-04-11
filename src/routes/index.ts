import { Router } from 'express';
import guestRoutes from './guest.routes';
import getQueries from './getQueries.routes';
import userRoutes from './users/user.routes';

const router = Router();

// group all routes here
router.use('/guests', guestRoutes);
router.use('/queries', getQueries);
router.use('/users', userRoutes);

export default router;
