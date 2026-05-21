<?php

declare(strict_types=1);

namespace App\Auth;

final readonly class AuthSession
{
    public function __construct(
        public AuthUser $user,
        public ?string $expiresAt,
    ) {
    }
}
