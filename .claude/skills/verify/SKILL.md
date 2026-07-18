---
name: verify
description: >-
  Build/launch/drive recipe for runtime-verifying a change to Tonse Hub
  (React frontend + NestJS backend + Postgres). Use before declaring any
  non-trivial backend or full-stack change done. Covers the port-collision
  gotcha with pre-existing dev servers, the auth-route throttle, the response
  envelope shape, and how to do direct DB verification without psql.
---

# Verifying a Tonse Hub change end-to-end

## Gotcha: a backend and/or frontend dev server may already be running

This repo's dev workflow often leaves a backend on **:3001** and/or a
frontend on **:3000** already running (either the user's own terminal or a
previous session) — **do not assume a server you start is the one serving
those ports.**

- Check first: `netstat -ano | grep LISTENING` for 3001/3000, then
  `Get-CimInstance Win32_Process -Filter "ProcessId=<pid>"` (PowerShell) to
  see the real command line.
- A backend running from `node backend/dist/main` (a **compiled** build, not
  `nest start --watch`) is running whatever was last `npm run build`'d —
  **not** your current source edits. Do not trust requests against it as
  evidence for new source changes.
- Don't kill a pre-existing process you didn't start — it may be the user's
  own session (this project's users often run parallel sessions). Instead,
  start your own instance on a scratch port:
  `cd backend && PORT=3099 npm run start:dev` (background it). Vite auto-
  picks the next free port itself if 3000 is taken — check its "Local:" log
  line for the real port rather than assuming 3000.
- `nest start --watch` fully re-initializes Nest (all modules, DI, routes)
  even when the final `app.listen()` fails on `EADDRINUSE` — that's actually
  useful signal: "Found 0 errors" + all your new routes logged under
  `RouterExplorer` proves your module wiring is correct even before you get
  a port to bind to.

## Postgres is usually already running locally

`netstat -ano | grep 5432` — if something's LISTENING, use it; check
`backend/.env` for `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME`. No
`psql` CLI in this environment — for direct DB checks use Node + the `pg`
package already vendored in `backend/node_modules` (see script pattern
below). Load secrets via `require('dotenv').config({path: 'backend/.env'})`
inside the script rather than echoing them through shell commands.

## Auth endpoints are rate-limited

`backend/src/modules/auth/auth.controller.ts` applies
`@Throttle({ default: { limit: 5, ttl: 60000 } })` to register/login/
check-email/forgot-password/reset-password. A verification script that
registers several test users + logs in will hit **429 Too Many Requests**
if re-run repeatedly within ~60s of a prior run. A 429 (or a mysterious
**401** on a later authenticated call because a throttled registration
never returned a token) is very likely this, not a real bug — wait out the
window (poll `GET /auth/check-email?email=x` until it stops returning 429)
before concluding anything.

## Every response is wrapped in an envelope

A global interceptor wraps every JSON response as
`{statusCode, message, data}` on success. Error responses (4xx/5xx) are
**not** wrapped this way — they're the raw Nest exception body
(`{statusCode, message, ...}` with no `data` key). The frontend's
`apiClient` (`src/services/api/client.ts`) already unwraps `.data` for
callers — when driving the API directly (curl/fetch), unwrap it yourself:
`const json = raw && 'data' in raw ? raw.data : raw;` so success and error
shapes both read naturally off the same `.json`/`.message` fields.

## Minimal HTTP+DB verification script pattern

```js
// node script.cjs — drives the real running server, then double-checks
// persisted state directly in Postgres as an independent oracle.
const BACKEND_DIR = 'c:/.../Tonse-hub/backend';
require(`${BACKEND_DIR}/node_modules/dotenv`).config({ path: `${BACKEND_DIR}/.env` });
const { Client } = require(`${BACKEND_DIR}/node_modules/pg`);

async function api(method, path, body, token) {
  const res = await fetch(`http://localhost:3099${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.json().catch(() => null);
  const json = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
  return { status: res.status, json, raw };
}

async function dbQuery(sql, params) {
  const client = new Client({ host: 'localhost', port: 5432, user: 'tonse_user', password: process.env.DB_PASSWORD, database: 'tonse_db' });
  await client.connect();
  try { return (await client.query(sql, params)).rows; } finally { await client.end(); }
}
```

Registration needs unique `email`/`phone`/`nrc` per run — derive from
`Date.now()` (never `Math.random()`/bare timestamps inside a Workflow
script, but fine in a standalone Bash-invoked script like this one).
`nrcNumber` and `phone` are both unique-indexed on `users`; a collision
500s/409s the register call and silently breaks everything downstream that
assumed it succeeded — always assert `r.status` before extracting a token.

## Admin login

`backend/.env` has `ADMIN_EMAIL`/`ADMIN_PASSWORD` for a seeded primary
admin — `POST /auth/login` with those credentials for anything requiring
`@Roles('ADMIN')` (verification queue, suspend/verify/reject, etc.).

## No browser/screenshot tool in this environment

There is no Playwright/Computer-use tool available here. Frontend UI
changes (new components, visual wiring) can be verified for
correctness-of-wiring via:
1. `npm run lint` (`tsc --noEmit` + `tsx scripts/verifyArchetypes.ts`) —
   catches type/prop-mismatch errors between components.
2. `npx vite build` — eagerly bundles the whole module graph from the
   entry point, catching transform/import errors `tsc` alone can miss.

Neither proves the UI *renders correctly* or that a click handler *feels*
right — say so explicitly rather than claiming a full UI verification. If a
browser automation tool becomes available in a future session, prefer it
for anything touching visual layout or interaction feel.
