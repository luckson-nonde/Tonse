# Running ProQuote in Docker

A single `docker compose up` runs the whole platform: the React frontend
(nginx), the NestJS backend, and PostgreSQL. The browser only ever talks to
the frontend origin (`:3000`); nginx reverse-proxies `/api` and `/uploads` to
the backend, so there is no CORS to configure.

```
frontend (nginx :3000)  ──/api, /uploads──►  backend (NestJS :3001)  ──►  postgres :5432
```

## Prerequisites

- Docker Desktop (Compose v2). That's it — Node/Postgres are inside the images.

## Quick start

```bash
docker compose up -d --build        # build images + start (first run ~2–4 min)
```

Then open **http://localhost:3000**.

- Categories are seeded automatically on backend boot (94 rows).
- Create an account via the UI, **or** seed the admin login:

```bash
docker compose exec backend node dist/database/seeds/seed.js
# → admin: lucksoncnonde@gmail.com / cluckson19947  (change for real use)
```

## Services & ports

| Service   | Container       | Host port | Notes                                   |
|-----------|-----------------|-----------|-----------------------------------------|
| frontend  | tonse_frontend  | 3000 → 80 | nginx: SPA + `/api` & `/uploads` proxy  |
| backend   | tonse_backend   | 3001      | NestJS; health = `GET /categories/status` |
| postgres  | tonse_postgres  | 5432      | data in the `postgres_data` volume      |
| pgadmin   | tonse_pgadmin   | 5050      | **optional**, see below                 |

Optional DB admin UI (kept out of the default `up` — it's a large image):

```bash
docker compose --profile tools up -d          # also starts pgAdmin on :5050
# In pgAdmin, connect to host "postgres", port 5432, user tonse_user.
```

## Configuration / secrets

All backend config is passed as environment in `docker-compose.yml`. **Change
every `change_me` / placeholder before any real deployment:** `JWT_SECRET`,
`JWT_REFRESH_SECRET`, `ENCRYPTION_KEY` (32 chars), `ENCRYPTION_IV` (16 chars),
and the Postgres password (in both the `postgres` and `backend` services).

The frontend's API base URL is baked at **build time** via the `VITE_API_URL`
build arg (default `/api`). Change it in the `frontend.build.args` block and
rebuild if you serve the API elsewhere.

## Common commands

```bash
docker compose ps                   # status + health
docker compose logs -f backend      # tail backend logs
docker compose restart backend      # restart one service
docker compose up -d --build backend  # rebuild + restart after a code change
docker compose down                 # stop (keeps data volumes)
docker compose down -v              # stop + delete the DB/upload volumes (full reset)
```

## Design notes (why the config looks the way it does)

- **`DB_SYNCHRONIZE=true` is required.** This app has no migrations for the
  profile tables — TypeORM `synchronize` creates the schema on boot. Fine for
  dev/demo; for production you'd introduce migrations and turn this off.
- **`NODE_ENV` is not `production`.** `database.config.ts` forces DB SSL when
  `NODE_ENV=production`, but the bundled Postgres has no TLS. Set it to
  `production` only when pointing at a managed Postgres that speaks SSL.
- **Postgres 15 vs 16.** The compose pins `postgres:16-alpine` (commonly
  cached, avoids a slow pull); the app is DB-version-agnostic, so `15-alpine`
  works too — but don't reuse a `postgres_data` volume across major versions.
- **Backend `npm install` (not `npm ci`).** `backend/package-lock.json` is out
  of sync with `package.json` upstream; the Dockerfile uses `npm install` to
  tolerate it. Refresh the lock (`cd backend && npm install`) to restore
  reproducible `npm ci` builds.
