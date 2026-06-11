import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { ApiError } from '@/utils/ApiError';
import { ApiFailure } from '@/utils/ApiResponse';
import { logger } from '@/config/logger';
import { env } from '@/config/env';

export const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // ApiError
  if (err instanceof ApiError) {
    const body: ApiFailure = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    logger.warn({ msg: err.message, code: err.code, status: err.status, requestId: req.id });
    res.status(err.status).json(body);
    return;
  }

  // Zod
  if (err instanceof ZodError) {
    const details = err.flatten().fieldErrors;
    const body: ApiFailure = {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details },
    };
    logger.warn({ msg: 'Validation error', details, requestId: req.id });
    res.status(400).json(body);
    return;
  }

  // Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
    const body: ApiFailure = {
      success: false,
      error: { code: 'MONGOOSE_VALIDATION', message: err.message, details },
    };
    logger.warn({ msg: err.message, details, requestId: req.id });
    res.status(400).json(body);
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    const body: ApiFailure = {
      success: false,
      error: { code: 'CAST_ERROR', message: `Invalid ${err.path}: ${err.value}` },
    };
    res.status(400).json(body);
    return;
  }

  // Mongo duplicate key
  if ((err as { code?: number }).code === 11000) {
    const body: ApiFailure = {
      success: false,
      error: { code: 'DUPLICATE_KEY', message: 'Duplicate value', details: (err as { keyValue?: unknown }).keyValue },
    };
    res.status(409).json(body);
    return;
  }

  // JWT
  if (err instanceof jwt.JsonWebTokenError) {
    const body: ApiFailure = {
      success: false,
      error: { code: 'INVALID_TOKEN', message: err.message },
    };
    res.status(401).json(body);
    return;
  }
  if (err instanceof jwt.TokenExpiredError) {
    const body: ApiFailure = {
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token expired' },
    };
    res.status(401).json(body);
    return;
  }

  // Default 500
  const message =
    err instanceof Error ? err.message : 'Unexpected error';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ msg: 'Unhandled error', err: message, stack, requestId: req.id });

  const body: ApiFailure = {
    success: false,
    error: {
      code: 'INTERNAL',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : message,
    },
  };
  res.status(500).json(body);
};
