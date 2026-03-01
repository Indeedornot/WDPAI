-- 002_auth_and_player_saves.sql

-- Users (players + future admins)
CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role varchar(16) NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NULL DEFAULT NULL,
  UNIQUE (email)
);

-- Bearer tokens (store only a hash)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL DEFAULT NULL,
  revoked_at timestamptz NULL DEFAULT NULL,
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens (user_id);

-- Per-player saves (slot is scoped to user_id)
CREATE TABLE IF NOT EXISTS player_saves (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot varchar(255) NOT NULL,
  version int NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);

CREATE INDEX IF NOT EXISTS player_saves_updated_at_idx ON player_saves (updated_at);

DROP TRIGGER IF EXISTS player_saves_set_updated_at ON player_saves;
CREATE TRIGGER player_saves_set_updated_at
BEFORE UPDATE ON player_saves
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
