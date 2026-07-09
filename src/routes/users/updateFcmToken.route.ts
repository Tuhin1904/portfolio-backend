import { Router } from 'express';
import { authAndOwnUser } from '../../middleware/authAndOwnUser';
import { updateFcmToken } from '../../controllers/updateFcmToken.controller';

const router = Router();

router.put('/', authAndOwnUser, updateFcmToken);

export default router;
