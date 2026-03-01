<?php

declare(strict_types=1);

/**
 * Minimal PSR-4 style autoloader.
 *
 * Namespace prefix:
 * - App\\ => backend/src/App/
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $rel = substr($class, strlen($prefix));
    $relPath = str_replace('\\', DIRECTORY_SEPARATOR, $rel) . '.php';

    $path = __DIR__ . DIRECTORY_SEPARATOR . 'App' . DIRECTORY_SEPARATOR . $relPath;
    if (is_file($path)) {
        require_once $path;
    }
});
