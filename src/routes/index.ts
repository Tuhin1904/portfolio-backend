import { Router } from 'express';
import guestRoutes from './guest.routes';
import getQueries from './getQueries.routes';
import createUser from './createUser.route';

const router = Router();

// group all routes here
router.use('/guests', guestRoutes);
router.use('/queries', getQueries);
router.use('/users', createUser);

export default router;
