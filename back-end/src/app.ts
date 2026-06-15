import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { env } from '@/config/env';
import { swaggerSpec, isSwaggerEnabled } from '@/config/swagger';
import { requestIdMiddleware } from '@/middlewares/requestId.middleware';
import { requestLoggerMiddleware } from '@/middlewares/requestLogger.middleware';
import { errorMiddleware } from '@/middlewares/error.middleware';
import { notFoundMiddleware } from '@/middlewares/notFound.middleware';
import healthRouter from '@/modules/health/health.routes';
import authRouter from '@/modules/auth/auth.routes';
import customerRouter from '@/modules/customers/customer.routes';
import usersRouter from '@/modules/users/users.routes';
import activityLogRouter from '@/modules/users/activityLog.routes';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy for Railway/Vercel
  app.set('trust proxy', 1);

  // Core
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger needs inline
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Rate limit (apply to /api)
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' },
    },
  });
  app.use('/api', limiter);

  // Stricter rate limit on auth endpoints to slow down brute-force
  // password guessing / credential stuffing. 10 attempts / 5 minutes
  // per IP. Excludes /auth/refresh (called automatically and often).
  const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many auth attempts, please slow down.' },
    },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // Health (no rate limit effects since it returns fast)
  app.use('/api/health', healthRouter);

  // Swagger
  if (isSwaggerEnabled) {
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Customer Management API Docs',
        swaggerOptions: { persistAuthorization: true },
      }),
    );
    app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
  }

  // Feature routes
  app.use('/api/auth', authRouter);
  app.use('/api/customers', customerRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/activity-log', activityLogRouter);

  // Root
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Customer Management API',
        version: '1.0.0',
        docs: isSwaggerEnabled ? '/api/docs' : 'disabled in production',
      },
    });
  });

  // 404 + error handlers (last)
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
