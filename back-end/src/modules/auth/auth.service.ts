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
  // `sameSite: 'none'` is required so the browser sends these cookies on
  // cross-site requests (Vercel FE -> Render BE). Browsers require
  // `secure: true` whenever sameSite is 'none'. In dev (HTTP localhost) we
  // fall back to 'lax' since the browser rejects 'none' without HTTPS.
  const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
  res.cookie(COOKIE_NAMES.accessToken, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: '/',
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(COOKIE_NAMES.refreshToken, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
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

    // Verify the user exists. We don't need to load refreshTokens here —
    // the atomic rotation below does the membership check + update in one
    // query, which is race-safe (concurrent refreshes can no longer wipe
    // other devices' sessions).
    const user = await authRepository.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User not found');

    const incomingHash = hashToken(incomingRefresh);
    const newJtiId = newJti();
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const newRefresh = signRefreshToken({ sub: user._id.toString(), jti: newJtiId });
    const newHash = hashToken(newRefresh);

    // Atomic claim: rotate only if oldHashed is still in the list. On
    // race (concurrent refresh from another tab) or genuine reuse, the
    // filter won't match and we return false. We reject THIS request
    // but do NOT purge other devices — that previously caused whole
    // accounts to be logged out from a harmless race. Strict reuse-
    // detection (purge on real token theft) would need a jti-chain;
    // out of scope for now.
    const rotated = await authRepository.rotateRefreshToken(
      user._id.toString(),
      incomingHash,
      newHash,
    );
    if (!rotated) {
      clearAuthCookies(res);
      throw ApiError.unauthorized('Refresh token already used or revoked');
    }

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
