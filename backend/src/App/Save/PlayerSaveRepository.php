<?php

declare(strict_types=1);

namespace App\Save;

use PDO;
use RuntimeException;

final class PlayerSaveRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /** @return array{user_id:int,slot:string,version:int,payload:mixed,updated_at:string}|null */
    public function findByUserAndSlot(int $userId, string $slot): ?array
    {
        $stmt = $this->pdo->prepare('SELECT user_id, slot, version, payload, updated_at FROM player_saves WHERE user_id = :uid AND slot = :slot');
        $stmt->execute([':uid' => $userId, ':slot' => $slot]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        // PDO typically returns json/jsonb columns as strings.
        $payload = $row['payload'];
        if (is_string($payload)) {
            $decoded = json_decode($payload, true);
            $row['payload'] = (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
        }

        return [
            'user_id' => (int)$row['user_id'],
            'slot' => (string)$row['slot'],
            'version' => (int)$row['version'],
            'payload' => $row['payload'],
            'updated_at' => (string)$row['updated_at'],
        ];
    }

    public function upsert(int $userId, string $slot, mixed $payload, int $version = 1): void
    {
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            throw new RuntimeException('Failed to encode payload as JSON');
        }

        $sql = 'INSERT INTO player_saves (user_id, slot, version, payload) VALUES (:uid, :slot, :version, :payload) '
            . 'ON CONFLICT (user_id, slot) DO UPDATE SET version = EXCLUDED.version, payload = EXCLUDED.payload';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':uid' => $userId,
            ':slot' => $slot,
            ':version' => $version,
            ':payload' => $payloadJson,
        ]);
    }

    public function deleteByUserAndSlot(int $userId, string $slot): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM player_saves WHERE user_id = :uid AND slot = :slot');
        $stmt->execute([':uid' => $userId, ':slot' => $slot]);
    }
}
