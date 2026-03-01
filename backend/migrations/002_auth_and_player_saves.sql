-- 002_auth_and_player_saves.sql

-- Users (players + future admins)
CREATE TABLE IF NOT EXISTS users (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role enum('player','admin') NOT NULL DEFAULT 'player',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB;

-- Bearer tokens (store only a hash)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id bigint unsigned NOT NULL,
  token_hash char(64) NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp NULL DEFAULT NULL,
  revoked_at timestamp NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY auth_tokens_token_hash_uq (token_hash),
  KEY auth_tokens_user_id_idx (user_id),
  CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Per-player saves (slot is scoped to user_id)
CREATE TABLE IF NOT EXISTS player_saves (
  user_id bigint unsigned NOT NULL,
  slot varchar(255) NOT NULL,
  version int NOT NULL DEFAULT 1,
  payload json NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, slot),
  KEY player_saves_updated_at_idx (updated_at),
  CONSTRAINT player_saves_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
