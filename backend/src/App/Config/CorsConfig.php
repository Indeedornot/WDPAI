<?php

declare(strict_types=1);

namespace App\Config;

final class CorsConfig
{
    /** @param list<string> $allowedOrigins */
    public function __construct(
        public readonly array $allowedOrigins,
    ) {
    }

    public function isOriginAllowed(string $origin): bool
    {
        if ($origin === '') {
            return false;
        }

        return in_array('*', $this->allowedOrigins, true) || in_array($origin, $this->allowedOrigins, true);
    }
}
