import type { Response } from 'express';
import { authRepository } from './auth.repository';
import { LoginInput, RefreshInput } from './auth.schema';
import { comparePassword, hashPassword } from '@/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { hashToken, newJti } from '@/utils/crypto';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';

// 15 minutes in seconds, default matches env
const ACCESS_TTL_SECONDS = (() => {
  const raw = env.JWT_ACCESS_EXPIRES;
  const m = /^(\d+)([smhd])$/.exec(raw);
  if (!m) return 900;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 900;
  }
})();

// Cookie names
export const COOKIE_NAMES = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
} as const;

const REFRESH_TTL_SECONDS = (() => {
  const raw = env.JWT_REFRESH_EXPIRES;
  const m = /^(\d+)([smhd])$/.exec(raw);
  if (!m) return 7 * 24 * 60 * 60;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 7 * 24 * 60 * 60;
  }
})();

const isProd = env.NODE_ENV === 'production';

/**
 * Set httpOnly cookies for access + refresh tokens.
 * The browser will automatically include these cookies on every same-origin
 * or credentialed cross-origin request, so the FE doesn't need to manage them.
 */
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  res.cookie(COOKIE_NAMES.accessToken, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(COOKIE_NAMES.refreshToken, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(COOKIE_NAMES.accessToken, { path: '/' });
  res.clearCookie(COOKIE_NAMES.refreshToken, { path: '/' });
};

export const authService = {
  async login(input: LoginInput, res?: Response) {
    const user = await authRepository.findByEmailWithPassword(input.email);
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    const ok = await comparePassword(input.password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid credentials');

    const jti = newJti();
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });
    const hashed = hashToken(refreshToken);
    await authRepository.addRefreshToken(user._id.toString(), hashed);
    await authRepository.updateLastLogin(user._id.toString());

    if (res) setAuthCookies(res, accessToken, refreshToken);

    return { accessToken, refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS, user };
  },

  async refresh(input: RefreshInput | undefined, res: Response, cookieRefreshToken?: string) {
    // Token can come from request body (legacy) or from httpOnly cookie
    const incomingRefresh = input?.refreshToken ?? cookieRefreshToken;
    if (!incomingRefresh) throw ApiError.unauthorized('No refresh token provided');

    let payload;
    try {
      payload = verifyRefreshToken(incomingRefresh);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await authRepository.findByIdWithRefreshTokens(payload.sub);
    if (!user) throw ApiError.unauthorized('User not found');

    const incomingHash = hashToken(incomingRefresh);
    if (!user.refreshTokens.includes(incomingHash)) {
      // Reuse-detection: purge all sessions
      user.refreshTokens = [];
      await user.save();
      clearAuthCookies(res);
      throw ApiError.unauthorized('Refresh token reuse detected');
    }

    const newJtiId = newJti();
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const newRefresh = signRefreshToken({ sub: user._id.toString(), jti: newJtiId });
    const newHash = hashToken(newRefresh);

    await authRepository.rotateRefreshToken(user._id.toString(), incomingHash, newHash);
    setAuthCookies(res, accessToken, newRefresh);
    return { accessToken, refreshToken: newRefresh, accessExpiresIn: ACCESS_TTL_SECONDS };
  },

  async logout(
    userId: string,
    input: RefreshInput | undefined,
    res: Response,
    cookieRefreshToken?: string,
  ) {
    const incomingRefresh = input?.refreshToken ?? cookieRefreshToken;
    if (incomingRefresh) {
      const hashed = hashToken(incomingRefresh);
      await authRepository.removeRefreshToken(userId, hashed);
    }
    clearAuthCookies(res);
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async register(
    data: { email: string; password: string; name: string; role?: 'admin' | 'user' },
    _res?: Response,
  ) {
    const existing = await authRepository.findByEmailWithPassword(data.email);
    if (existing) throw ApiError.conflict('Email already registered');
    const passwordHash = await hashPassword(data.password);
    const user = await authRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    });
    return user;
  },
};
