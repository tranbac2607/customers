import { User, IUser } from './auth.model';
import { Types } from 'mongoose';

export const authRepository = {
  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  },
  async findById(id: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return User.findById(id);
  },
  async addRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $push: { refreshTokens: hashedToken } });
  },
  async removeRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await User.updateOne({ _id: userId }, { $pull: { refreshTokens: hashedToken } });
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
  async updateLastLogin(userId: string): Promise<void> {
    await User.updateOne({ _id: userId }, { lastLoginAt: new Date() });
  },
  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: 'admin' | 'user';
  }): Promise<IUser> {
    return User.create({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role ?? 'user',
    });
  },
};
