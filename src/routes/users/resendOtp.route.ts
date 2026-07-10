import { Router } from 'express';
import { resendOtp } from '../../controllers/resendOtp.controller';

const router = Router();

router.post('/', resendOtp);

export default router;
