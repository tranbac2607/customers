import { z } from 'zod';
import { GENDERS, IDENTITY_DOCUMENT_TYPES } from './customer.model';

const identityDocumentSchema = z.object({
  type: z.enum(IDENTITY_DOCUMENT_TYPES),
  number: z.string().min(1).max(50).trim(),
  issueDate: z.coerce.date(),
  issuePlace: z.string().min(1).max(200).trim(),
});

export const createCustomerSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(200).trim(),
    dateOfBirth: z.coerce
      .date({ message: 'Date of birth must be a valid date' })
      .refine((d) => d < new Date(), { message: 'Date of birth must be in the past' }),
    address: z.string().min(1).max(500).trim(),
    phone: z
      .string()
      .min(6, 'Phone is too short')
      .max(30)
      .trim()
      .regex(/^[+0-9 ()-]+$/, { message: 'Phone contains invalid characters' }),
    email: z.string().email('Invalid email').max(200).toLowerCase().trim(),
    gender: z.enum(GENDERS),
    nationality: z.string().min(1).max(100).trim(),
    occupation: z.string().min(1).max(200).trim(),
    identityDocuments: z
      .array(identityDocumentSchema)
      .max(10, 'Up to 10 identity documents allowed')
      .superRefine((arr, ctx) => {
        const seen = new Set<string>();
        arr.forEach((d, i) => {
          if (seen.has(d.type)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, 'type'],
              message: `Duplicate identity document type: ${d.type}`,
            });
          }
          seen.add(d.type);
        });
      })
      .optional()
      .default([]),
  })
  .strict();

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'dateOfBirth', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
