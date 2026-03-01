<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Small HTTP helpers.
 *
 * Keep configuration out of this class; configuration is built in Bootstrap.
 */
final class Http
{
    public static function path(): string
    {
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH);
        if (!is_string($path)) {
            return '/';
        }
        return $path;
    }
}
