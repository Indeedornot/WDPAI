<?php

declare(strict_types=1);

namespace App\Bootstrap;

use App\Config\AppConfig;
use App\Config\CorsConfig;
use App\Config\DbConfig;
use App\Config\RoutingConfig;
use App\Auth\UserRepository;
use App\Auth\TokenRepository;
use App\Auth\LoginAuditRepository;
use App\Kernel;

final class Bootstrap
{
    /**
     * Creates the backend kernel.
     *
     * This is intentionally the only place that reads environment variables.
     */
    public static function kernel(): Kernel
    {
        $dotEnv = DotEnv::parse(__DIR__ . '/../../../.env');

        $envString = static function (string $key, string $default = '') use ($dotEnv): string {
            $v = getenv($key);
            if ($v !== false) {
                return (string)$v;
            }
            if (array_key_exists($key, $dotEnv)) {
                return (string)$dotEnv[$key];
            }
            return $default;
        };

        $databaseUrl = $envString('DATABASE_URL', '');

        $dbHost = $envString('POSTGRES_HOST', 'localhost');
        $dbPort = $envString('POSTGRES_PORT', '5432');
        $dbDatabase = $envString('POSTGRES_DB', 'postgres');
        $dbUser = $envString('POSTGRES_USER', '');
        $dbPassword = $envString('POSTGRES_PASSWORD', '');

        if ($databaseUrl !== '') {
            $parsed = Helpers::dbFromDatabaseUrl($databaseUrl);
            $dsn = $parsed['dsn'];
            $dbUser = $parsed['user'] !== '' ? $parsed['user'] : $dbUser;
            $dbPassword = $parsed['password'] !== '' ? $parsed['password'] : $dbPassword;
        } else {
            $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $dbHost, $dbPort, $dbDatabase);
        }

        $corsOrigins = Helpers::parseCsvList($envString('CORS_ORIGINS', ''));

        $basePath = rtrim($envString('BASE_PATH', ''), '/');

        $config = new AppConfig(
            new DbConfig($dsn, $dbUser, $dbPassword),
            new CorsConfig($corsOrigins),
            new RoutingConfig($basePath),
        );

        $kernel = new Kernel($config);

        // Register common singleton services in the container.
        $container = $kernel->container();
        $container->registerSingleton(UserRepository::class, function($c) use ($kernel) {
            return new UserRepository($kernel->pdo());
        });
        $container->registerSingleton(TokenRepository::class, function($c) use ($kernel) {
            return new TokenRepository($kernel->pdo());
        });
        $container->registerSingleton(LoginAuditRepository::class, function($c) use ($kernel) {
            return new LoginAuditRepository($kernel->pdo());
        });

        return $kernel;
    }
}
