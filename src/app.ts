import express from 'express';
import dotenv from 'dotenv';
import routes from './routes';
import cors from 'cors';
import { apiLimiter } from './utils/rateLimiter';
import { redirectShortUrl } from './controllers/urlShortener.controller';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = ['http://localhost:3000', 'https://tuhindev.me', 'https://www.tuhindev.me'];

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

// Top-level fast short URL redirect route
app.get('/s/:shortCode', redirectShortUrl);

app.use('/api', apiLimiter, routes);

export default app;

