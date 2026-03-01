<?php

declare(strict_types=1);

namespace App\Auth;

final class AuthUser
{
    public function __construct(
        public readonly int $id,
        public readonly string $email,
        public readonly string $role,
        public readonly ?string $bannedAt = null,
        public readonly ?string $bannedReason = null,
    ) {
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isBanned(): bool
    {
        return $this->bannedAt !== null && trim($this->bannedAt) !== '';
    }
}
