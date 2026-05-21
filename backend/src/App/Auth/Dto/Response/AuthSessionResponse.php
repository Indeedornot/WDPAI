<?php

declare(strict_types=1);

namespace App\Auth\Dto\Response;

final class AuthSessionResponse
{
    public function __construct(
        public readonly string $expiresAt,
        public readonly UserResponse $user,
    ) {}

    public static function fromSession(\App\Auth\AuthSession $session): self
    {
        return new self(
            expiresAt: $session->expiresAt,
            user: UserResponse::fromUser($session->user),
        );
    }
}
