import { User, IUser, UserRole, UserStatus } from './auth.model';
import { Types } from 'mongoose';

export const authRepository = {
  /**
   * Find a user by EITHER email OR username. The service layer decides
   * which field to query against based on whether the input contains
   * '@' (email) or not (username). Returns the passwordHash field
   * because callers always need it for credential checking.
   */
  async findByIdentifierWithPassword(identifier: string): Promise<IUser | null> {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const query = isEmail
      ? { email: trimmed.toLowerCase() }
      : { username: trimmed.toLowerCase() };
    return User.findOne(query).select('+passwordHash');
  },

  /** Find by email AND surface the (select:false) refreshTokens. */
  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  },

  async findByUsernameWithPassword(username: string): Promise<IUser | null> {
    return User.findOne({ username: username.toLowerCase().trim() }).select('+passwordHash');
  },

  async findByEmailVerificationTokenWithFields(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select('+emailVerificationTokenHash');
  },

  async findByPasswordResetTokenWithFields(tokenHash: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordHash');
  },

  async findById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return User.findById(id);
  },

  async findAll(): Promise<IUser[]> {
    return User.find().sort({ createdAt: -1 });
  },

  async updateLastLogin(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { lastLoginAt: new Date() });
  },

  async addRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $push: { refreshTokens: hashedToken } });
  },

  async removeRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { refreshTokens: hashedToken } });
  },

  async purgeAllRefreshTokens(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
  },

  async rotateRefreshToken(
    userId: string,
    oldHashed: string,
    newHashed: string,
  ): Promise<boolean> {
    // Atomic: only rotate if oldHashed is still in the list. The filter
    // matches the array element positionally, and `$` (positional
    // operator) rewrites just that element. If a concurrent request
    // already rotated, the filter won't match and we return false —
    // caller can decide how to react (reject the request) without
    // purging other devices' sessions.
    const result = await User.findOneAndUpdate(
      { _id: userId, refreshTokens: oldHashed },
      { $set: { 'refreshTokens.$': newHashed } },
      { returnDocument: 'before' },
    );
    return result !== null;
  },

  async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpiresAt: expiresAt,
        },
      },
    );
  },

  async markEmailVerified(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: { emailVerifiedAt: new Date(), status: 'active' as UserStatus },
        $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 },
      },
    );
  },

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      },
    );
  },

  async clearPasswordResetToken(userId: string): Promise<void> {
    await User.updateOne(
      { _id: userId },
      { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
    );
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $set: { passwordHash } });
  },

  async updateProfile(
    userId: string,
    update: {
      name?: string;
      email?: string;
      themePreference?: 'light' | 'dark' | 'system';
      avatarUrl?: string | null;
    },
  ): Promise<IUser | null> {
    const $set: Record<string, unknown> = {};
    if (update.name !== undefined) $set.name = update.name;
    if (update.email !== undefined) $set.email = update.email;
    if (update.themePreference !== undefined) $set.themePreference = update.themePreference;
    if (update.avatarUrl !== undefined) $set.avatarUrl = update.avatarUrl;
    if (Object.keys($set).length === 0) return User.findById(userId);
    return User.findOneAndUpdate({ _id: userId }, { $set }, { returnDocument: 'after' });
  },

  async setStatus(userId: string, status: UserStatus): Promise<IUser | null> {
    return User.findOneAndUpdate(
      { _id: userId },
      { $set: { status } },
      { returnDocument: 'after' },
    );
  },

  async setRole(userId: string, role: UserRole): Promise<IUser | null> {
    return User.findOneAndUpdate(
      { _id: userId },
      { $set: { role } },
      { returnDocument: 'after' },
    );
  },

  async deleteById(userId: string): Promise<void> {
    await User.deleteOne({ _id: userId });
  },

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
    status?: UserStatus;
  }): Promise<IUser> {
    return User.create({
      email: data.email.toLowerCase().trim(),
      username: data.username.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role ?? 'user',
      status: data.status ?? 'pending',
    });
  },

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase().trim() });
  },
};
