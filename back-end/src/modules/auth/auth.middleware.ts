import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/utils/jwt';
import { ApiError } from '@/utils/ApiError';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(ApiError.unauthorized('Missing Bearer token'));
  }
  const token = header.slice(7).trim();
  if (!token) return next(ApiError.unauthorized('Empty Bearer token'));

  try {
    const payload = verifyAccessToken(token);
    if (!payload.sub) return next(ApiError.unauthorized('Invalid token payload'));
    req.user = {
      id: payload.sub,
      role: payload.role ?? 'user',
      email: '', // optional, set by /me if needed
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
