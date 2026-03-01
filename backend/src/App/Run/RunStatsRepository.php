<?php

declare(strict_types=1);

namespace App\Run;

use PDO;
use PDOException;
use Throwable;

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
