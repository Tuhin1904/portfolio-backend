import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import { apiLimiter } from './utils/rateLimiter';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter, routes);

export default app;
