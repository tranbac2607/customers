# Phase 07 — Deployment

**Goal:** Ship the app live — MongoDB Atlas cluster, Railway backend, Vercel frontend, and a single environment-variables checklist so the demo URL works end-to-end.

---

## Working dir: `/Users/bac/Desktop/Dev/customers/`

---

## Overview of services

| Service       | Provider       | Plan      | Cost     | Region    |
|---------------|----------------|-----------|----------|-----------|
| Database      | MongoDB Atlas  | M0 Free   | $0       | free tier |
| Backend API   | Railway.app    | Free $5/mo| $0–$5    | us-east-1 |
| Frontend      | Vercel         | Hobby     | $0       | auto      |

---

## 1. MongoDB Atlas (free M0)

### Create cluster
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a project (e.g. `customer-management`).
3. **Build a cluster** → Shared (M0) → region closest to you (e.g. AWS `ap-southeast-1` for Vietnam).
4. Name it `customers-cluster`.
5. Wait ~3 min for provisioning.

### Configure access
6. **Database Access** → Add new database user:
   - Username: `customers_app` (or whatever)
   - Password: generate with `openssl rand -hex 24` — **save it somewhere safe** (1Password)
   - Role: `readWriteAnyDatabase` (or scoped: `readWrite` on `customers` db)
7. **Network Access** → Add IP Address → `0.0.0.0/0` (allow from anywhere — Railway's egress IPs rotate).
8. **Database** → Connect → Drivers → copy the connection string:
   ```
   mongodb+srv://customers_app:<password>@customers-cluster.xxxxx.mongodb.net/customers?retryWrites=true&w=majority
   ```
9. Replace `<password>` with the actual password and URL-encode special chars.

### Seed
- Local seed against Atlas: `MONGODB_URI=<atlas uri> npm run seed`
- Verify with Atlas UI → Browse Collections.

---

## 2. Railway (Backend)

### Project setup
1. Sign up at https://railway.app with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select the `customers` repo.
3. Railway detects `back-end/` automatically? **No** — set root to `back-end/`.

### Configure service
4. **Settings** → **Service** → **Root Directory**: `back-end`.
5. **Settings** → **Build Command**: `npm install && npm run build`.
6. **Settings** → **Start Command**: `npm start`.
7. **Settings** → **Watch Paths**: `back-end/**` (so FE pushes don't trigger backend rebuilds).

### Env vars (Railway → Variables tab)
```
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://customers-frontend.vercel.app   # we'll set after Vercel
MONGODB_URI=mongodb+srv://customers_app:<password>@customers-cluster.xxxxx.mongodb.net/customers?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

### Generate secrets
```bash
openssl rand -hex 32   # run twice → 2 secrets
```

### Networking
8. **Settings** → **Networking** → **Generate Domain** → copy the public URL:
   `https://customers-api.up.railway.app`
9. **Health check path**: `/api/health`.

### Seed production (optional)
- Option A: Run seed locally against Atlas URI (Atlas is the source of truth, Railway just talks to it).
- Option B: Add a one-off command in Railway: change start command temporarily to `npm run seed && npm start` for one deploy.

### Smoke test
```bash
curl https://customers-api.up.railway.app/api/health
curl -X POST https://customers-api.up.railway.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

---

## 3. Vercel (Frontend)

### Project setup
1. Sign up at https://vercel.com with GitHub.
2. **Add New Project** → import the `customers` repo.
3. **Root Directory**: `front-end` (edit before deploying).
4. **Framework Preset**: Next.js (auto-detected).

### Build & output settings
5. **Build Command**: `npm run build` (default).
6. **Output Directory**: `.next` (default).
7. **Install Command**: `npm install` (default).

### Env vars (Vercel → Settings → Environment Variables)
```
NEXT_PUBLIC_API_BASE_URL=https://customers-api.up.railway.app/api
NEXT_PUBLIC_APP_NAME=Customer Management
```
- Apply to **Production** (and Preview if you want).

### Deploy
8. Click **Deploy** → wait for build → copy the URL:
   `https://customers-frontend.vercel.app`

### Update CORS
9. Back in **Railway** → set `CORS_ORIGIN=https://customers-frontend.vercel.app` → redeploy (or wait for auto-redeploy).

### Domain (optional, polish)
10. Vercel → Settings → Domains → add custom domain (e.g. `customers.bac.dev`) and follow DNS instructions.

---

## 4. End-to-end smoke test (live URLs)

1. Open `https://customers-frontend.vercel.app` → login page renders.
2. Log in with seeded admin → redirect to `/customers`.
3. List loads, pagination works, search works.
4. Create a customer with one CCCD document → success.
5. Open detail → all fields present.
6. Edit → change email → save → list reflects change.
7. Delete → confirm → row gone.
8. Open DevTools → Network → confirm all calls go to `customers-api.up.railway.app/api/...` and `Authorization: Bearer …` header is present.
9. Refresh page in browser → still logged in (redux-persist + localStorage).
10. Logout → returned to login.

---

## 5. CI/CD notes

- Vercel and Railway both auto-deploy on push to `main`.
- Recommended branch strategy:
  - `main` → production
  - `feat/*` → Vercel preview URLs (free), Railway preview environments (paid, skip for now)
- For previews on Vercel, set `NEXT_PUBLIC_API_BASE_URL` to a stable preview or to production (simplest).

---

## 6. Post-deploy housekeeping

- [ ] Seed Atlas with at least 25 sample customers.
- [ ] Verify rate limiter doesn't lock you out (100 req/15min is generous).
- [ ] Monitor Railway logs for the first 24h.
- [ ] Set up UptimeRobot (free) pinging `/api/health` and the FE URL.
- [ ] Optional: add `helmet` `contentSecurityPolicy` once we know all origins.

---

## 7. Rollback plan

- **Railway**: Deployments tab → click previous successful deploy → "Rollback".
- **Vercel**: Deployments tab → "Promote to Production" on a previous deployment.
- **Atlas**: Snapshots are paid (M0 doesn't support). For M0, rely on seed script to re-populate if you wipe.

---

## Validation

- [ ] Health endpoint returns 200 from internet: `curl https://customers-api.up.railway.app/api/health`.
- [ ] Swagger UI loads: `https://customers-api.up.railway.app/api/docs`.
- [ ] Frontend URL loads and can authenticate.
- [ ] No CORS errors in browser console.
- [ ] All env vars are set in both Railway and Vercel.
- [ ] Secrets are **not** in the repo (search with `git grep` for `JWT_` / `MONGODB_URI`).

---

## Notes

- M0 Atlas is fine for the demo: 512 MB, 100 connections, no backups. Document this in the README so reviewers know it's not a production setup.
- Railway's free plan gives $5/month of usage — a small Express API easily fits.
- If you prefer not to use Atlas + Railway, alternatives: Render.com (free web service, sleeps after 15 min) + Atlas; or fly.io with a Tigris S3-compatible bucket (overkill for this).
- Add `helmet` CSP for production in a follow-up — for the demo, the default config is sufficient.
