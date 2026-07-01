import { Router } from 'express';
import userRoutes from './users';
import queryOperation from './Queries';
import pingRoute from './ping';
import fileUpload from './fileUpload/fileUpload.route';
import chatRoutes from './chat';
import dashboardRoutes from './dashboard';
import reviewRoutes from './reviews';

const router = Router();

// group all routes here
router.use('/', pingRoute);
router.use('/project', queryOperation);
router.use('/users', userRoutes);
router.use('/file', fileUpload);
router.use('/chat', chatRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reviews', reviewRoutes);

export default router;
