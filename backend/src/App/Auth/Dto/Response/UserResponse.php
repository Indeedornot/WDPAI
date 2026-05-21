<?php

declare(strict_types=1);

namespace App\Auth\Dto\Response;

final class UserResponse
{
    public function __construct(
        public readonly int $id,
        public readonly string $email,
        public readonly string $role,
    ) {}

    public static function fromUser(\App\Auth\Entity\User $user): self
    {
        return new self(
            id: $user->id,
            email: $user->email,
            role: $user->role,
        );
    }
}
