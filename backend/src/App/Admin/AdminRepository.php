<?php

declare(strict_types=1);

namespace App\Admin;

use App\Container\Attributes\Injectable;
use PDO;

#[Injectable]
final class AdminRepository
{
    public function __construct(private readonly PDO $pdo) {}

    /** @return list<array{id:int,email:string,role:string,createdAt:string,lastLoginAt:string|null,bannedAt:string|null,bannedReason:string|null}> */
    public function listUsers(int $limit = 100, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);
        $stmt = $this->pdo->prepare(
            'SELECT id, email, role, created_at, last_login_at, banned_at, banned_reason '
            . 'FROM users ORDER BY id ASC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'id'           => (int)$r['id'],
                'email'        => (string)$r['email'],
                'role'         => (string)$r['role'],
                'createdAt'    => (string)$r['created_at'],
                'lastLoginAt'  => $r['last_login_at'] === null ? null : (string)$r['last_login_at'],
                'bannedAt'     => $r['banned_at'] === null ? null : (string)$r['banned_at'],
                'bannedReason' => $r['banned_reason'] === null ? null : (string)$r['banned_reason'],
            ];
        }

        return $rows;
    }

    /** @return list<array{userId:int,email:string,role:string,createdAt:string|null,timeSeconds:int|null,level:int|null,xp:int|null,kills:int|null,shotsFired:int|null,shotsHit:int|null,accuracy:float|null}> */
    public function listLatestRuns(int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));
        $stmt = $this->pdo->prepare(
            'SELECT user_id, email, role, created_at, time_seconds, level, xp, kills, shots_fired, shots_hit, accuracy '
            . 'FROM v_user_latest_run ORDER BY created_at DESC NULLS LAST LIMIT :limit'
        );
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'userId'      => (int)$r['user_id'],
                'email'       => (string)$r['email'],
                'role'        => (string)$r['role'],
                'createdAt'   => $r['created_at'] === null ? null : (string)$r['created_at'],
                'timeSeconds' => $r['time_seconds'] === null ? null : (int)$r['time_seconds'],
                'level'       => $r['level'] === null ? null : (int)$r['level'],
                'xp'          => $r['xp'] === null ? null : (int)$r['xp'],
                'kills'       => $r['kills'] === null ? null : (int)$r['kills'],
                'shotsFired'  => $r['shots_fired'] === null ? null : (int)$r['shots_fired'],
                'shotsHit'    => $r['shots_hit'] === null ? null : (int)$r['shots_hit'],
                'accuracy'    => $r['accuracy'] === null ? null : (float)$r['accuracy'],
            ];
        }

        return $rows;
    }

    /** @return list<array{userId:int,email:string,saveSlots:int,lastSaveAt:string|null}> */
    public function listSaveSummary(): array
    {
        $stmt = $this->pdo->query(
            'SELECT user_id, email, save_slots, last_save_at FROM v_user_save_summary ORDER BY last_save_at DESC NULLS LAST'
        );

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'userId'     => (int)$r['user_id'],
                'email'      => (string)$r['email'],
                'saveSlots'  => (int)$r['save_slots'],
                'lastSaveAt' => $r['last_save_at'] === null ? null : (string)$r['last_save_at'],
            ];
        }

        return $rows;
    }

    /** @return list<array{slot:string,version:int,updatedAt:string}> */
    public function listSavesByUser(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT slot, version, updated_at FROM player_saves WHERE user_id = :uid ORDER BY updated_at DESC'
        );
        $stmt->execute([':uid' => $userId]);

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'slot'      => (string)$r['slot'],
                'version'   => (int)$r['version'],
                'updatedAt' => (string)$r['updated_at'],
            ];
        }

        return $rows;
    }

    /** @return list<array{createdAt:string,timeSeconds:int,level:int,xp:int,kills:int,shotsFired:int,shotsHit:int}> */
    public function listRunsByUser(int $userId, int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));
        $stmt = $this->pdo->prepare(
            'SELECT created_at, time_seconds, level, xp, kills, shots_fired, shots_hit '
            . 'FROM player_run_stats WHERE user_id = :uid ORDER BY created_at DESC LIMIT :limit'
        );
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'createdAt'   => (string)$r['created_at'],
                'timeSeconds' => (int)$r['time_seconds'],
                'level'       => (int)$r['level'],
                'xp'          => (int)$r['xp'],
                'kills'       => (int)$r['kills'],
                'shotsFired'  => (int)$r['shots_fired'],
                'shotsHit'    => (int)$r['shots_hit'],
            ];
        }

        return $rows;
    }
}
