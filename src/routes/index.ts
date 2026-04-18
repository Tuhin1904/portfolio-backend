import { Router } from 'express';
import userRoutes from './users';
import queryOperation from './Queries';
import pingRoute from './ping';
import fileUpload from './fileUpload/fileUpload.route';

const router = Router();

// group all routes here
router.use('/', pingRoute);
router.use('/project', queryOperation);
router.use('/users', userRoutes);
router.use('/file', fileUpload);

export default router;
