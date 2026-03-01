<?php

declare(strict_types=1);

namespace App\Config;

final class RoutingConfig
{
    public function __construct(
        public readonly string $basePath,
    ) {
    }

    public function stripBasePath(string $path): string
    {
        if ($this->basePath === '') {
            return $path;
        }

        if (!str_starts_with($path, $this->basePath)) {
            return $path;
        }

        $rest = substr($path, strlen($this->basePath));
        return $rest === '' ? '/' : $rest;
    }
}
