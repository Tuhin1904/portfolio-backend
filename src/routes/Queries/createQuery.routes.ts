import { Router } from 'express';
import { createGuestQuery } from '../../controllers/guest.controller';
import { protectedCreateQuery } from '../../middleware/createQueryProtected.middleware';

const router = Router();

router.post('/', protectedCreateQuery, createGuestQuery);

export default router;
