import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';
import { COOKIE_NAMES } from './auth.service';

const extractToken = (req: Request): string | null => {
  // 1. httpOnly cookie (preferred for browser auth)
  const fromCookie = req.cookies?.[COOKIE_NAMES.accessToken] as string | undefined;
  if (fromCookie) return fromCookie;

  // 2. Authorization: Bearer <token> header (for API clients / Swagger)
  const header = req.header('authorization') ?? req.header('Authorization');
  if (header && header.toLowerCase().startsWith('bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  return null;
};

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Missing access token (cookie or Bearer header)'));
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload.sub) return next(ApiError.unauthorized('Invalid token payload'));
    req.user = {
      id: payload.sub,
      role: payload.role ?? 'user',
      email: payload.email ?? '',
    };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles: Array<'admin' | 'user'>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient role'));
    next();
  };
