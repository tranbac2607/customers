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

export const authService = {
  async login(input: LoginInput) {
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

    return { accessToken, refreshToken, accessExpiresIn: ACCESS_TTL_SECONDS, user };
  },

  async refresh(input: RefreshInput) {
    let payload;
    try {
      payload = verifyRefreshToken(input.refreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await authRepository.findByIdWithRefreshTokens(payload.sub);
    if (!user) throw ApiError.unauthorized('User not found');

    const incomingHash = hashToken(input.refreshToken);
    if (!user.refreshTokens.includes(incomingHash)) {
      // Reuse-detection: purge all sessions
      await authRepository
        .findByIdWithRefreshTokens(user._id.toString())
        .then(async (u) => {
          if (u) {
            u.refreshTokens = [];
            await u.save();
          }
        });
      throw ApiError.unauthorized('Refresh token reuse detected');
    }

    const newJtiId = newJti();
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const newRefresh = signRefreshToken({ sub: user._id.toString(), jti: newJtiId });
    const newHash = hashToken(newRefresh);

    await authRepository.rotateRefreshToken(user._id.toString(), incomingHash, newHash);
    return { accessToken, refreshToken: newRefresh, accessExpiresIn: ACCESS_TTL_SECONDS };
  },

  async logout(userId: string, input: RefreshInput) {
    const hashed = hashToken(input.refreshToken);
    await authRepository.removeRefreshToken(userId, hashed);
  },

  async me(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async register(data: { email: string; password: string; name: string; role?: 'admin' | 'user' }) {
    const existing = await authRepository.findByEmailWithPassword(data.email);
    if (existing) throw ApiError.conflict('Email already registered');
    const passwordHash = await hashPassword(data.password);
    return authRepository.create({
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    });
  },
};
