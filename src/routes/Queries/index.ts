import { Router } from 'express';
import create from './createQuery.routes';
import getQueries from './getQueries.routes';
import updateQueries from './updateQuery.route';
import getMyQueries from './myQueries.routes';
import chat from './chat.route';

const router = Router();

router.use('/queries', create);
router.use('/queries/my', getMyQueries);
router.use('/queries', getQueries);
router.use('/queries', updateQueries);
router.use('/queries', chat);

export default router;
