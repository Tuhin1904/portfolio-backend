import { Router } from 'express';

const router = Router();

router.get('/ping', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is awake ',
    timestamp: new Date().toISOString(),
  });
});

export default router;
