import { Router } from 'express';
import { refreshToken } from '../../controllers/refreshToken.controller';

const router = Router();

router.post('/', refreshToken);

export default router;
