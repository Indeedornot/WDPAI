-- 004_player_run_stats.sql

CREATE TABLE IF NOT EXISTS player_run_stats (
  id bigint unsigned NOT NULL AUTO_INCREMENT,
  user_id bigint unsigned NOT NULL,

  time_seconds int unsigned NOT NULL,
  level int unsigned NOT NULL,
  xp int unsigned NOT NULL,
  kills int unsigned NOT NULL,
  shots_fired int unsigned NOT NULL,
  shots_hit int unsigned NOT NULL,

  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY player_run_stats_user_id_idx (user_id),
  KEY player_run_stats_created_at_idx (created_at),
  CONSTRAINT player_run_stats_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
