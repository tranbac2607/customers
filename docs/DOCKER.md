# Docker

A multi-stage Dockerfile is provided at `back-end/Dockerfile`.

## Build

```bash
cd back-end
docker build -t customers-api .
```

## Run

```bash
docker run --rm -p 4000:4000 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/customers" \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e CORS_ORIGIN="https://your-frontend.vercel.app" \
  customers-api
```

## Image size
~150 MB (Alpine + production deps only).

## Why Docker

- Runs identically on Railway, Render, Fly.io, AWS, GCP, on-prem.
- No "works on my machine" issues.
- Health check built-in (`/api/health`).
- Non-root user for security.
