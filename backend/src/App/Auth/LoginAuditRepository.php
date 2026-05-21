<?php

declare(strict_types=1);

namespace App\Auth;

use App\Container\Attributes\Injectable;
use PDO;

#[Injectable]
final class LoginAuditRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function logFailed(string $email, LoginAuditReason $reason, ?string $address = null): void
    {
        $address ??= $_SERVER['REMOTE_ADDR'] ?? null;
        $id = bin2hex(random_bytes(16));
        $stmt = $this->pdo->prepare('INSERT INTO login_audit (id, email, ip, attempted_at, reason) VALUES (:id, :email, :ip, now(), :reason)');
        $stmt->execute([
            ':id' => $id,
            ':email' => $email,
            ':ip' => $address,
            ':reason' => $reason->value,
        ]);
    }

    public function logSuccess(string $email, ?string $address = null): void
    {
        $address ??= $_SERVER['REMOTE_ADDR'] ?? null;
        $id = bin2hex(random_bytes(16));
        $stmt = $this->pdo->prepare('INSERT INTO login_audit (id, email, ip, attempted_at, reason) VALUES (:id, :email, :ip, now(), :reason)');
        $stmt->execute([
            ':id' => $id,
            ':email' => $email,
            ':ip' => $address,
            ':reason' => LoginAuditReason::Success->value,
        ]);
    }

    /** @return list<array{id:string,email:string,ip:string|null,attempted_at:string,reason:string}> */
    public function listRecent(int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));
        $stmt = $this->pdo->prepare('SELECT id, email, ip, attempted_at, reason FROM login_audit ORDER BY attempted_at DESC LIMIT :limit');
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[] = [
                'id' => (string)$row['id'],
                'email' => (string)$row['email'],
                'ip' => $row['ip'] === null ? null : (string)$row['ip'],
                'attempted_at' => (string)$row['attempted_at'],
                'reason' => (string)$row['reason'],
            ];
        }

        return $rows;
    }
}
