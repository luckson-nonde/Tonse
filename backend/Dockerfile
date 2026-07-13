# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# TONSE backend (NestJS) — multi-stage build
# ---------------------------------------------------------------------------

# ---- Stage 1: build (needs devDependencies: nest CLI + typescript) ----
FROM node:20-alpine AS build
WORKDIR /app

# Install ALL deps (incl. dev) for the compile step.
# NOTE: this repo's backend/package-lock.json is out of sync with package.json
# (missing webpack toolchain entries), so `npm ci` (strict) fails. Using
# `npm install` tolerates the drift. To restore reproducible `npm ci` builds,
# run `npm install` in ./backend once to refresh the lock file, then switch
# these two RUN lines back to `npm ci` / `npm ci --omit=dev`.
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Compile TypeScript -> dist/ (nest-cli copies **/*.json assets, e.g. catalog.json).
COPY . .
RUN npm run build

# ---- Stage 2: runtime (production deps only, slim) ----
FROM node:20-alpine AS production
WORKDIR /app

# Production dependencies only. `sharp` and `pg` ship prebuilt binaries; if a
# future base image lacks them, add:  RUN apk add --no-cache vips
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Compiled app + a writable uploads dir (main.ts serves ../public statically,
# multer writes to public/uploads).
COPY --from=build /app/dist ./dist
RUN mkdir -p public/uploads

EXPOSE 3001

# Public, unauthenticated endpoint — good liveness probe.
HEALTHCHECK --interval=15s --timeout=5s --retries=10 --start-period=40s \
  CMD node -e "require('http').get('http://127.0.0.1:3001/categories/status',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
