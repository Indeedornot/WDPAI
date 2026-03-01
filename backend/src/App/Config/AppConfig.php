<?php

declare(strict_types=1);

namespace App\Config;

final class AppConfig
{
    public function __construct(
        public readonly DbConfig $db,
        public readonly CorsConfig $cors,
        public readonly RoutingConfig $routing,
    ) {
    }
}
