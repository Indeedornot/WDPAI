#!/bin/sh
set -eu

cd /app/backend

echo "[backend] waiting for database..."

# Try to boot the kernel and open a PDO connection.
# This uses the same env vars the app uses (DATABASE_URL or POSTGRES_*).
max_attempts="60"
attempt="1"
while [ "$attempt" -le "$max_attempts" ]; do
  if php -r "require_once '/app/backend/src/autoload.php'; \$k = App\\Bootstrap\\Bootstrap::kernel(); \$k->pdo();" >/dev/null 2>&1; then
    echo "[backend] database is reachable"
    break
  fi

  echo "[backend] db not ready ($attempt/$max_attempts), retrying..."
  attempt=$((attempt + 1))
  sleep 1

done

if [ "$attempt" -gt "$max_attempts" ]; then
  echo "[backend] database did not become ready in time" >&2
  exit 1
fi

echo "[backend] running migrations..."
php bin/migrate.php

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[backend] seeding sample data..."
  php bin/seed.php
fi

echo "[backend] starting PHP server on :8080"
exec php -S 0.0.0.0:8080 -t public
