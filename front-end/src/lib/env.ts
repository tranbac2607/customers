import { z } from 'zod';

const schema = z.object({
  // Browser-facing base URL for API calls. Always relative in this
  // app: the catch-all route in app/api/[...path]/route.ts proxies
  // `/api/*` to the real backend, so the browser stays on the FE
  // origin and httpOnly auth cookies are not treated as third-party
  // by Chrome incognito / mobile.
  NEXT_PUBLIC_API_BASE_URL: z.string().min(1).default('/api'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Customer Management'),
});

export const env = schema.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

/**
 * Server-only: the real backend URL the Next.js catch-all proxy
 * forwards to. NOT prefixed with NEXT_PUBLIC_ on purpose — it must
 * never end up in the client bundle. Set this in Vercel / your
 * server environment to the deployed BE origin (e.g.
 * `https://customers-api-iwgh.onrender.com` — no trailing `/api`).
 * Defaults to `http://localhost:4000` for `npm run dev`.
 */
export const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
