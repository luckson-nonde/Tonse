# Nyuwe

Zambian B2B/B2C marketplace: buyers post inquiries, sellers and service providers answer with quotes, verified payment funds escrow, and goods change hands against a collection code — plus a labour job board, event ticketing, shop subscriptions, seller advertising (banners + Spotlight pop-ups), financing, and a double-entry ledger with real mobile-money/card payments (DPO).

**Start here → [SYSTEM_DOCUMENTATION.md](SYSTEM_DOCUMENTATION.md)** — the master, current-state document: architecture, every money flow, deployment, environment variables, and the gotchas. Where any other `*.md` in this repo disagrees with it, the system documentation wins.

## Quick start (local)

```bash
# 1. Postgres (root .env needs DB_PASSWORD and PII_ENCRYPTION_KEY)
docker compose up -d postgres

# 2. Backend — NestJS on :3001 (dev uses DB_SYNCHRONIZE=true; see backend/.env.example)
cd backend && npm install && npm run start:dev

# 3. Frontend — Vite on :3000
npm install && npm run dev
```

Payments default to the built-in **sandbox** provider locally (no keys needed — every flow has an in-app "Simulate approval" button). Set `PAYMENT_PROVIDER=dpo` + the `DPO_*` variables for real collections.

## Stack

React 18 + Vite + Tailwind (schema-driven dashboards, PWA) · NestJS + TypeORM + PostgreSQL · DPO payments behind a swappable provider · filesystem or DigitalOcean Spaces storage behind a swappable driver · deployed on DigitalOcean App Platform (migrations run on boot).
