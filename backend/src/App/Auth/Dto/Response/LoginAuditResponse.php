<?php

declare(strict_types=1);

namespace App\Auth\Dto\Response;

use App\Auth\Entity\LoginAudit;

final class LoginAuditResponse
{
    public function __construct(
        public readonly string $id,
        public readonly string $email,
        public readonly ?string $ip,
        public readonly string $attemptedAt,
        public readonly string $reason,
    ) {}

    public static function fromEntity(LoginAudit $entity): self
    {
        return new self(
            id: $entity->id,
            email: $entity->email,
            ip: $entity->ip,
            attemptedAt: $entity->attemptedAt->format('c'),
            reason: $entity->reason->value,
        );
    }
}
