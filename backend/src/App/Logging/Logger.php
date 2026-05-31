<?php

declare(strict_types=1);

namespace App\Logging;

use DateTimeImmutable;
use DateTimeInterface;

enum LogLevel: string
{
    case Debug = 'DEBUG';
    case Info = 'INFO';
    case Warn = 'WARN';
    case Error = 'ERROR';
}

final class Logger
{
    private string $name;

    public function __construct(string $name = 'App')
    {
        $this->name = $name;
    }

    public function debug(string $message, array $context = []): void
    {
        $this->log(LogLevel::Debug, $message, $context);
    }

    public function info(string $message, array $context = []): void
    {
        $this->log(LogLevel::Info, $message, $context);
    }

    public function warn(string $message, array $context = []): void
    {
        $this->log(LogLevel::Warn, $message, $context);
    }

    public function error(string $message, array $context = []): void
    {
        $this->log(LogLevel::Error, $message, $context);
    }

    private function log(LogLevel $level, string $message, array $context): void
    {
        $timestamp = (new DateTimeImmutable())->format(DateTimeInterface::ATOM);
        $contextJson = !empty($context) ? json_encode($context, JSON_UNESCAPED_SLASHES) : '';

        $logLine = sprintf(
            '[%s] [%s] [%s] %s%s',
            $timestamp,
            $level->value,
            $this->name,
            $message,
            $contextJson ? ' ' . $contextJson : '',
        );

        error_log($logLine);
    }
}
