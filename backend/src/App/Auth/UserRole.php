<?php

declare(strict_types=1);

namespace App\Auth;

use RuntimeException;

enum UserRole: string
{
    case Player = 'player';
    case Admin = 'admin';

    public static function fromString(string $role): self
    {
        $role = strtolower(trim($role));
        return match ($role) {
            self::Player->value => self::Player,
            self::Admin->value => self::Admin,
            default => throw new RuntimeException('Unknown user role: ' . $role),
        };
    }
}
