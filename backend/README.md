PHP backend (PDO + PostgreSQL)

What this provides
- `GET /health` -> simple status check
- `POST /auth/register` -> create a player account (returns bearer token)
- `POST /auth/login` -> log in (returns bearer token)
- `POST /auth/logout` -> revoke current token
- `GET /me` -> return current user info
- `GET /save?slot=...` -> load latest saved snapshot for a slot
- `POST /save` -> upsert snapshot for a slot
- `DELETE /save?slot=...` -> delete a slot
- `POST /runs` -> record run stats (uses an explicit SERIALIZABLE transaction)
- A tiny migration runner to create the required tables

Routing style
- Endpoints are configured in a single mapping file, similar to C# Minimal APIs:
  - See `backend/src/routes.php` (`App\\Routes\\map_endpoints(App $app)`)

Requirements
- PHP 8.3+
- PHP extensions: `pdo`, `pdo_pgsql`
- PostgreSQL 16+

Configuration
- Copy `.env.example` to `.env` and fill in `DATABASE_URL` (preferred) or `POSTGRES_*` variables.

Run migrations
- From `backend/` run: `php bin/migrate.php`

Run locally
- From `backend/` run: `php -S localhost:8080 -t public`
- Then hit `http://localhost:8080/health`

Tests
- Unit tests (PHPUnit): `composer install` then `composer test`
- Integration smoke test (curl): from repo root: `BASE_URL=http://localhost:8081 ./backend/bin/integration-smoke.sh`

API

Failure IDs (server errors)
- Unexpected 500 responses return a friendly message and a `failureId`.
- The server stores the full error details in the `api_failures` table keyed by that id.

Auth
- `POST /auth/register`
  - Body: `{ "email": "you@example.com", "password": "..." }`
  - 200: `{ "ok": true, "token": "...", "user": { "id": 1, "email": "...", "role": "player" } }`
  - 409: `{ "ok": false, "error": "email_taken" }`

- `POST /auth/login`
  - Body: `{ "email": "you@example.com", "password": "..." }`
  - 200: `{ "ok": true, "token": "...", "user": { ... } }`
  - 401: `{ "ok": false, "error": "invalid_credentials" }`
  - 403: `{ "ok": false, "error": "banned" }`

- `GET /me`
  - Requires: `Authorization: Bearer <token>`

Saves (per player)
- All `/save*` endpoints now require `Authorization: Bearer <token>` and are scoped to the authenticated user.

Admin auditing (future-facing)
- Users have a `role` (`player` or `admin`). Two basic admin-only read endpoints exist:
  - `GET /admin/users`
  - `GET /admin/saves?userId=...`
  - `GET /admin/runs?userId=...`
  - Admins can ban/unban users:
    - `POST /admin/ban` body: `{ "userId": 123, "banned": true, "reason": "optional" }`

- `GET /save?slot=my-ts-app:save:slot1`
  - 200: `{ "ok": true, "slot": "...", "snapshot": { ... }, "updatedAt": "..." }`
  - 401: `{ "ok": false, "error": "unauthorized" }`
  - 404: `{ "ok": false, "error": "not_found" }`

- `POST /save`
  - Body: `{ "slot": "my-ts-app:save:slot1", "snapshot": { ... } }`
  - 200: `{ "ok": true }`

- `DELETE /save?slot=my-ts-app:save:slot1`
  - 200: `{ "ok": true }`

Notes
- This is framework-free and intentionally small so you can plug your own DB/deploy setup later.
- If you deploy behind a reverse proxy with a base path (e.g. `/api`), set `BASE_PATH=/api`.
