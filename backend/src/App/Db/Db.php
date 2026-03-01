<?php

declare(strict_types=1);

namespace App\Db;

use App\Config\DbConfig;
use PDO;

final class Db
{
    public static function createPdo(DbConfig $config): PDO
    {
        return new PDO($config->dsn, $config->user, $config->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
