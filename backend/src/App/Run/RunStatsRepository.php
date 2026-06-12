<?php

declare(strict_types=1);

namespace App\Run;

use App\Container\Attributes\Injectable;
use PDO;
use PDOException;
use Throwable;

#[Injectable]
final class RunStatsRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Records a run and awards achievements in a single SERIALIZABLE transaction.
     */
    public function recordRunWithAwards(
        int $userId,
        int $timeSeconds,
        int $level,
        int $xp,
        int $kills,
        int $shotsFired,
        int $shotsHit,
    ): void {
        $this->pdo->beginTransaction();

        // PostgreSQL: transaction-scoped isolation level must be set after BEGIN.
        $this->pdo->exec('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO player_run_stats (user_id, time_seconds, level, xp, kills, shots_fired, shots_hit) '
                . 'VALUES (:uid, :t, :lvl, :xp, :k, :sf, :sh)'
            );
            $stmt->execute([
                ':uid' => $userId,
                ':t' => $timeSeconds,
                ':lvl' => $level,
                ':xp' => $xp,
                ':k' => $kills,
                ':sf' => $shotsFired,
                ':sh' => $shotsHit,
            ]);

            // 1:1 relation usage: ensure profile exists.
            $stmt = $this->pdo->prepare('INSERT INTO user_profiles (user_id) VALUES (:uid) ON CONFLICT (user_id) DO NOTHING');
            $stmt->execute([':uid' => $userId]);

            if ($kills >= 10) {
                $this->awardAchievement($userId, 'KILL_10', '10 kills in one run');
            }
            if ($xp >= 1000) {
                $this->awardAchievement($userId, 'XP_1000', '1000 XP in one run');
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Global leaderboard: each user's best run by survival time.
     * Joins player_run_stats -> users -> user_profiles (1:1) so the public
     * label is the display name when set, otherwise the email local-part.
     *
     * @return list<array{userId:int,name:string,timeSeconds:int,kills:int,level:int,createdAt:string}>
     */
    public function topRuns(int $limit = 10): array
    {
        $limit = max(1, min(100, $limit));
        $stmt = $this->pdo->prepare(
            'SELECT u.id AS user_id, '
            . "COALESCE(NULLIF(p.display_name, ''), split_part(u.email, '@', 1)) AS name, "
            . 'r.time_seconds, r.kills, r.level, r.created_at '
            . 'FROM ( '
            . '  SELECT DISTINCT ON (user_id) user_id, time_seconds, kills, level, created_at '
            . '  FROM player_run_stats '
            . '  ORDER BY user_id, time_seconds DESC, created_at DESC '
            . ') r '
            . 'JOIN users u ON u.id = r.user_id '
            . 'LEFT JOIN user_profiles p ON p.user_id = u.id '
            . 'ORDER BY r.time_seconds DESC, r.created_at ASC '
            . 'LIMIT :limit'
        );
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'userId'      => (int)$r['user_id'],
                'name'        => (string)$r['name'],
                'timeSeconds' => (int)$r['time_seconds'],
                'kills'       => (int)$r['kills'],
                'level'       => (int)$r['level'],
                'createdAt'   => (string)$r['created_at'],
            ];
        }

        return $rows;
    }

    /**
     * Achievements earned by a user (N:M read path).
     * Joins user_achievements -> achievements.
     *
     * @return list<array{code:string,title:string,earnedAt:string}>
     */
    public function listAchievementsByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT a.code, a.title, ua.earned_at '
            . 'FROM user_achievements ua '
            . 'JOIN achievements a ON a.id = ua.achievement_id '
            . 'WHERE ua.user_id = :uid '
            . 'ORDER BY ua.earned_at DESC'
        );
        $stmt->execute([':uid' => $userId]);

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'code'     => (string)$r['code'],
                'title'    => (string)$r['title'],
                'earnedAt' => (string)$r['earned_at'],
            ];
        }

        return $rows;
    }

    private function awardAchievement(int $userId, string $code, string $title): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO achievements (code, title) VALUES (:code, :title) '
            . 'ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title '
            . 'RETURNING id'
        );
        $stmt->execute([':code' => $code, ':title' => $title]);

        $achievementId = $stmt->fetchColumn();
        if (!is_numeric($achievementId)) {
            throw new PDOException('Failed to resolve achievement id.');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES (:uid, :aid) '
            . 'ON CONFLICT (user_id, achievement_id) DO NOTHING'
        );
        $stmt->execute([':uid' => $userId, ':aid' => (int)$achievementId]);
    }
}
