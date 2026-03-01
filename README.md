# my-ts-app

## Run with Docker

Prereqs:
- Docker + Docker Compose v2

Start:
- `docker compose up -d --build`

Open:
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8081/health`

Stop:
- `docker compose down`

Reset DB data:
- `docker compose down -v`

## Backend tests

- Unit tests (PHPUnit): `docker compose exec -T backend composer install` then `docker compose exec -T backend composer test`
- Integration smoke test (curl): `BASE_URL=http://localhost:8081 ./backend/bin/integration-smoke.sh`

## Notes

- The backend is published on host port `8081` (mapped to container `8080`) to avoid common port conflicts. If you prefer `8080`, change the `ports:` mapping in `docker-compose.yml` and update `frontend.environment.VITE_BACKEND_URL` accordingly.
