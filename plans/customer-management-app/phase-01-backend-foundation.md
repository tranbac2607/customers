# Phase 01 — Backend Foundation

**Goal:** Boot a typed Express server with security middleware, Mongo connection, structured logging, Swagger docs, and a `/api/health` endpoint. No business logic yet — pure infrastructure.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/back-end/`

---

## Files to create

```
back-end/
├── .env.example
├── .gitignore                       # already in root, but add app-level too
├── .eslintrc.cjs
├── .prettierrc.json                 # extends root
├── package.json
├── tsconfig.json
├── nodemon.json
├── jest.config.ts
├── README.md
└── src/
    ├── app.ts                       # express app factory (no listen)
    ├── server.ts                    # entry: connect db + listen
    ├── config/
    │   ├── env.ts                   # typed env loader (zod)
    │   ├── database.ts              # mongoose connect helper
    │   ├── logger.ts                # winston instance
    │   └── swagger.ts               # swagger-jsdoc config
    ├── middlewares/
    │   ├── error.middleware.ts      # centralized error handler
    │   ├── notFound.middleware.ts   # 404 handler
    │   ├── requestId.middleware.ts  # adds req.id
    │   └── requestLogger.middleware.ts
    ├── utils/
    │   ├── ApiError.ts              # custom error class with status + code
    │   ├── ApiResponse.ts           # success response shape
    │   ├── asyncHandler.ts          # wraps async controllers
    │   └── pick.ts                  # lodash pick helper
    ├── types/
    │   └── express.d.ts             # augments Request with id, user
    ├── modules/
    │   └── health/
    │       ├── health.controller.ts
    │       └── health.routes.ts
    └── __tests__/
        └── health.test.ts
```

---

## Dependencies

```bash
npm init -y
```

### Runtime
```bash
npm i express mongoose dotenv cors helmet morgan winston winston-daily-rotate-file \
      express-rate-limit jsonwebtoken bcryptjs zod swagger-jsdoc swagger-ui-express \
      lodash http-errors cookie-parser compression
```

### Dev
```bash
npm i -D typescript ts-node tsx @types/node @types/express @types/cors @types/morgan \
        @types/jsonwebtoken @types/bcryptjs @types/lodash @types/swagger-jsdoc \
        @types/swagger-ui-express @types/cookie-parser @types/compression \
        nodemon eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
        prettier eslint-config-prettier jest ts-jest @types/jest supertest \
        @types/supertest
```

---

## Key file contents

### `package.json` (excerpt)
```json
{
  "name": "back-end",
  "version": "0.1.0",
  "private": true,
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "lint": "eslint \"src/**/*.{ts,tsx}\"",
    "lint:fix": "eslint \"src/**/*.{ts,tsx}\" --fix",
    "typecheck": "tsc --noEmit",
    "test": "jest --runInBand"
  }
}
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "baseUrl": "src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### `nodemon.json`
```json
{ "watch": ["src"], "ext": "ts,json", "ignore": ["dist"], "exec": "tsx src/server.ts" }
```

### `.env.example`
```
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/customers
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### `src/config/env.ts` (sketch)
```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
```

### `src/config/logger.ts` (winston with daily rotate)
- Two transports: console (colorized) + `logs/app-%DATE%.log` (daily rotate, 14d retention).
- Format: timestamp + level + message + meta (requestId if present).
- Export `logger` and stream for morgan.

### `src/utils/ApiError.ts`
```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public isOperational = true,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  static badRequest(msg = 'Bad request', details?: unknown) { return new ApiError(400, 'BAD_REQUEST', msg, details); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, 'UNAUTHORIZED', msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, 'FORBIDDEN', msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, 'NOT_FOUND', msg); }
  static conflict(msg = 'Conflict', details?: unknown) { return new ApiError(409, 'CONFLICT', msg, details); }
  static internal(msg = 'Internal server error') { return new ApiError(500, 'INTERNAL', msg, undefined, false); }
}
```

### `src/utils/ApiResponse.ts`
```ts
export interface ApiSuccess<T> { success: true; data: T; meta?: Record<string, unknown> }
export interface ApiFailure { success: false; error: { code: string; message: string; details?: unknown } }
export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> => ({ success: true, data, meta });
```

### `src/utils/asyncHandler.ts`
```ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
type Async = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export const asyncHandler = (fn: Async): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### `src/middlewares/error.middleware.ts`
- Recognizes `ApiError` → send `{ success:false, error:{code,message,details} }` with status.
- Mongoose `ValidationError` → 400 with field map.
- Mongoose `CastError` → 400.
- JWT errors (`JsonWebTokenError`, `TokenExpiredError`) → 401.
- Default → 500, log full stack, return generic message in production.

### `src/middlewares/notFound.middleware.ts`
- 404 → `ApiError.notFound('Route not found')`.

### `src/app.ts`
- Create express app.
- Middleware order: `requestId` → `requestLogger` (morgan stream → winston) → `helmet` → `cors({ origin: env.CORS_ORIGIN, credentials: true })` → `compression` → `cookieParser` → `express.json({ limit: '1mb' })` → `express.urlencoded({ extended: true })` → `rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false })`.
- Mount routes: `/api/health`, `/api/docs` (swagger-ui.serve + setup from config/swagger.ts), `/api/auth` (placeholder), `/api/customers` (placeholder).
- `/api/health` returns `{ status:'ok', uptime, timestamp }`.
- Mount `notFound` then `error` middleware.
- Export `app`.

### `src/server.ts`
```ts
import { app } from './app';
import { env } from './config/env';
import { connectDB } from './config/database';
import { logger } from './config/logger';

const start = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT} (${env.NODE_ENV})`));
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (r) => logger.error('unhandledRejection', r));
process.on('uncaughtException', (e) => { logger.error('uncaughtException', e); process.exit(1); });

start();
```

### `src/config/database.ts`
```ts
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(env.MONGODB_URI, { autoIndex: env.NODE_ENV !== 'production' });
  logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
};
```

### `src/config/swagger.ts`
- swagger-jsdoc scans `./src/modules/**/*.{ts,js}` and `./src/app.ts`.
- OpenAPI 3.0, security scheme `bearerAuth`.
- Title: "Customer Management API", version 1.0.0.

### `src/modules/health/health.routes.ts`
```ts
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';

const r = Router();
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200: { description: ok }
 */
r.get('/', asyncHandler(async (_req, res) => {
  res.json(ok({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));
}));
export default r;
```

### `src/types/express.d.ts`
```ts
declare global {
  namespace Express {
    interface Request { id: string; user?: { id: string; role: string } }
  }
}
export {};
```

### `src/middlewares/requestId.middleware.ts`
- Use `crypto.randomUUID()` if header `x-request-id` absent; attach to `req.id` and response header.

### `src/middlewares/requestLogger.middleware.ts`
- morgan `combined` stream → winston info.

### `.eslintrc.cjs`
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { node: true, es2022: true, jest: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
  },
};
```

### `jest.config.ts`
```ts
import type { Config } from 'jest';
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
} satisfies Config;
```

### `__tests__/health.test.ts`
- Boot app with `mongodb-memory-server` (add dep) OR mock `connectDB` — simpler: skip connection in test by using a separate `createApp` for tests, or set `MONGODB_URI` to a dummy and call `/api/health` after mocking `mongoose.connect`.
- Assert 200 + `{ success:true, data:{ status:'ok' } }`.

---

## Environment variables (documented)

| Key | Required | Example | Description |
|-----|----------|---------|-------------|
| NODE_ENV | yes | development | runtime env |
| PORT | yes | 4000 | API port |
| CORS_ORIGIN | yes | http://localhost:3000 | allowed FE origin |
| MONGODB_URI | yes | mongodb+srv://… | mongo connection string |
| JWT_ACCESS_SECRET | yes | (32+ chars) | access token signing key |
| JWT_REFRESH_SECRET | yes | (32+ chars) | refresh token signing key |
| JWT_ACCESS_EXPIRES | yes | 15m | access TTL |
| JWT_REFRESH_EXPIRES | yes | 7d | refresh TTL |
| RATE_LIMIT_WINDOW_MS | no | 900000 | rate limit window |
| RATE_LIMIT_MAX | no | 100 | requests/window/IP |
| LOG_LEVEL | no | info | winston level |

---

## Validation

- [ ] `npm run dev` boots, logs `MongoDB connected` (using local or Atlas URI).
- [ ] `curl http://localhost:4000/api/health` → 200 with expected JSON.
- [ ] `curl http://localhost:4000/api/docs` → Swagger UI HTML.
- [ ] `curl http://localhost:4000/api/unknown` → 404 JSON error.
- [ ] `npm run typecheck` passes (0 errors).
- [ ] `npm run lint` passes.
- [ ] `npm test` passes (1 passing).
- [ ] No `console.log` left in code (use logger).

---

## Notes

- Path alias `@/*` → `src/*` (resolve via `tsconfig.paths` + `tsconfig-paths` for prod, or `tsx` resolves it natively).
- We keep `app.ts` pure (factory) so tests can create an instance without binding ports.
- Winston daily-rotate writes to `logs/` — add to `.gitignore` and `.dockerignore` later.
