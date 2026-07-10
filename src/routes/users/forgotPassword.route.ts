import { Router } from 'express';
import { forgotPassword } from '../../controllers/forgotPassword.controller';

const router = Router();

router.post('/', forgotPassword);

export default router;
