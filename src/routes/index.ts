import { Router } from 'express';
import userRoutes from './users';
import queryOperation from './Queries';

const router = Router();

// group all routes here
router.use('/project', queryOperation);
router.use('/users', userRoutes);

export default router;
