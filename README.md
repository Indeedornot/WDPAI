# WDPAI — Arcade Survival Game

A full-stack web application built for the *Wstęp do Projektowania Aplikacji
Internetowych* course. It is a canvas-based arcade survival game (custom
TypeScript ECS engine) backed by a framework-free, object-oriented PHP 8.3 API
and a PostgreSQL 16 database — all runnable with a single `docker compose up`.

- **Frontend:** TypeScript + Vite, HTML5 Canvas, Fetch API (no UI framework).
- **Backend:** PHP 8.3, custom micro-framework (router, DI container, attribute
  middleware) — no Symfony/Laravel.
- **Database:** PostgreSQL 16 (relations, views, function, trigger, transaction).

---

## 1. Architecture

Layered **frontend ↔ backend (REST) ↔ database** architecture.

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (SPA)                                                  │
│   Canvas ECS engine (Scene, GameLoop, Components, Physics)     │
│   App layer: Auth, Save, Runs, Admin, UI panels, Logger        │
│        │  Fetch API (JSON, cookie session + CSRF double-submit) │
└────────┼─────────────────────────────────────────────────────┘
         │  http
┌────────▼─────────────────────────────────────────────────────┐
│ PHP API (public/index.php)                                     │
│   App (CORS + CSRF + global error handling)                    │
│   Router  ──#[RequireAuth]──▶ Controllers                      │
│   DI container (#[Injectable]) ──▶ Services / Repositories      │
│        │  PDO (prepared statements, QueryBuilder allowlist)     │
└────────┼─────────────────────────────────────────────────────┘
         │  pgsql
┌────────▼─────────────────────────────────────────────────────┐
│ PostgreSQL  — tables, 2 views, 1 function, trigger, txn        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Quick start

Prerequisites: Docker + Docker Compose v2.

```bash
cd my-ts-app
docker compose up -d --build
```

- Frontend (game):   http://localhost:5173
- Backend health:    http://localhost:8081/health
- Stop:              `docker compose down`
- Reset DB volume:   `docker compose down -v`

The backend seeds idempotent **sample data** on startup (`SEED_ON_START=true`
in `docker-compose.yml`). Sample logins:

| Email               | Password      | Role   |
| ------------------- | ------------- | ------ |
| `admin@example.com` | `admin12345`  | admin  |
| `nova@example.com`  | `player12345` | player |
| `orbit@example.com` | `player12345` | player |

> Backend is published on host port **8081** (container 8080) to avoid
> conflicts. The frontend talks to it via `VITE_BACKEND_URL`.

---

## 3. Environment variables

See [`backend/.env.example`](backend/.env.example). Key variables:

| Variable        | Purpose                                              |
| --------------- | ---------------------------------------------------- |
| `DATABASE_URL`  | Postgres DSN (or use `POSTGRES_*`)                   |
| `CORS_ORIGINS`  | Comma-separated allowed origins                      |
| `REQUIRE_HTTPS` | Enforce HTTPS on `/auth/*` (default `false` for dev) |
| `BASE_PATH`     | Optional route prefix (e.g. `/api`)                  |
| `SEED_ON_START` | Load `db/seed.sql` after migrations                  |

`.env` files are git-ignored; only `.env.example` is committed.

---

## 4. Database

Schema is created by sequential migrations in
[`backend/migrations`](backend/migrations) (`001`–`008`), applied automatically
on startup. A complete dump (schema + sample data) is exported to
[`backend/db/export.sql`](backend/db/export.sql); the seed is
[`backend/db/seed.sql`](backend/db/seed.sql).

### ERD

```mermaid
erDiagram
  users ||--|| user_profiles : "1:1"
  users ||--o{ auth_tokens : "1:N"
  users ||--o{ player_saves : "1:N"
  users ||--o{ player_run_stats : "1:N"
  users ||--o{ user_achievements : "N:M"
  achievements ||--o{ user_achievements : "N:M"

  users {
    bigserial id PK
    varchar   email UK
    varchar   password_hash
    varchar   role "player|admin"
    timestamptz banned_at
  }
  user_profiles {
    bigint  user_id PK_FK
    varchar display_name
  }
  auth_tokens {
    bigserial id PK
    bigint    user_id FK
    char      token_hash UK
    timestamptz expires_at
    timestamptz revoked_at
  }
  player_saves {
    bigint  user_id PK_FK
    varchar slot PK
    jsonb   payload
  }
  player_run_stats {
    bigserial id PK
    bigint    user_id FK
    int       time_seconds
    int       kills
    int       shots_fired
    int       shots_hit
  }
  achievements {
    bigserial id PK
    varchar   code UK
    varchar   title
  }
  user_achievements {
    bigint user_id PK_FK
    bigint achievement_id PK_FK
  }
```

Standalone tables: `api_failures` (500 logging), `login_audit`,
`schema_migrations`. ERD source: [`docs/erd.mmd`](docs/erd.mmd).

### Required DB features (all used by application code)

| Feature               | Where                                                          |
| --------------------- | -------------------------------------------------------------- |
| 1:1 relation          | `users` ↔ `user_profiles` — read by leaderboard JOIN           |
| 1:N relation          | `users` → `player_saves` / `player_run_stats` / `auth_tokens`  |
| N:M relation          | `users` ↔ `achievements` via `user_achievements`               |
| View ×2               | `v_user_latest_run`, `v_user_save_summary` — used by `/admin/*` |
| Function              | `shots_accuracy(hit, fired)` — used inside `v_user_latest_run` |
| Trigger               | `set_updated_at()` on `player_saves` (BEFORE UPDATE)           |
| Transaction (SERIAL.) | `RunStatsRepository::recordRunWithAwards` (run + achievements)  |
| FK + JOIN actions     | `ON DELETE CASCADE` FKs; leaderboard / view JOINs              |

---

## 5. API endpoints

| Method          | Path                  | Auth      | Purpose                        |
| --------------- | --------------------- | --------- | ------------------------------ |
| GET             | `/health`             | —         | Health check                   |
| POST            | `/auth/register`      | CSRF      | Register + issue session       |
| POST            | `/auth/login`         | CSRF      | Login                          |
| GET             | `/auth/csrf`          | —         | Issue CSRF cookie+token        |
| GET             | `/auth/session`       | session   | Current session                |
| POST            | `/auth/refresh`       | session   | Rotate token                   |
| POST            | `/auth/logout`        | session   | Revoke token                   |
| GET             | `/me`                 | session   | Current user                   |
| GET             | `/me/achievements`    | session   | Earned achievements (N:M read) |
| POST            | `/runs`               | session   | Submit a run (txn + awards)    |
| GET             | `/runs/leaderboard`   | session   | Global leaderboard (JOIN)      |
| GET/POST/DELETE | `/save`               | session   | Player save CRUD               |
| GET             | `/admin/users`        | **admin** | Paginated users                |
| GET             | `/admin/latest-runs`  | **admin** | Uses `v_user_latest_run`       |
| GET             | `/admin/save-summary` | **admin** | Uses `v_user_save_summary`     |
| POST            | `/admin/ban`          | **admin** | Ban user + revoke tokens       |

Security: cookie sessions + Bearer fallback, CSRF double-submit on unsafe
methods, bcrypt password hashing, prepared statements + `QueryBuilder` operator
allowlist, origin-allowlisted CORS, global error handling (400/401/403/404/500;
500s logged to `api_failures` with a reference id).

---

## 6. Test scenario (manual)

1. **Register/login** — open http://localhost:5173, create an account or log in
   as `nova@example.com` / `player12345`.
2. **Play + persist** — play a run; the save autosaves to the backend (`/save`).
   Reload — the session restores (cookie session).
3. **Leaderboard + achievements** — die; the death screen loads the global
   leaderboard (`/runs/leaderboard`) and your achievements (`/me/achievements`).
4. **Roles / 403** — while logged in as a player, call an admin route:
   `curl -i http://localhost:8081/admin/users -H "Authorization: Bearer <token>"`
   → **403 Forbidden**. Unauthenticated → **401**.
5. **Admin panel** — log in as `admin@example.com` / `admin12345`, open the
   pause menu (Esc) → Admin: browse users, latest runs (view), save summary
   (view), and ban a user.
6. **404 / 500** — `curl -i http://localhost:8081/nope` → **404**; unexpected
   errors return **500** with a `failureId` recorded in `api_failures`.

---

## 7. Running tests

```bash
# Backend unit tests (PHPUnit)
docker compose exec -T backend composer test

# Backend integration smoke test (curl)
BASE_URL=http://localhost:8081 ./backend/bin/integration-smoke.sh

# Frontend type-check + unit tests
npm install && npm test
```

---

## 8. Screenshots

> Add captures here for the report (web + mobile). Place files in
> `docs/screenshots/` and reference them below.

| Web                                | Mobile                                |
| ---------------------------------- | ------------------------------------- |
| `docs/screenshots/web-welcome.png` | `docs/screenshots/mobile-welcome.png` |
| `docs/screenshots/web-game.png`    | `docs/screenshots/mobile-death.png`   |

---

## 9. Requirements checklist

| Requirement                             | Status | Notes                                |
| --------------------------------------- | :----: | ------------------------------------ |
| Docker (`docker compose up`)            |   ✅   | `docker-compose.yml`                 |
| Object-oriented PHP, no framework       |   ✅   | custom micro-framework               |
| PostgreSQL                              |   ✅   | postgres:16                          |
| HTML / CSS / JS (Fetch API)             |   ✅   | TS compiled, `HttpClient`            |
| Relations 1:1, 1:N, N:M                 |   ✅   | used in app code (§4)                |
| ≥2 views                                |   ✅   | used by `/admin/*`                   |
| ≥1 function                             |   ✅   | `shots_accuracy`                     |
| ≥1 trigger                              |   ✅   | `set_updated_at`                     |
| Transaction (isolation level)           |   ✅   | SERIALIZABLE on run submit           |
| SQL export with sample data             |   ✅   | `backend/db/export.sql`              |
| Login / session / logout                |   ✅   | cookie session + CSRF                |
| ≥2 roles + permission checks            |   ✅   | `player` / `admin`, `#[RequireAuth]` |
| Admin / user management                 |   ✅   | `/admin/*`, ban                      |
| Responsive design (media queries)       |   ✅   | `src/style.css` breakpoints          |
| Global error handling (400/403/404/500) |   ✅   | `App::handle`                        |
| Tests (PHPUnit + integration)           |   ✅   | `backend/tests`, smoke script        |
| Documentation (README, ERD)             |   ✅   | this file                            |
| Screenshots (web + mobile)              |   ⬜   | **add to `docs/screenshots/`**       |

---

## 10. Project structure

```
my-ts-app/
├── src/                 # TypeScript frontend (engine/ + app/)
├── backend/             # PHP 8.3 micro-framework
│   ├── src/App/         # Bootstrap, Routing, Controller, Auth, Save, Run, Db…
│   ├── migrations/      # 001–008 sequential SQL
│   ├── db/              # seed.sql + export.sql
│   ├── bin/             # migrate / seed / entrypoint / smoke test
│   └── tests/           # PHPUnit
├── docs/                # ERD source + screenshots
└── docker-compose.yml   # postgres + backend + frontend
```
