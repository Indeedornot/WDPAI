<?php

declare(strict_types=1);

namespace App\Routing;

/**
 * Identifies a controller method to invoke for a given route.
 */
final class ControllerAction
{
    /**
     * @param class-string $controllerClass
     */
    public function __construct(
        public readonly string $controllerClass,
        public readonly string $method,
    ) {
    }
}
