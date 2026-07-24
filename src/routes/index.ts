import { Router } from 'express';
import userRoutes from './users';
import queryOperation from './Queries';
import pingRoute from './ping';
import fileUpload from './fileUpload/fileUpload.route';
import dashboardRoutes from './dashboard';
import reviewRoutes from './reviews';
import urlShortenerRoutes from './urlShortener/urlShortener.route';

const router = Router();

// group all routes here
router.use('/', pingRoute);
router.use('/project', queryOperation);
router.use('/users', userRoutes);
router.use('/file', fileUpload);
router.use('/dashboard', dashboardRoutes);
router.use('/reviews', reviewRoutes);
router.use('/url-shortener', urlShortenerRoutes);

export default router;


