-- 004_player_run_stats.sql

CREATE TABLE IF NOT EXISTS player_run_stats (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  time_seconds int NOT NULL CHECK (time_seconds >= 0),
  level int NOT NULL CHECK (level >= 1),
  xp int NOT NULL CHECK (xp >= 0),
  kills int NOT NULL CHECK (kills >= 0),
  shots_fired int NOT NULL CHECK (shots_fired >= 0),
  shots_hit int NOT NULL CHECK (shots_hit >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),

  CHECK (shots_hit <= shots_fired)
);

CREATE INDEX IF NOT EXISTS player_run_stats_user_id_idx ON player_run_stats (user_id);
CREATE INDEX IF NOT EXISTS player_run_stats_created_at_idx ON player_run_stats (created_at);
