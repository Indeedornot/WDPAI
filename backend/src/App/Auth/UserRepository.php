<?php

declare(strict_types=1);

namespace App\Auth;

use App\Container\Attributes\Injectable;
use App\Repository\BaseRepository;

#[Injectable]
final class UserRepository extends BaseRepository
{
    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, email, password_hash, role, banned_at, banned_reason FROM users WHERE email = :email');
        $stmt->execute([':email' => $email]);
        $row = $this->fetchRow($stmt);
        if (!$row) {
            return null;
        }

        return [
            'id' => (int)$row['id'],
            'email' => (string)$row['email'],
            'password_hash' => (string)$row['password_hash'],
            'role' => (string)$row['role'],
            'banned_at' => $row['banned_at'] === null ? null : (string)$row['banned_at'],
            'banned_reason' => $row['banned_reason'] === null ? null : (string)$row['banned_reason'],
        ];
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, email, role, banned_at, banned_reason FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $this->fetchRow($stmt);
        if (!$row) {
            return null;
        }

        return [
            'id' => (int)$row['id'],
            'email' => (string)$row['email'],
            'role' => (string)$row['role'],
            'banned_at' => $row['banned_at'] === null ? null : (string)$row['banned_at'],
            'banned_reason' => $row['banned_reason'] === null ? null : (string)$row['banned_reason'],
        ];
    }

    public function setBan(int $userId, bool $banned, ?string $reason = null): void
    {
        if ($banned) {
            $stmt = $this->pdo->prepare('UPDATE users SET banned_at = now(), banned_reason = :reason WHERE id = :id');
            $stmt->execute([
                ':id' => $userId,
                ':reason' => $reason,
            ]);
        } else {
            $stmt = $this->pdo->prepare('UPDATE users SET banned_at = NULL, banned_reason = NULL WHERE id = :id');
            $stmt->execute([':id' => $userId]);
        }
    }

    /**
     * @return array{id:int,email:string,role:string}|null
     */
    public function createPlayer(string $email, string $passwordHash): ?array
    {
        $stmt = $this->pdo->prepare('INSERT INTO users (email, password_hash, role) VALUES (:email, :ph, :role)');
        try {
            $ok = $stmt->execute([
                ':email' => $email,
                ':ph' => $passwordHash,
                ':role' => UserRole::Player->value,
            ]);
        } catch (\PDOException $e) {
            // Translate duplicate key into a domain-level exception to avoid
            // leaking database-specific error codes into controllers.
            if ($e->getCode() === '23505') {
                throw new EmailAlreadyExistsException('Email already exists', 0, $e);
            }
            throw $e;
        }

        if (!$ok) {
            return null;
        }

        $id = (int)$this->pdo->lastInsertId();
        if ($id <= 0) {
            return null;
        }

        return [
            'id' => $id,
            'email' => $email,
            'role' => UserRole::Player->value,
        ];
    }

    public function markLogin(int $userId): void
    {
        $stmt = $this->pdo->prepare('UPDATE users SET last_login_at = now() WHERE id = :id');
        $stmt->execute([':id' => $userId]);
    }
}
