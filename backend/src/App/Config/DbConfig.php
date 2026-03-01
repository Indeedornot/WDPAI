<?php

declare(strict_types=1);

namespace App\Config;

final class DbConfig
{
    public function __construct(
        public readonly string $dsn,
        public readonly string $user,
        public readonly string $password,
    ) {
    }
}
