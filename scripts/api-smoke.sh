#!/usr/bin/env bash
set -euo pipefail

base=${BASE_URL:-http://localhost:8081}

echo "[1/5] health"
curl -fsS "$base/health" | python -c 'import json,sys; d=json.load(sys.stdin); assert d.get("ok") is True; print("ok")'

echo "[2/5] register"
resp=$(python - <<'PY'
import json, time, urllib.request
base = __import__('os').environ.get('BASE_URL','http://localhost:8081')
email=f"itest{int(time.time())}@example.com"
password='password123'
req=urllib.request.Request(base+'/auth/register', method='POST', headers={'Content-Type':'application/json'}, data=json.dumps({'email':email,'password':password}).encode())
with urllib.request.urlopen(req) as r:
    print(r.read().decode('utf-8'))
PY
)

token=$(printf '%s' "$resp" | python -c 'import json,sys; d=json.load(sys.stdin); print(d["token"])')
uid=$(printf '%s' "$resp" | python -c 'import json,sys; d=json.load(sys.stdin); print(d["user"]["id"])')

echo "[3/5] post run stats (transaction + awards)"
curl -fsS -X POST "$base/runs" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  -d '{"timeSeconds": 10, "level": 2, "xp": 1000, "kills": 10, "shotsFired": 20, "shotsHit": 10}' \
  | python -c 'import json,sys; d=json.load(sys.stdin); assert d.get("ok") is True; print("ok")'

echo "[4/5] promote to admin (db)"
docker compose exec -T db psql -U game -d game -c "UPDATE users SET role='admin' WHERE id=$uid" >/dev/null

echo "[5/5] admin endpoint"
curl -fsS "$base/admin/users" -H "Authorization: Bearer $token" \
  | python -c 'import json,sys; d=json.load(sys.stdin); assert d.get("ok") is True; assert isinstance(d.get("users"), list); print("ok")'

echo "DONE"
