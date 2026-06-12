import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '@/config/env';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: 'admin' | 'user';
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
}

export const signAccessToken = (payload: { sub: string; role: 'admin' | 'user' }): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  });

export const signRefreshToken = (payload: { sub: string; jti: string }): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
