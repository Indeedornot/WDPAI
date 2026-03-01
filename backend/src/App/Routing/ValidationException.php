<?php

declare(strict_types=1);

namespace App\Routing;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use RuntimeException;

final class ValidationException extends RuntimeException
{
    /** @param array<string, mixed> $extra */
    public function __construct(
        public readonly ApiErrorCode|string $error,
        public readonly HttpStatus|int $status = HttpStatus::BadRequest,
        public readonly ?string $publicMessage = null,
        public readonly array $extra = [],
    ) {
        $err = $error instanceof ApiErrorCode ? $error->value : $error;
        parent::__construct($publicMessage ?? $err);
    }
}
