<?php

declare(strict_types=1);

namespace App\Routing;

use RuntimeException;

final class ValidationException extends RuntimeException
{
    /** @param array<string, mixed> $extra */
    public function __construct(
        public readonly string $error,
        public readonly int $status = 400,
        public readonly ?string $publicMessage = null,
        public readonly array $extra = [],
    ) {
        parent::__construct($publicMessage ?? $error);
    }
}
