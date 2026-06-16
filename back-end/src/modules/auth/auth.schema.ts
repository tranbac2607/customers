import { z } from 'zod';

/**
 * Password strength rules. Reused by every endpoint that accepts a
 * new password (register, reset, change-password, admin create-user)
 * so the rules stay in lockstep.
 *
 *   - 8–100 chars (bcrypt accepts longer, but 100 is plenty and
 *     keeps payloads sane).
 *   - At least one letter, one number, and one non-alphanumeric
 *     character ("special character"). The character-class regex
 *     `[^A-Za-z0-9]` covers all common punctuation; we deliberately
 *     don't pin a specific set so passwords like `hunter2!` and
 *     `p@ssw0rd#` both pass.
 *
 *   Login does NOT use this schema — we never reject an existing
 *   password just because the policy tightened.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// `identifier` is either an email OR a username. We don't validate as
// email here — let the service layer decide by checking for '@'.
export const loginSchema = z.object({
  identifier: z.string().min(3).max(200).trim(),
  password: z.string().min(6).max(100),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// Public registration: ALWAYS role='user' on the service side; the
// `role` field is intentionally not in the schema so an attacker
// can't POST {role:'admin'} to escalate. (Bug #2 from the audit.)
export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, _, ., -')
    .transform((s) => s.toLowerCase()),
  password: passwordSchema,
  name: z.string().min(1).max(200).trim(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
