<?php

declare(strict_types=1);

namespace App\Auth;

use App\Container\Attributes\Injectable;

#[Injectable]
final class CsrfTokenGenerator
{
    public function generate(): string
    {
        return bin2hex(random_bytes(32));
    }
}
