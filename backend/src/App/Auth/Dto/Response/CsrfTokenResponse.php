<?php

declare(strict_types=1);

namespace App\Auth\Dto\Response;

final class CsrfTokenResponse
{
    public function __construct(
        public readonly string $csrfToken,
    ) {}
}
