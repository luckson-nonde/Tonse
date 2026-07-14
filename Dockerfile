# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# TONSE frontend (React + Vite) — build, then serve static via nginx.
# nginx also reverse-proxies /api and /uploads to the backend so the browser
# only ever talks to one origin (no CORS), mirroring the Vite dev proxy.
# ---------------------------------------------------------------------------

# ---- Stage 1: build the static bundle ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Baked into the bundle at build time (client.ts reads import.meta.env.VITE_API_URL).
# "/api" keeps calls same-origin so nginx can forward them to the backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
