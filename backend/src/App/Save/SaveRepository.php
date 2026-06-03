<?php

declare(strict_types=1);

namespace App\Save;

use App\Repository\BaseRepository;
use RuntimeException;

final class SaveRepository extends BaseRepository
{
    /** @return array{slot: string, version: int, payload: mixed, updated_at: string}|null */
    public function findBySlot(string $slot): ?array
    {
        $stmt = $this->pdo->prepare('SELECT slot, version, payload, updated_at FROM saves WHERE slot = :slot');
        $stmt->execute([':slot' => $slot]);
        $row = $this->fetchRow($stmt);
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
            'slot' => (string)$row['slot'],
            'version' => (int)$row['version'],
            'payload' => $row['payload'],
            'updated_at' => (string)$row['updated_at'],
        ];
    }

    public function upsert(string $slot, mixed $payload, int $version = 1): void
    {
        $payloadJson = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            throw new RuntimeException('Failed to encode payload as JSON');
        }

        $sql = 'INSERT INTO saves (slot, version, payload) VALUES (:slot, :version, :payload) '
            . 'ON CONFLICT (slot) DO UPDATE SET version = EXCLUDED.version, payload = EXCLUDED.payload';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':slot' => $slot,
            ':version' => $version,
            ':payload' => $payloadJson,
        ]);
    }

    public function deleteBySlot(string $slot): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM saves WHERE slot = :slot');
        $stmt->execute([':slot' => $slot]);
    }
}
