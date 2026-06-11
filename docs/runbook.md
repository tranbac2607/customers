# Runbook

Day-to-day operations for the customer management app.

## Local dev

```bash
# 1. Install
npm install

# 2. Start BE (in-memory Mongo — no Atlas needed)
cd back-end
npm run dev:memory        # → http://localhost:4000

# 3. Start FE (separate terminal)
cd front-end
npm run dev               # → http://localhost:3000
```

The in-memory Mongo is auto-seeded with:
- 1 admin: `admin@example.com` / `Admin@123`

The FE `.env.example` defaults to `http://localhost:4000/api` so the two will work together out of the box.

## Connecting to a real MongoDB

```bash
cd back-end
cp .env.example .env
# Edit .env: set MONGODB_URI to your Atlas / local Mongo URI
# Generate JWT secrets:
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
# Edit .env to paste them

# Run the seed (admin + 20 sample customers)
npm run seed
```

## Running tests

```bash
# Backend only
npm --workspace back-end run test

# All (BE tests + FE typecheck)
npm run typecheck
npm run lint
```

## Useful curl recipes

```bash
# Health
curl http://localhost:4000/api/health

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# List customers (replace TOKEN)
curl http://localhost:4000/api/customers?page=1&limit=10 \
  -H "Authorization: Bearer TOKEN"

# Create a customer
curl -X POST http://localhost:4000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "fullName":"Test User",
    "dateOfBirth":"1990-01-01",
    "address":"123 Test St",
    "phone":"+84 901 000 000",
    "email":"test.user@example.com",
    "gender":"male",
    "nationality":"Vietnamese",
    "occupation":"Tester",
    "identityDocuments":[
      {"type":"CCCD","number":"123","issueDate":"2020-01-01","issuePlace":"HCMC"}
    ]
  }'
```

## Logs

- **Dev console:** winston outputs colorized logs to stdout.
- **Daily rotated file:** `back-end/logs/app-YYYY-MM-DD.log` (14 days retention, 20 MB max per file, gzipped).
- **Production:** check Railway's logs tab.

## Common issues

### Port 4000 already in use
Kill the process: `lsof -ti:4000 | xargs kill -9`

### MongoDB connection refused (dev)
- Did you start with `npm run dev:memory` (uses in-memory) or set `MONGODB_URI` for real Mongo?
- For real Mongo: ensure the URI is correct, IP is whitelisted (`0.0.0.0/0` for Atlas), and the DB user is created.

### CORS error in browser
- `CORS_ORIGIN` env on Railway must exactly match the FE origin (no trailing slash).
- For Vercel preview URLs, add them to the comma-separated list.

### "Refresh token reuse detected"
- Means the access token was used after the user signed out elsewhere, or someone tried to use an old refresh token.
- The user is logged out everywhere and must sign in again — this is by design.

### Frontend "redux-persist failed to create sync storage"
- This warning is shown on the server (SSR). The store falls back to a no-op storage, and on the client it switches to `localStorage`. This is expected and not a bug.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for the full Atlas + Railway + Vercel guide.

## Rollback

- **Railway:** Deployments tab → click previous successful deploy → **Rollback**.
- **Vercel:** Deployments tab → **Promote to Production** on a previous deployment.
- **MongoDB Atlas:** M0 has no snapshots. Re-run the seed script to repopulate.

## Data migration

There are no formal migrations. Mongoose `autoIndex` creates indexes on startup (in non-production). For schema changes:

1. Add new fields with defaults.
2. Deploy.
3. Run a one-off script to backfill old records.
4. Remove defaults once data is consistent.
