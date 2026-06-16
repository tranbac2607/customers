import type { Response } from 'express';
import { randomBytes } from 'crypto';
import { authRepository } from './auth.repository';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from './auth.schema';
import { comparePassword, hashPassword } from '@/utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/utils/jwt';
import { hashToken, newJti } from '@/utils/crypto';
import { ApiError } from '@/utils/ApiError';
import { env } from '@/config/env';
import { emailService } from '@/services/email.service';
import { activityLogService } from '@/services/activityLog.service';
import { IUser } from './auth.model';

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

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
  // The FE (Vercel) and the BE (Render) live on different origins, so
  // this is a cross-site cookie by definition. `SameSite=None` is the
  // baseline, but Safari ITP and Chrome Incognito still drop those
  // unless the cookie also carries `Partitioned` (the CHIPS proposal
  // — Cookies Having Independent Partitioned State). With Partitioned,
  // the browser scopes the cookie to the top-level site that initiated
  // the request (e.g. customers-front-end.vercel.app), so a login
  // initiated from there can be read on subsequent calls to the BE
  // even when the user is browsing in Strict tracking-protection mode.
  //
  // Partitioned is only valid with Secure=true, which we already set
  // in production. In dev we omit it (Secure=false would make
  // Partitioned a no-op anyway).
  const partitioned = isProd;
  res.cookie(COOKIE_NAMES.accessToken, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    partitioned,
    path: '/',
    maxAge: ACCESS_TTL_SECONDS * 1000,
  });
  res.cookie(COOKIE_NAMES.refreshToken, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    partitioned,
    path: '/',
    maxAge: REFRESH_TTL_SECONDS * 1000,
  });
};

const clearAuthCookies = (res: Response): void => {
  // Mirror the attributes used in setAuthCookies so the browser
  // actually matches the cookie it's about to delete. With
  // SameSite=None / Partitioned, the clear MUST carry the same
  // attributes or the browser skips it.
  const sameSite: 'none' | 'lax' = isProd ? 'none' : 'lax';
  const partitioned = isProd;
  res.clearCookie(COOKIE_NAMES.accessToken, {
    path: '/',
    secure: isProd,
    sameSite,
    partitioned,
  });
  res.clearCookie(COOKIE_NAMES.refreshToken, {
    path: '/',
    secure: isProd,
    sameSite,
    partitioned,
  });
};

const newOpaqueToken = (): { raw: string; hash: string } => {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
};

const issueTokens = (user: IUser) => {
  const jti = newJti();
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), jti });
  const hashed = hashToken(refreshToken);
  return { accessToken, refreshToken, hashedRefresh: hashed };
};

export const authService = {
  /**
   * Login accepts an `identifier` that is either an email or a username.
   * The service decides which to query against by checking for '@'.
   */
  async login(input: LoginInput, res?: Response, meta?: { ip?: string; userAgent?: string }) {
    const user = await authRepository.findByIdentifierWithPassword(input.identifier);
    if (!user) {
      // Use the same error as wrong password to avoid leaking which
      // identifiers exist (no user-enumeration via timing/error).
      throw ApiError.unauthorized('Invalid credentials');
    }

    if (user.status === 'disabled') {
      throw ApiError.forbidden('Account is disabled. Contact an admin.');
    }

    if (env.REQUIRE_EMAIL_VERIFICATION && user.status === 'pending' && !user.emailVerifiedAt) {
      throw ApiError.forbidden('Please verify your email before signing in.');
    }

    const ok = await comparePassword(input.password, user.passwordHash);
    if (!ok) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    const { accessToken, refreshToken, hashedRefresh } = issueTokens(user);
    await authRepository.addRefreshToken(user._id.toString(), hashedRefresh);
    await authRepository.updateLastLogin(user._id.toString());

    if (res) setAuthCookies(res, accessToken, refreshToken);

    await activityLogService.log({
      userId: user._id.toString(),
      action: 'auth.login',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { identifier: input.identifier },
    });

    return { accessToken, refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS, user };
  },

  async refresh(
    input: { refreshToken?: string } | undefined,
    res: Response,
    cookieRefreshToken?: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const incomingRefresh = input?.refreshToken ?? cookieRefreshToken;
    if (!incomingRefresh) throw ApiError.unauthorized('No refresh token provided');

    let payload;
    try {
      payload = verifyRefreshToken(incomingRefresh);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('User not found');
    if (user.status === 'disabled') {
      throw ApiError.forbidden('Account is disabled');
    }

    const incomingHash = hashToken(incomingRefresh);
    const { accessToken, refreshToken, hashedRefresh } = issueTokens(user);

    const rotated = await authRepository.rotateRefreshToken(
      user._id.toString(),
      incomingHash,
      hashedRefresh,
    );
    if (!rotated) {
      // Don't purge other devices — that was the source of the
      // "logged out from all tabs" race bug. Just reject this one.
      clearAuthCookies(res);
      throw ApiError.unauthorized('Refresh token already used or revoked');
    }

    setAuthCookies(res, accessToken, refreshToken);

    await activityLogService.log({
      userId: user._id.toString(),
      action: 'auth.refresh',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { accessToken, refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS };
  },

  async logout(
    userId: string,
    input: { refreshToken?: string } | undefined,
    res: Response,
    cookieRefreshToken?: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const incomingRefresh = input?.refreshToken ?? cookieRefreshToken;
    if (incomingRefresh) {
      const hashed = hashToken(incomingRefresh);
      await authRepository.removeRefreshToken(userId, hashed);
    }
    clearAuthCookies(res);

    await activityLogService.log({
      userId,
      action: 'auth.logout',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  // ─────────────────────────────────────────────────────────────────────
  // Registration + email verification
  // ─────────────────────────────────────────────────────────────────────

  async register(
    input: RegisterInput,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ user: IUser; verificationSent: boolean }> {
    // Make sure the email and username are both free. We check them
    // explicitly so we can return a precise error (ConflictException
    // with the right field) instead of a generic 500 from Mongoose.
    const existingByEmail = await authRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw ApiError.conflict('Email is already registered');
    }
    // Quick username check (we still rely on the unique index as a
    // race-safe backstop).
    const existingByUsername = await authRepository.findByUsernameWithPassword(input.username);
    if (existingByUsername) {
      throw ApiError.conflict('Username is already taken');
    }

    const passwordHash = await hashPassword(input.password);

    // Decide the initial status: if verification is required, the
    // user is "pending" until they click the link in the email.
    const initialStatus = env.REQUIRE_EMAIL_VERIFICATION ? 'pending' : 'active';

    const user = await authRepository.create({
      email: input.email,
      username: input.username,
      passwordHash,
      name: input.name,
      status: initialStatus,
    });

    let verificationSent = false;
    if (env.REQUIRE_EMAIL_VERIFICATION) {
      const { raw, hash } = newOpaqueToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await authRepository.setEmailVerificationToken(user._id.toString(), hash, expiresAt);
      try {
        await emailService.sendVerificationEmail(user.email, raw);
        verificationSent = true;
      } catch (err) {
        // Don't fail the registration just because the email didn't
        // send — the user can request a new one. Log it.
        console.error('Failed to send verification email', err);
      }
    }

    await activityLogService.log({
      userId: user._id.toString(),
      action: 'auth.register',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { user, verificationSent };
  },

  async verifyEmail(token: string, meta?: { ip?: string; userAgent?: string }) {
    const tokenHash = hashToken(token);
    const user = await authRepository.findByEmailVerificationTokenWithFields(tokenHash);
    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }
    await authRepository.markEmailVerified(user._id.toString());

    await activityLogService.log({
      userId: user._id.toString(),
      action: 'auth.verify_email',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { user };
  },

  async resendVerification(
    email: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ sent: boolean }> {
    const user = await authRepository.findByEmail(email);
    if (!user || user.emailVerifiedAt) {
      // Don't leak whether the email exists. Return success either way
      // so an attacker can't enumerate accounts.
      return { sent: false };
    }
    const { raw, hash } = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await authRepository.setEmailVerificationToken(user._id.toString(), hash, expiresAt);
    try {
      await emailService.sendVerificationEmail(user.email, raw);
      await activityLogService.log({
        userId: user._id.toString(),
        action: 'auth.resend_verification',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      return { sent: true };
    } catch {
      return { sent: false };
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // Password reset
  // ─────────────────────────────────────────────────────────────────────

  async forgotPassword(
    input: ForgotPasswordInput,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{ sent: boolean }> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      // Don't leak whether the email exists.
      return { sent: false };
    }
    const { raw, hash } = newOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await authRepository.setPasswordResetToken(user._id.toString(), hash, expiresAt);
    try {
      await emailService.sendPasswordResetEmail(user.email, raw);
      await activityLogService.log({
        userId: user._id.toString(),
        action: 'auth.forgot_password',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      return { sent: true };
    } catch {
      return { sent: false };
    }
  },

  async resetPassword(
    input: ResetPasswordInput,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const tokenHash = hashToken(input.token);
    const user = await authRepository.findByPasswordResetTokenWithFields(tokenHash);
    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }
    const passwordHash = await hashPassword(input.password);
    await authRepository.updatePasswordHash(user._id.toString(), passwordHash);
    // Wipe all existing refresh tokens — anyone with a session from
    // the old password is now logged out everywhere. Plus clear the
    // reset token so it can't be reused.
    await authRepository.purgeAllRefreshTokens(user._id.toString());
    await authRepository.clearPasswordResetToken(user._id.toString());

    await activityLogService.log({
      userId: user._id.toString(),
      action: 'auth.reset_password',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { user };
  },

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await authRepository.findByEmail(
      (await authRepository.findById(userId))?.email ?? '',
    );
    if (!user) throw ApiError.notFound('User not found');

    // Re-fetch with passwordHash
    const userWithHash = await authRepository.findByIdentifierWithPassword(user.email);
    if (!userWithHash) throw ApiError.notFound('User not found');

    const ok = await comparePassword(input.currentPassword, userWithHash.passwordHash);
    if (!ok) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await authRepository.updatePasswordHash(userId, passwordHash);

    // Log out other devices for safety.
    await authRepository.purgeAllRefreshTokens(userId);

    await activityLogService.log({
      userId,
      action: 'auth.change_password',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  },

  // ─────────────────────────────────────────────────────────────────────
  // Profile management
  // ─────────────────────────────────────────────────────────────────────

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    meta?: { ip?: string; userAgent?: string },
  ) {
    if (input.email) {
      const existing = await authRepository.findByEmail(input.email);
      if (existing && existing._id.toString() !== userId) {
        throw ApiError.conflict('Email is already in use by another account');
      }
    }
    const updated = await authRepository.updateProfile(userId, input);
    if (!updated) throw ApiError.notFound('User not found');

    await activityLogService.log({
      userId,
      action: 'user.update_profile',
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { fields: Object.keys(input) },
    });

    return updated;
  },
};
