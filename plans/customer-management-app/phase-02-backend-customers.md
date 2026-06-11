# Phase 02 — Backend: Auth + Customers

**Goal:** Implement the full business API — auth (login / refresh / logout / me) and customer CRUD (list / create / read / update / delete) with validation, pagination, search, and Swagger docs.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/back-end/src/`

---

## New modules

```
src/modules/
├── auth/
│   ├── auth.model.ts              # User schema
│   ├── auth.repository.ts         # DB access only
│   ├── auth.service.ts            # business rules
│   ├── auth.controller.ts         # HTTP layer
│   ├── auth.routes.ts
│   ├── auth.schema.ts             # zod request schemas
│   ├── auth.dto.ts                # response DTOs
│   ├── auth.swagger.ts            # openapi paths
│   ├── auth.middleware.ts         # authenticate JWT
│   └── __tests__/auth.test.ts
└── customers/
    ├── customer.model.ts
    ├── customer.repository.ts
    ├── customer.service.ts
    ├── customer.controller.ts
    ├── customer.routes.ts
    ├── customer.schema.ts
    ├── customer.dto.ts
    ├── customer.swagger.ts
    └── __tests__/customer.test.ts
```

Additional files:
- `src/middlewares/validate.middleware.ts` — generic zod validator
- `src/utils/jwt.ts` — sign/verify helpers
- `src/utils/password.ts` — bcrypt hash/compare
- `src/utils/pagination.ts` — paginate helper
- `src/seed/seed.ts` — seed script: create admin user + sample customers

---

## Dependencies

No new runtime deps — `bcryptjs`, `jsonwebtoken`, `zod`, `mongoose` already installed.

Dev: `mongodb-memory-server` for tests.
```bash
npm i -D mongodb-memory-server
```

---

## Auth module

### `auth.model.ts` (User)
```ts
const IdentityDocumentType = ['CCCD', 'DRIVER_LICENSE', 'PASSPORT'] as const;

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  refreshTokens: { type: [String], default: [], select: false },
}, { timestamps: true });
```

### `auth.schema.ts` (zod)
```ts
export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(100),
});
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

export type LoginInput = z.infer<typeof loginSchema>;
```

### `auth.dto.ts`
- `userResponseDto(user)` → `{ id, email, name, role }` (strips hash + refreshTokens).
- `tokenResponseDto(tokens, user)` → `{ accessToken, refreshToken, user }`.

### `utils/jwt.ts`
```ts
export const signAccess = (payload: { sub: string; role: string }) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
export const signRefresh = (payload: { sub: string; jti: string }) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
export const verifyAccess = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
export const verifyRefresh = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
```

### `utils/password.ts`
- `hash(plain)` → bcrypt 12 rounds.
- `compare(plain, hash)` → boolean.

### `auth.middleware.ts` — `authenticate`
- Read `Authorization: Bearer <token>`.
- `verifyAccess`, set `req.user = { id, role }`.
- Throws `ApiError.unauthorized` on failure.

### `auth.service.ts` key methods
- `login({ email, password })`:
  - find user with `+passwordHash` (select).
  - `compare` → throw 401 on mismatch.
  - generate access + refresh (jti = crypto.randomUUID()).
  - push hashed refresh token to user, save.
  - return tokens + user.
- `refresh({ refreshToken })`:
  - verify, find user, check token in `refreshTokens` (store hashed for safety).
  - rotate: remove old, issue new pair with new jti.
- `logout({ userId, refreshToken })`:
  - remove the token from user's `refreshTokens`.
- `me(userId)` → return user.

### `auth.controller.ts` — endpoints
- `POST /login` — body `loginSchema` → 200 `{ success, data }`.
- `POST /refresh` — body `refreshSchema` → 200.
- `POST /logout` — protected, body `refreshSchema` → 204.
- `GET  /me` — protected → 200 user.

### `auth.routes.ts`
```ts
const r = Router();
r.post('/login', validate(loginSchema), asyncHandler(controller.login));
r.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
r.post('/logout', authenticate, validate(refreshSchema), asyncHandler(controller.logout));
r.get('/me', authenticate, asyncHandler(controller.me));
export default r;
```

### `middlewares/validate.middleware.ts`
```ts
export const validate = (schema: ZodSchema, source: 'body'|'query'|'params' = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(ApiError.badRequest('Validation failed', result.error.flatten()));
    (req as any)[source] = result.data;
    next();
  };
```

### Swagger (`auth.swagger.ts`)
- JSDoc on each route, `tags: [Auth]`, `security: [{ bearerAuth: [] }]` where required.
- Schemas in `components/schemas`: `LoginRequest`, `TokenResponse`, `User`, `Error`.

---

## Customer module

### `customer.model.ts`
```ts
const identityDocumentSchema = new Schema({
  type: { type: String, enum: ['CCCD', 'DRIVER_LICENSE', 'PASSPORT'], required: true },
  number: { type: String, required: true, trim: true, maxlength: 50 },
  issueDate: { type: Date, required: true },
  issuePlace: { type: String, required: true, trim: true, maxlength: 200 },
}, { _id: true });

const customerSchema = new Schema<ICustomer>({
  fullName: { type: String, required: true, trim: true, maxlength: 200, index: 'text' },
  dateOfBirth: { type: Date, required: true },
  address: { type: String, required: true, trim: true, maxlength: 500 },
  phone: { type: String, required: true, trim: true, maxlength: 30, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  nationality: { type: String, required: true, trim: true, maxlength: 100 },
  occupation: { type: String, required: true, trim: true, maxlength: 200 },
  identityDocuments: {
    type: [identityDocumentSchema],
    default: [],
    validate: {
      validator: (docs: IIdentityDocument[]) =>
        new Set(docs.map(d => d.type)).size === docs.length,
      message: 'Each identity document type can appear at most once per customer',
    },
  },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Compound text index for search across multiple fields
customerSchema.index({ fullName: 'text', email: 'text', phone: 'text', nationality: 'text', occupation: 'text' });
customerSchema.index({ createdAt: -1 });
```

> **Why compound index vs unique compound:** uniqueness for (customer, type) is enforced by the `validate` on the array and by service-level pre-check; a multi-key unique index in Mongo would require creating synthetic top-level fields. The validator + service check is sufficient and simpler.

### `customer.schema.ts` (zod) — single source of truth
```ts
const identityDocumentSchema = z.object({
  type: z.enum(['CCCD', 'DRIVER_LICENSE', 'PASSPORT']),
  number: z.string().min(1).max(50),
  issueDate: z.coerce.date(),
  issuePlace: z.string().min(1).max(200),
});

export const createCustomerSchema = z.object({
  fullName: z.string().min(1).max(200).trim(),
  dateOfBirth: z.coerce.date().refine(d => d < new Date(), 'Date of birth must be in the past'),
  address: z.string().min(1).max(500).trim(),
  phone: z.string().min(6).max(30).trim(),
  email: z.string().email().toLowerCase().trim(),
  gender: z.enum(['male', 'female', 'other']),
  nationality: z.string().min(1).max(100).trim(),
  occupation: z.string().min(1).max(200).trim(),
  identityDocuments: z.array(identityDocumentSchema)
    .max(10)
    .superRefine((arr, ctx) => {
      const seen = new Set<string>();
      arr.forEach((d, i) => {
        if (seen.has(d.type)) ctx.addIssue({ code: 'custom', path: [i, 'type'], message: `Duplicate type ${d.type}` });
        seen.add(d.type);
      });
    }),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'dateOfBirth', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id') });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery  = z.infer<typeof listCustomersQuerySchema>;
```

### `customer.repository.ts`
Pure DB functions, no business logic:
- `create(data, userId)`, `findById(id)`, `findByIdActive(id)`, `update(id, data)`, `softDelete(id)`.
- `findMany({ page, limit, search, sortBy, order })`:
  - If `search` present → use `$text: { $search: search }`.
  - Else empty filter.
  - Always `isDeleted: false`.
  - `sort({ [sortBy]: order === 'asc' ? 1 : -1 })`, `skip`, `limit`.
  - Return `{ items, total }` (use `countDocuments` for total).

### `customer.service.ts`
- Wraps repository with business rules:
  - On create: check no other *active* customer with same `email` (case-insensitive) → `ApiError.conflict('Email already exists')`.
  - On create: also reject if any *active* customer already has a document with the same `type` and `number` (configurable — default off, document in code).
  - On update: same uniqueness check excluding self.
  - On delete: soft delete (`isDeleted = true`).
- Exposes:
  - `list(query) → { items, page, limit, total, totalPages }`.
  - `get(id) → customer`.
  - `create(input, userId) → customer`.
  - `update(id, input) → customer`.
  - `remove(id) → void`.

### `customer.controller.ts`
Thin HTTP layer:
- `list`: `req.query` validated → service.list → `ok({ items, pagination })`.
- `get`: `req.params.id` → service.get → `ok(customer)`.
- `create`: `req.body` validated → service.create → `ok(customer, undefined, 201)`.
- `update`: → `ok(customer)`.
- `remove`: → `204` no content.

### `customer.routes.ts`
```ts
const r = Router();
r.use(authenticate); // all customer routes protected

r.get('/',    validate(listCustomersQuerySchema, 'query'), asyncHandler(c.list));
r.get('/:id', validate(idParamSchema, 'params'),         asyncHandler(c.get));
r.post('/',   validate(createCustomerSchema, 'body'),     asyncHandler(c.create));
r.put('/:id', validate(idParamSchema, 'params'), validate(updateCustomerSchema, 'body'), asyncHandler(c.update));
r.delete('/:id', validate(idParamSchema, 'params'),     asyncHandler(c.remove));

export default r;
```

### `customer.dto.ts`
- `customerResponseDto(c)` → strips `__v`, `isDeleted`; renames `_id` to `id`; converts dates to ISO.
- `paginatedResponseDto({ items, page, limit, total })`.

### `customer.swagger.ts`
JSDoc for each endpoint with schemas `Customer`, `CreateCustomerRequest`, `UpdateCustomerRequest`, `CustomerListResponse`, etc.

---

## Mount routes in `app.ts`

```ts
import authRoutes from '@/modules/auth/auth.routes';
import customerRoutes from '@/modules/customers/customer.routes';

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
```

---

## Seed script (`src/seed/seed.ts`)

Run via `tsx src/seed/seed.ts`. Idempotent:
- Upsert admin user: `admin@example.com` / `Admin@123` (or read from env `SEED_EMAIL`/`SEED_PASSWORD`).
- Insert 25 sample customers (Vietnamese names, mixed identity docs, deterministic data).
- Use `upsert` keyed on `email` so re-runs don't duplicate.

Add to `package.json`:
```json
"scripts": { "seed": "tsx src/seed/seed.ts" }
```

---

## Tests

### `__tests__/auth.test.ts`
- Use `mongodb-memory-server` for isolation.
- Cases:
  - POST `/api/auth/login` with wrong password → 401.
  - POST `/api/auth/login` with correct creds → 200 with tokens.
  - GET `/api/auth/me` without token → 401; with token → 200.
  - POST `/api/auth/refresh` → 200 new pair; old refresh still works only once (rotation).

### `__tests__/customer.test.ts`
- After login, set `Authorization: Bearer …` in supertest agent.
- Cases:
  - POST create with valid body → 201, returns customer.
  - POST create with invalid email → 400 with field errors.
  - POST create with duplicate email → 409.
  - POST create with duplicate doc type in array → 400.
  - GET list → returns paginated items, search filter works.
  - GET by id → 200; non-existent → 404.
  - PUT update → 200; invalid id → 400.
  - DELETE → 204; subsequent GET → 404.

---

## API endpoint list (final)

| Method | Path                              | Auth | Body / Query                          | Response                |
|--------|-----------------------------------|------|---------------------------------------|-------------------------|
| POST   | /api/auth/login                   | -    | { email, password }                   | { accessToken, refreshToken, user } |
| POST   | /api/auth/refresh                 | -    | { refreshToken }                      | { accessToken, refreshToken } |
| POST   | /api/auth/logout                  | ✅   | { refreshToken }                      | 204                     |
| GET    | /api/auth/me                      | ✅   | -                                     | { user }                |
| GET    | /api/customers                    | ✅   | ?page&limit&search&sortBy&order      | { items, pagination }   |
| GET    | /api/customers/:id                | ✅   | -                                     | { customer }            |
| POST   | /api/customers                    | ✅   | CreateCustomerRequest                 | 201 { customer }        |
| PUT    | /api/customers/:id                | ✅   | UpdateCustomerRequest                 | { customer }            |
| DELETE | /api/customers/:id                | ✅   | -                                     | 204                     |
| GET    | /api/health                       | -    | -                                     | { status, uptime, ts }  |
| GET    | /api/docs                         | -    | -                                     | Swagger UI HTML         |

---

## Validation

- [ ] `npm run seed` populates DB; admin can log in.
- [ ] Swagger UI shows all 11 endpoints with schemas.
- [ ] All zod schemas reject invalid input with structured 400 errors.
- [ ] `npm test` green (auth + customer tests).
- [ ] `npm run typecheck` and `npm run lint` pass.
- [ ] Manual smoke test: log in → list → create → update → delete via curl/Postman.
- [ ] Rate limiter triggers on 101st request within window (test with a small limit override).

---

## Notes

- We store **hashed** refresh tokens in DB (using SHA-256 of the token) — compromise of DB doesn't leak valid tokens.
- `select: false` on `passwordHash` and `refreshTokens` — opt-in via `.select('+passwordHash')` when needed.
- Soft delete (`isDeleted`) so recruiters can't accidentally lose data during demo.
- Add a `lastLoginAt` on User for the demo (small touch).
