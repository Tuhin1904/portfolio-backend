import { Router } from 'express';
import { signin } from '../../controllers/signin.controller';

const router = Router();

router.post('/', signin);

export default router;
