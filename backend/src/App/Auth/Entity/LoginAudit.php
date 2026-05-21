<?php

declare(strict_types=1);

namespace App\Auth\Entity;

use App\Auth\LoginAuditReason;
use DateTimeImmutable;

final class LoginAudit
{
    public function __construct(
        public readonly string $id,
        public readonly string $email,
        public readonly ?string $ip,
        public readonly DateTimeImmutable $attemptedAt,
        public readonly LoginAuditReason $reason,
    ) {}
}
