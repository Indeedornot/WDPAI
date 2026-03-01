-- 003_user_bans.sql

ALTER TABLE users
  ADD COLUMN banned_at timestamp NULL DEFAULT NULL,
  ADD COLUMN banned_reason varchar(255) NULL DEFAULT NULL;

CREATE INDEX users_banned_at_idx ON users (banned_at);
