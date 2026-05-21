-- 007_login_audit.sql

CREATE TABLE IF NOT EXISTS login_audit (
  id char(32) PRIMARY KEY,
  email varchar(255) NOT NULL,
  ip varchar(45) NULL DEFAULT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  reason varchar(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS login_audit_attempted_at_idx ON login_audit (attempted_at);
CREATE INDEX IF NOT EXISTS login_audit_email_idx ON login_audit (email);
