/**
 * Activity log (audit trail). Every meaningful auth and CRUD action
 * passes through here so admins can answer "who did what, when, and
 * from where" later. Best-effort: log failures must NOT break the
 * user-facing request — they go to console for the operator to notice.
 */
import { Schema, model, Document, Types } from 'mongoose';

export type ActivityAction =
  // auth
  | 'auth.login'
  | 'auth.logout'
  | 'auth.refresh'
  | 'auth.register'
  | 'auth.verify_email'
  | 'auth.resend_verification'
  | 'auth.forgot_password'
  | 'auth.reset_password'
  | 'auth.change_password'
  // users
  | 'user.create'
  | 'user.update_profile'
  | 'user.set_role'
  | 'user.set_status'
  | 'user.avatar_upload'
  | 'user.delete'
  // customers
  | 'customer.create'
  | 'customer.update'
  | 'customer.soft_delete'
  | 'customer.restore'
  | 'customer.hard_delete'
  | 'customer.bulk_delete'
  | 'customer.export';

export interface IActivityLog extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  action: ActivityAction;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    ip: { type: String, maxlength: 64 },
    userAgent: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);

export interface LogInput {
  userId?: string;
  action: ActivityAction;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export const activityLogService = {
  async log(input: LogInput): Promise<void> {
    try {
      await ActivityLog.create({
        userId: input.userId && Types.ObjectId.isValid(input.userId) ? input.userId : undefined,
        action: input.action,
        ip: input.ip,
        userAgent: input.userAgent?.slice(0, 500),
        metadata: input.metadata,
      });
    } catch (err) {
      console.error('activityLogService.log failed', { input, err });
    }
  },

  async list(opts: { userId?: string; action?: ActivityAction; page?: number; limit?: number }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const filter: Record<string, unknown> = {};
    if (opts.userId) filter.userId = opts.userId;
    if (opts.action) filter.action = opts.action;
    const [items, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ActivityLog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },
};
