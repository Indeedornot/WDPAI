<?php

declare(strict_types=1);

namespace App\Auth;

use App\Container\Attributes\Injectable;
use PDO;
use App\Auth\AuthSession;

#[Injectable]
final class TokenRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Creates a new bearer token for a user.
     *
     * Returns the raw token only once (store it client-side). Only a hash is stored in the DB.
     */
    public function issueToken(int $userId, ?string $expiresAtIso8601 = null): string
    {
        // 32 bytes -> 64 hex chars
        $raw = bin2hex(random_bytes(32));
        $hash = hash('sha256', $raw);

        $stmt = $this->pdo->prepare('INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (:uid, :th, :exp)');
        $stmt->execute([
            ':uid' => $userId,
            ':th' => $hash,
            ':exp' => $expiresAtIso8601,
        ]);

        return $raw;
    }

    public function revoke(string $rawToken): void
    {
        $hash = hash('sha256', $rawToken);
        $stmt = $this->pdo->prepare('UPDATE auth_tokens SET revoked_at = now() WHERE token_hash = :th AND revoked_at IS NULL');
        $stmt->execute([':th' => $hash]);
    }

    public function revokeAllForUser(int $userId): void
    {
        $stmt = $this->pdo->prepare('UPDATE auth_tokens SET revoked_at = now() WHERE user_id = :uid AND revoked_at IS NULL');
        $stmt->execute([':uid' => $userId]);
    }

    public function findUserByToken(string $rawToken): ?AuthUser
    {
        $session = $this->findSessionByToken($rawToken);
        if ($session === null) {
            return null;
        }

        return $session->user;
    }

    public function findSessionByToken(string $rawToken): ?AuthSession
    {
        $hash = hash('sha256', $rawToken);

        $sql = 'SELECT u.id, u.email, u.role, u.banned_at, u.banned_reason, t.expires_at '
            . 'FROM auth_tokens t '
            . 'JOIN users u ON u.id = t.user_id '
            . 'WHERE t.token_hash = :th '
            . 'AND t.revoked_at IS NULL '
            . 'AND (t.expires_at IS NULL OR t.expires_at > now()) '
            . 'LIMIT 1';

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':th' => $hash]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return new AuthSession(
            new AuthUser(
                (int)$row['id'],
                (string)$row['email'],
                (string)$row['role'],
                $row['banned_at'] === null ? null : (string)$row['banned_at'],
                $row['banned_reason'] === null ? null : (string)$row['banned_reason'],
            ),
            $row['expires_at'] === null ? null : (string)$row['expires_at'],
        );
    }
}
