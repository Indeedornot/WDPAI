<?php

declare(strict_types=1);

namespace App\Logging;

final class LoggerFactory
{
    private static array $loggers = [];

    public static function getLogger(string $name): Logger
    {
        if (!isset(self::$loggers[$name]))
        {
            self::$loggers[$name] = new Logger($name);
        }
        return self::$loggers[$name];
    }
}
