<?php

declare(strict_types=1);

namespace App\Routing\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
final class CatchExceptions
{
    /**
     * @param array<class-string, int> $mapping Exception class to HttpStatus code
     */
    public function __construct(
        public array $mapping = [],
    ) {}
}
