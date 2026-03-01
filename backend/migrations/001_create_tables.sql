-- 001_create_tables.sql

CREATE TABLE IF NOT EXISTS schema_migrations (
  version varchar(255) PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Generic updated_at trigger helper.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS saves (
  slot varchar(255) PRIMARY KEY,
  version int NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX saves_updated_at_idx ON saves (updated_at);

DROP TRIGGER IF EXISTS saves_set_updated_at ON saves;
CREATE TRIGGER saves_set_updated_at
BEFORE UPDATE ON saves
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
