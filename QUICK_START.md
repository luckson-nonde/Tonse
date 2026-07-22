# ⚡ Quick Start

> Get ProQuote Zambia running locally in ~5 minutes (plus `npm install` time). Verified against the actual codebase on 2026-07-02. This merges the former `QUICK_START.md` + `QUICK_START_SETUP.md`.

**Ports & conventions (important — older docs got these wrong):**
- **Backend API:** `http://localhost:3001` — routes are **unprefixed** (no `/api`). `main.ts` has no `setGlobalPrefix()`, so it's `/auth/login`, `/inquiries`, etc. (not `/api/auth/...`).
- **Frontend:** `http://localhost:3000` — the `dev` script is `vite --port=3000` (not 5173).
- **PgAdmin:** `http://localhost:5050`.
- **Schema creation:** tables are auto-created by TypeORM when `DB_SYNCHRONIZE=true`. There are **no migration files** (`backend/src/database/migrations/` is empty), so `npm run migration:run` is currently a no-op — you do **not** need it for local setup.
- **Env var names:** `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SYNCHRONIZE`, `DB_LOGGING` (not `DATABASE_*`).

---

## Prerequisites (1 min)
- [ ] Node.js 18+ (`node -v`)
- [ ] Docker + Docker Compose (`docker -v`)
- [ ] npm (`npm -v`)

## Step 1 — Start PostgreSQL (2 min)
```bash
# From the repo root
docker-compose up -d          # starts tonse_postgres + tonse_pgadmin
docker ps                     # verify both containers are "Up"
```

## Step 2 — Backend (`http://localhost:3001`)
```bash
cd backend
npm install
cp .env.example .env          # then edit if needed (see env reference below)

# Ensure DB_SYNCHRONIZE=true in .env for first run so tables auto-create.
# (No migration step needed — the migrations directory is empty.)

npm run seed                  # optional: creates the root ADMIN user
npm run start:dev             # ✅ "Application is running on http://localhost:3001"
```

## Step 3 — Frontend (`http://localhost:3000`)
```bash
# New terminal, from the repo root
npm install
npm run dev                   # ✅ VITE ready → http://localhost:3000
```

---

## Verify it works

```bash
# Register (note: NO /api prefix)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nrcNumber":"123456/78/9","name":"Test User","email":"test@tonse.local","phone":"+260970000000","password":"TestPass123!","role":"BUYER"}'

# Login → returns accessToken + refreshToken
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@tonse.local","password":"TestPass123!"}'

# Authenticated call
curl http://localhost:3001/inquiries -H "Authorization: Bearer <accessToken>"
```

Then open:
- **Frontend:** http://localhost:3000
- **PgAdmin:** http://localhost:5050 (creds in `docker-compose.yml`)

---

## Environment reference (`backend/.env`)

| Var | Local default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_USERNAME` | `tonse_user` | see `docker-compose.yml` |
| `DB_PASSWORD` | *(see docker-compose)* | change for non-local |
| `DB_NAME` | `tonse_db` | |
| `DB_SYNCHRONIZE` | `true` | **must be `true`** for first local run (auto-creates tables) |
| `DB_LOGGING` | `false` | set `true` to log SQL |
| `PORT` | `3001` | backend port (`main.ts` default) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | — | change before deploying |
| `ENCRYPTION_KEY` / `ENCRYPTION_IV` | — | used by `EncryptionService` (currently unused; see DATABASE_SCHEMA.md §5) |

Generate production secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT secrets
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"   # 32-char ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(8).toString('hex'))"    # 16-char ENCRYPTION_IV
```

---

## Key endpoints (unprefixed)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get tokens |
| POST | `/auth/refresh` | Renew access token |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Sign out |
| GET/POST | `/inquiries` | Buyer inquiries |
| GET/POST | `/quotes` | Provider quotes |
| GET/POST | `/orders` | Orders |
| GET/POST | `/payments` | Payments |

Full reference: [API_ENDPOINTS_COMPLETE.md](API_ENDPOINTS_COMPLETE.md).

---

## Troubleshooting

**Port already in use (3001 or 3000):**
```bash
lsof -i :3001   # or :3000
kill -9 <PID>
```

**PostgreSQL connection refused:**
```bash
docker-compose up -d
docker logs tonse_postgres   # check it's ready
```

**Token expired during testing:** call `POST /auth/refresh` with the refresh token.

**Inspect the database:**
```bash
docker exec -it tonse_postgres psql -U tonse_user -d tonse_db
\dt          # list tables
\q
```

**Reset local DB:** stop the stack, `docker-compose down -v` (drops the volume), then `docker-compose up -d` and restart the backend with `DB_SYNCHRONIZE=true` to recreate tables.

---

## Where to go next
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — canonical DB schema (tables, columns, indexes)
- [IDENTITY_AND_DISPLAY_IDS.md](IDENTITY_AND_DISPLAY_IDS.md) — NRC / UUID / display-ID model
- [API_ENDPOINTS_COMPLETE.md](API_ENDPOINTS_COMPLETE.md) — endpoint reference
- [FRONTEND_BACKEND_INTEGRATION.md](FRONTEND_BACKEND_INTEGRATION.md) — how the frontend talks to the API
- [backend/README.md](backend/README.md) — backend specifics

## Cleanup
```bash
# Ctrl+C the backend and frontend terminals, then:
docker-compose down          # add -v to also drop the database volume
```
