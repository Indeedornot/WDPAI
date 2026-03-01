<?php

declare(strict_types=1);

namespace App\Controller;

use App\Kernel;

abstract class Controller
{
    public function __construct(
        protected readonly Kernel $kernel,
    ) {
    }
}
