#!/bin/sh
# Integration smoke test: exercises auth (CSRF + cookie session), a run
# (transaction + relations) and role-based authorization, end to end.
set -eu

BASE_URL="${BASE_URL:-http://localhost:8081}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

email="smoke+$(date +%s)@example.com"
pass="password123"

json_field() { python3 -c "import json,sys; print(json.load(sys.stdin).get('$1',''))"; }
is_ok() { python3 -c "import json,sys; print('1' if json.load(sys.stdin).get('ok') is True else '')"; }
# Auth endpoints return a session DTO (no {ok:true} envelope); assert on user.id.
has_user() { python3 -c "import json,sys; print('1' if json.load(sys.stdin).get('user',{}).get('id') else '')"; }

echo "[smoke] csrf"
csrf=$(curl -sS -c "$JAR" "$BASE_URL/auth/csrf" | json_field csrfToken)
if [ -z "$csrf" ]; then echo "[smoke] ERROR: no csrf token" >&2; exit 1; fi

echo "[smoke] register: $email"
register_json=$(curl -sS -b "$JAR" -c "$JAR" -X POST "$BASE_URL/auth/register" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf" \
  --data "{\"email\":\"$email\",\"password\":\"$pass\"}")
if [ -z "$(printf '%s' "$register_json" | has_user)" ]; then
  echo "[smoke] ERROR: register failed" >&2; echo "$register_json" >&2; exit 1
fi

echo "[smoke] /me (cookie session)"
me_json=$(curl -sS -b "$JAR" "$BASE_URL/me")
if [ -z "$(printf '%s' "$me_json" | is_ok)" ]; then
  echo "[smoke] ERROR: /me failed" >&2; echo "$me_json" >&2; exit 1
fi

echo "[smoke] /runs (transaction + relations + awards)"
runs_json=$(curl -sS -b "$JAR" -c "$JAR" -X POST "$BASE_URL/runs" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $csrf" \
  --data '{"timeSeconds": 12, "level": 2, "xp": 1500, "kills": 12, "shotsFired": 20, "shotsHit": 7}')
if [ -z "$(printf '%s' "$runs_json" | is_ok)" ]; then
  echo "[smoke] ERROR: /runs failed" >&2; echo "$runs_json" >&2; exit 1
fi

echo "[smoke] /me/achievements (N:M read; expect awards from the run)"
ach_json=$(curl -sS -b "$JAR" "$BASE_URL/me/achievements")
if [ -z "$(printf '%s' "$ach_json" | is_ok)" ]; then
  echo "[smoke] ERROR: /me/achievements failed" >&2; echo "$ach_json" >&2; exit 1
fi

echo "[smoke] /runs/leaderboard (JOIN read)"
lb_json=$(curl -sS -b "$JAR" "$BASE_URL/runs/leaderboard")
if [ -z "$(printf '%s' "$lb_json" | is_ok)" ]; then
  echo "[smoke] ERROR: /runs/leaderboard failed" >&2; echo "$lb_json" >&2; exit 1
fi

echo "[smoke] /admin/users should be forbidden for a player (403)"
code=$(curl -sS -b "$JAR" -o /dev/null -w "%{http_code}" "$BASE_URL/admin/users")
if [ "$code" != "403" ]; then
  echo "[smoke] ERROR: expected 403, got $code" >&2; exit 1
fi

echo "[smoke] unauthenticated /me should be 401"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE_URL/me")
if [ "$code" != "401" ]; then
  echo "[smoke] ERROR: expected 401, got $code" >&2; exit 1
fi

echo "[smoke] OK"
