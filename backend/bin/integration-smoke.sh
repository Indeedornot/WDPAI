#!/bin/sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:8081}"

email="smoke+$(date +%s)@example.com"
pass="password123"

echo "[smoke] register: $email"
register_json=$(curl -sS -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"$email\",\"password\":\"$pass\"}")

token=$(printf '%s' "$register_json" | python3 -c 'import json,sys; j=json.load(sys.stdin); print(j.get("token",""))')
if [ -z "$token" ]; then
  echo "[smoke] ERROR: missing token" >&2
  echo "$register_json" >&2
  exit 1
fi

echo "[smoke] /me"
me_json=$(curl -sS "$BASE_URL/me" -H "Authorization: Bearer $token")
ok=$(printf '%s' "$me_json" | python3 -c 'import json,sys; j=json.load(sys.stdin); print("1" if j.get("ok") is True else "")')
if [ -z "$ok" ]; then
  echo "[smoke] ERROR: /me failed" >&2
  echo "$me_json" >&2
  exit 1
fi

echo "[smoke] /runs (transaction + relations)"
runs_json=$(curl -sS -X POST "$BASE_URL/runs" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  --data '{"timeSeconds": 12, "level": 2, "xp": 1500, "kills": 12, "shotsFired": 20, "shotsHit": 7}')

ok=$(printf '%s' "$runs_json" | python3 -c 'import json,sys; j=json.load(sys.stdin); print("1" if j.get("ok") is True else "")')
if [ -z "$ok" ]; then
  echo "[smoke] ERROR: /runs failed" >&2
  echo "$runs_json" >&2
  exit 1
fi

echo "[smoke] /admin/users should be forbidden for player"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/admin/users" -H "Authorization: Bearer $token")
if [ "$code" != "403" ]; then
  echo "[smoke] ERROR: expected 403, got $code" >&2
  exit 1
fi

echo "[smoke] OK"
