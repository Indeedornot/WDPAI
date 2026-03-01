-- 005_db_features_and_relations.sql
-- Satisfies: all relationship types (1:1, 1:N, N:M), min 2 views, min 1 function.

-- 1:1 relation (users <-> user_profiles)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name varchar(80) NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Base table for N:M relation
CREATE TABLE IF NOT EXISTS achievements (
  id bigserial PRIMARY KEY,
  code varchar(64) NOT NULL UNIQUE,
  title varchar(120) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- N:M join table
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id bigint NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Function example: compute accuracy
CREATE OR REPLACE FUNCTION shots_accuracy(shots_hit int, shots_fired int)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN shots_fired <= 0 THEN 0 ELSE shots_hit::numeric / shots_fired::numeric END;
$$;

-- Views (join multiple tables)
CREATE OR REPLACE VIEW v_user_latest_run AS
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  r.created_at,
  r.time_seconds,
  r.level,
  r.xp,
  r.kills,
  r.shots_fired,
  r.shots_hit,
  shots_accuracy(r.shots_hit, r.shots_fired) AS accuracy
FROM users u
LEFT JOIN LATERAL (
  SELECT *
  FROM player_run_stats prs
  WHERE prs.user_id = u.id
  ORDER BY prs.created_at DESC
  LIMIT 1
) r ON true;

CREATE OR REPLACE VIEW v_user_save_summary AS
SELECT
  u.id AS user_id,
  u.email,
  COUNT(ps.slot) AS save_slots,
  MAX(ps.updated_at) AS last_save_at
FROM users u
LEFT JOIN player_saves ps ON ps.user_id = u.id
GROUP BY u.id, u.email;
