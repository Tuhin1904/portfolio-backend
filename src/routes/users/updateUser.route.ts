import { Router } from 'express';
import { authAndOwnUser } from '../../middleware/authAndOwnUser';
import { updateUserProfile } from '../../controllers/updateUserProfile.controller';

const router = Router();

router.put('/', authAndOwnUser, updateUserProfile);

export default router;
