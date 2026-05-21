<?php

declare(strict_types=1);

namespace App\Auth\Entity;

use DateTimeImmutable;

final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $email,
        public readonly string $passwordHash,
        public readonly string $role,
        public readonly DateTimeImmutable $createdAt,
        public readonly ?DateTimeImmutable $lastLoginAt = null,
        public readonly ?DateTimeImmutable $bannedAt = null,
        public readonly ?string $bannedReason = null,
    ) {}

    public function isBanned(): bool
    {
        return $this->bannedAt !== null;
    }
}
