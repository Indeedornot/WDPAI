-- seed.sql — sample data for graders / local development.
-- Idempotent: safe to run repeatedly. Run after the migrations (001..008).
--
-- Sample accounts (password in parentheses):
--   admin@example.com   (admin12345)   role = admin
--   nova@example.com    (player12345)  role = player
--   orbit@example.com   (player12345)  role = player
--   comet@example.com   (player12345)  role = player

-- Users (1:N parent for saves, runs, tokens, achievements) ---------------------
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@example.com', '$2y$10$3YZE9EdOht6pBDSiMC5w/upgPpMI46rYPqFciflmfdQ.r8NLq5h4S', 'admin'),
  ('nova@example.com',  '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player'),
  ('orbit@example.com', '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player'),
  ('comet@example.com', '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player')
ON CONFLICT (email) DO NOTHING;

-- Profiles (1:1 with users) ----------------------------------------------------
INSERT INTO user_profiles (user_id, display_name)
SELECT id, initcap(split_part(email, '@', 1)) FROM users
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Achievements (N:M base table) ------------------------------------------------
INSERT INTO achievements (code, title) VALUES
  ('KILL_10', '10 kills in one run'),
  ('XP_1000', '1000 XP in one run')
ON CONFLICT (code) DO NOTHING;

-- Run stats (1:N with users; feeds v_user_latest_run + leaderboard) ------------
INSERT INTO player_run_stats (user_id, time_seconds, level, xp, kills, shots_fired, shots_hit, created_at)
SELECT u.id, v.time_seconds, v.level, v.xp, v.kills, v.shots_fired, v.shots_hit, now() - v.ago
FROM (VALUES
  ('nova@example.com',  245, 8, 1200, 34, 210, 160, interval '2 days'),
  ('nova@example.com',  180, 6,  900, 22, 150, 110, interval '1 day'),
  ('orbit@example.com', 320, 9, 1500, 41, 260, 205, interval '3 hours'),
  ('comet@example.com', 132, 4,  500, 12, 100,  61, interval '5 hours')
) AS v(email, time_seconds, level, xp, kills, shots_fired, shots_hit, ago)
JOIN users u ON u.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM player_run_stats prs WHERE prs.user_id = u.id);

-- User achievements (N:M join) — award based on the seeded runs -----------------
INSERT INTO user_achievements (user_id, achievement_id)
SELECT DISTINCT prs.user_id, a.id
FROM player_run_stats prs
JOIN achievements a ON
     (a.code = 'KILL_10' AND prs.kills >= 10)
  OR (a.code = 'XP_1000' AND prs.xp   >= 1000)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Player saves (1:N with users) ------------------------------------------------
INSERT INTO player_saves (user_id, slot, payload)
SELECT u.id, 'my-ts-app:save:slot1',
       jsonb_build_object('version', 1, 'note', 'seed save', 'objects', '[]'::jsonb)
FROM users u
WHERE u.email IN ('nova@example.com', 'orbit@example.com')
ON CONFLICT (user_id, slot) DO NOTHING;

-- Login audit (demonstrates the audit table) -----------------------------------
INSERT INTO login_audit (id, email, ip, reason)
SELECT md5(random()::text || clock_timestamp()::text), v.email, v.ip, v.reason
FROM (VALUES
  ('nova@example.com',  '203.0.113.10', 'success'),
  ('orbit@example.com', '203.0.113.22', 'success'),
  ('unknown@example.com', '198.51.100.5', 'not_found')
) AS v(email, ip, reason)
WHERE NOT EXISTS (SELECT 1 FROM login_audit);
