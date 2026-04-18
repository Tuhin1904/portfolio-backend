import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import cors from 'cors';
import { apiLimiter } from './utils/rateLimiter';

dotenv.config();

const app = express();

const allowedOrigins = ['http://localhost:3000', 'https://tuhindev.me'];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter, routes);

export default app;
