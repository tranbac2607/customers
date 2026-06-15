import { Schema, model, Document, Types } from 'mongoose';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'pending' | 'disabled';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string; // login alias, e.g. "tranbac"
  passwordHash: string;
  name: string;
  role: UserRole;
  status: UserStatus; // 'active' | 'pending' (email verify) | 'disabled' (admin ban)
  avatarUrl?: string;
  refreshTokens: string[]; // hashed tokens
  lastLoginAt?: Date;
  // Email verification
  emailVerifiedAt?: Date;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  // Password reset
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  // Theme preference (synced across devices)
  themePreference?: 'light' | 'dark' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
      match: /^[a-z0-9_.-]+$/, // alphanumeric + . _ -
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' },
    avatarUrl: { type: String, trim: true, maxlength: 1000 },
    refreshTokens: { type: [String], default: [], select: false },
    lastLoginAt: { type: Date },
    emailVerifiedAt: { type: Date },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date },
    themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const r = ret as unknown as Record<string, unknown>;
    r.id = r._id;
    delete r._id;
    delete r.__v;
    delete r.passwordHash;
    delete r.refreshTokens;
    delete r.emailVerificationTokenHash;
    delete r.passwordResetTokenHash;
    return r;
  },
});

export const User = model<IUser>('User', userSchema);
