import { z } from 'zod';

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
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
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
  password: z.string().min(8).max(100),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100),
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
