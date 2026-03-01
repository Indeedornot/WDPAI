<?php

declare(strict_types=1);

namespace App\Routing;

use App\Kernel;

final class Router
{
    /** @var array<string, callable(Request, Kernel): Response> */
    private array $routes = [];

    /** @param callable(Request, Kernel): Response $handler */
    public function map(string $method, string $path, callable $handler): void
    {
        $method = strtoupper($method);
        $key = $method . ' ' . $path;
        $this->routes[$key] = $handler;
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function get(string $path, callable $handler): void
    {
        $this->map('GET', $path, $handler);
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function post(string $path, callable $handler): void
    {
        $this->map('POST', $path, $handler);
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function delete(string $path, callable $handler): void
    {
        $this->map('DELETE', $path, $handler);
    }

    public function dispatch(Request $req, Kernel $kernel): ?Response
    {
        $key = $req->method . ' ' . $req->path;
        $handler = $this->routes[$key] ?? null;
        if ($handler === null) {
            return null;
        }

        return $handler($req, $kernel);
    }
}
