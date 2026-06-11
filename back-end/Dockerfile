# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (cached separately for faster builds)
COPY package*.json ./
COPY back-end/package*.json ./back-end/
COPY front-end/package*.json ./front-end/
RUN npm install --no-audit --no-fund --workspaces=false

# Build backend
COPY back-end ./back-end
WORKDIR /app/back-end
RUN npm install --no-audit --no-fund && npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy built backend
COPY --from=builder /app/back-end/dist ./dist
COPY --from=builder /app/back-end/package.json ./
COPY --from=builder /app/back-end/node_modules ./node_modules

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Health check (requires wget in alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

CMD ["node", "dist/server.js"]
