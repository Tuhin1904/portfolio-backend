import multer from 'multer';

export const upload = multer({
  storage: multer.memoryStorage(), // store in memory
});
