import { Router } from 'express';
import { updateQueryStatus } from '../../controllers/guest.controller';
import { protectedCreateQuery } from '../../middleware/createQueryProtected.middleware';
import { canUpdateQuery } from '../../middleware/updateDocByRole.middleware';

const router = Router();

router.post('/:id/status', protectedCreateQuery, canUpdateQuery, updateQueryStatus);

export default router;
