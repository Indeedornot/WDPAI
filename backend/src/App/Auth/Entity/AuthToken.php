<?php

declare(strict_types=1);

namespace App\Auth\Entity;

use DateTimeImmutable;

final class AuthToken
{
    public function __construct(
        public readonly string $id,
        public readonly int $userId,
        public readonly string $tokenHash,
        public readonly DateTimeImmutable $expiresAt,
        public readonly DateTimeImmutable $createdAt,
        public readonly ?DateTimeImmutable $revokedAt = null,
    ) {}

    public function isExpired(): bool
    {
        return new DateTimeImmutable() > $this->expiresAt;
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    public function isValid(): bool
    {
        return !$this->isExpired() && !$this->isRevoked();
    }
}
