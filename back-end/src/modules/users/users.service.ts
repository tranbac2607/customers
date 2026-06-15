import { User } from '@/modules/auth/auth.model';
import { authRepository } from '@/modules/auth/auth.repository';
import { hashPassword } from '@/utils/password';
import { ApiError } from '@/utils/ApiError';
import { activityLogService } from '@/services/activityLog.service';
import { CreateUserInput, ListUsersQuery, UpdateUserInput } from './users.schema';
import { userResponseDto } from '@/modules/auth/auth.dto';
import { Types } from 'mongoose';

export const usersService = {
  async list(query: ListUsersQuery, _meta?: { ip?: string; userAgent?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.search) {
      const re = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ email: re }, { name: re }, { username: re }];
    }
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    return {
      items: items.map(userResponseDto),
      total,
      page,
      limit,
    };
  },

  async getById(id: string) {
    const u = await User.findById(id);
    if (!u) throw ApiError.notFound('User not found');
    return userResponseDto(u);
  },

  async create(
    input: CreateUserInput,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    // Pre-check uniqueness so we return a precise 409 instead of a
    // generic 500 from the Mongoose index.
    const byEmail = await authRepository.findByEmail(input.email);
    if (byEmail) throw ApiError.conflict('Email is already registered');
    const byUsername = await authRepository.findByUsernameWithPassword(input.username);
    if (byUsername) throw ApiError.conflict('Username is already taken');

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.create({
      email: input.email,
      username: input.username,
      passwordHash,
      name: input.name,
      role: input.role,
      status: 'active',
    });

    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.create',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { createdUserId: user._id.toString(), role: input.role },
    });

    return userResponseDto(user);
  },

  async update(
    id: string,
    input: UpdateUserInput,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('User not found');

    // Pre-check uniqueness if email changed
    if (input.email) {
      const existing = await authRepository.findByEmail(input.email);
      if (existing && existing._id.toString() !== id) {
        throw ApiError.conflict('Email is already in use by another account');
      }
    }

    const $set: Record<string, unknown> = {};
    if (input.name !== undefined) $set.name = input.name;
    if (input.email !== undefined) $set.email = input.email;
    if (input.role !== undefined) $set.role = input.role;
    if (input.status !== undefined) $set.status = input.status;

    const updated = await User.findOneAndUpdate(
      { _id: id },
      { $set },
      { returnDocument: 'after' },
    );
    if (!updated) throw ApiError.notFound('User not found');

    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.update_profile',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { targetUserId: id, fields: Object.keys(input) },
    });

    return userResponseDto(updated);
  },

  async setRole(
    id: string,
    role: 'admin' | 'user',
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('User not found');
    const updated = await authRepository.setRole(id, role);
    if (!updated) throw ApiError.notFound('User not found');
    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.set_role',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { targetUserId: id, role },
    });
    return userResponseDto(updated);
  },

  async setStatus(
    id: string,
    status: 'active' | 'pending' | 'disabled',
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('User not found');
    const updated = await authRepository.setStatus(id, status);
    if (!updated) throw ApiError.notFound('User not found');

    // If we just disabled a user, wipe their refresh tokens so they
    // can't keep using a session the admin just revoked.
    if (status === 'disabled') {
      await authRepository.purgeAllRefreshTokens(id);
    }

    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.set_status',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { targetUserId: id, status },
    });
    return userResponseDto(updated);
  },

  async delete(
    id: string,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.notFound('User not found');
    if (id === meta.actorId) throw ApiError.badRequest('You cannot delete your own account');

    // Revoke all sessions for the deleted user.
    await authRepository.purgeAllRefreshTokens(id);
    await authRepository.deleteById(id);

    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.delete',
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { targetUserId: id },
    });
  },

  /**
   * Self-service avatar upload. Accepts a data URL (e.g.
   * `data:image/png;base64,...`), persists it on the user record.
   * Capped at ~512KB by the schema; we trust the client to resize
   * before sending.
   */
  async uploadAvatar(
    userId: string,
    dataUrl: string,
    meta: { actorId: string; ip?: string; userAgent?: string },
  ) {
    const updated = await authRepository.updateProfile(userId, { avatarUrl: dataUrl });
    if (!updated) throw ApiError.notFound('User not found');
    await activityLogService.log({
      userId: meta.actorId,
      action: 'user.avatar_upload',
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return userResponseDto(updated);
  },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}