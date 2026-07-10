import { Router } from 'express';
import { verifyOtp } from '../../controllers/verifyOtp.controller';

const router = Router();

router.post('/', verifyOtp);

export default router;
