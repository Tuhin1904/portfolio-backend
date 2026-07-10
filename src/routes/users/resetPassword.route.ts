import { Router } from 'express';
import { resetPassword } from '../../controllers/resetPassword.controller';

const router = Router();

router.post('/', resetPassword);

export default router;
