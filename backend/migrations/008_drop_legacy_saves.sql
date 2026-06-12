-- 008_drop_legacy_saves.sql
-- The original global `saves` table (migration 001) was superseded by the
-- per-user `player_saves` table (migration 002). Nothing in the application
-- reads or writes `saves` anymore, so it is dropped to avoid data redundancy.
-- The shared set_updated_at() trigger function is kept: player_saves still uses it.

DROP TABLE IF EXISTS saves;
