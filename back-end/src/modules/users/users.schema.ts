import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100);

const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  username: usernameSchema,
  password: passwordSchema,
  name: z.string().min(1).max(200).trim(),
  role: z.enum(['admin', 'user']).default('user'),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'pending', 'disabled']).optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

/**
 * Avatar upload accepts a data URL (e.g. `data:image/png;base64,...`).
 * We deliberately use a data URL rather than multipart so the FE
 * doesn't need an extra fetch dance to a signed-upload endpoint, and
 * the whole user record stays self-contained. We cap the size at
 * 512KB to keep the document small and the JWT cookies sane.
 */
export const avatarUploadSchema = z.object({
  dataUrl: z
    .string()
    .startsWith('data:image/')
    .max(700_000, 'Avatar must be under ~512KB after encoding'),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
