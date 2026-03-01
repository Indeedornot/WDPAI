-- 003_user_bans.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS banned_at timestamptz NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS banned_reason varchar(255) NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS users_banned_at_idx ON users (banned_at);
