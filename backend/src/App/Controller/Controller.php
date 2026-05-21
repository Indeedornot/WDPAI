<?php

declare(strict_types=1);

namespace App\Controller;

use App\Container\Attributes\Injectable;
use App\Kernel;

#[Injectable]
abstract class Controller
{
    public function __construct(
        protected readonly Kernel $kernel,
    ) {
    }
}
