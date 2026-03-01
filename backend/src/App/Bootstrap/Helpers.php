<?php

declare(strict_types=1);

namespace App\Bootstrap;

use RuntimeException;

final class Helpers
{
    /** @return list<string> */
    public static function parseCsvList(?string $value): array
    {
        $value = $value ?? '';
        $value = trim($value);
        if ($value === '') {
            return [];
        }

        $parts = array_map('trim', explode(',', $value));
        $parts = array_values(array_filter($parts, static fn($v) => $v !== ''));
        return $parts;
    }

    /**
     * @return array{dsn: string, user: string, password: string}
     */
    public static function dbFromDatabaseUrl(string $url): array
    {
        $parts = parse_url($url);
        if ($parts === false) {
            throw new RuntimeException('Invalid DATABASE_URL');
        }

        $scheme = $parts['scheme'] ?? '';
        if ($scheme !== 'mysql') {
            throw new RuntimeException('DATABASE_URL must be mysql://');
        }

        $host = $parts['host'] ?? 'localhost';
        $port = (string)($parts['port'] ?? 3306);
        $path = $parts['path'] ?? '/mysql';
        $dbname = ltrim($path, '/');

        // Note: MySQL ssl/query params are intentionally ignored here for simplicity.
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $dbname);

        $user = (string)($parts['user'] ?? '');
        $password = (string)($parts['pass'] ?? '');

        return ['dsn' => $dsn, 'user' => $user, 'password' => $password];
    }
}
