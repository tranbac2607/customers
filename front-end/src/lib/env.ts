import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000/api'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Customer Management'),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
