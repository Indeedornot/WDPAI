-- 006_api_failures.sql

-- Stores unexpected backend failures for debugging/support.
-- The client receives a failureId and can report it.

CREATE TABLE IF NOT EXISTS api_failures (
  id char(32) PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),

  method varchar(16) NOT NULL,
  path varchar(512) NOT NULL,
  origin varchar(512) NOT NULL DEFAULT '',

  exception_class varchar(255) NOT NULL,
  message text NOT NULL,
  trace text NOT NULL,

  request_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_json jsonb NULL DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS api_failures_created_at_idx ON api_failures (created_at);
