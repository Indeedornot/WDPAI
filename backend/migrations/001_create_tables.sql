-- 001_create_tables.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
  version varchar(255) PRIMARY KEY,
  applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saves (
  slot varchar(255) PRIMARY KEY,
  version int NOT NULL DEFAULT 1,
  payload json NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX saves_updated_at_idx ON saves (updated_at);
