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
        if ($scheme !== 'postgres' && $scheme !== 'postgresql') {
            throw new RuntimeException('DATABASE_URL must be postgres://');
        }

        $host = $parts['host'] ?? 'localhost';
        $port = (string)($parts['port'] ?? 5432);
        $path = $parts['path'] ?? '/postgres';
        $dbname = ltrim($path, '/');

        // Note: SSL/query params are intentionally ignored here for simplicity.
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $dbname);

        $user = (string)($parts['user'] ?? '');
        $password = (string)($parts['pass'] ?? '');

        return ['dsn' => $dsn, 'user' => $user, 'password' => $password];
    }
}
