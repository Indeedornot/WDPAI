<?php

declare(strict_types=1);

namespace App\Routing;

use App\Kernel;
use Throwable;

final class App
{
    private Kernel $kernel;
    private Router $router;

    public function __construct(Kernel $kernel)
    {
        $this->kernel = $kernel;
        $this->router = new Router();
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function get(string $path, callable $handler): void
    {
        $this->router->get($path, $handler);
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function post(string $path, callable $handler): void
    {
        $this->router->post($path, $handler);
    }

    /** @param callable(Request, Kernel): Response $handler */
    public function delete(string $path, callable $handler): void
    {
        $this->router->delete($path, $handler);
    }

    public function handle(Request $req): Response
    {
        if ($req->method === 'OPTIONS') {
            return $this->withCors(Response::empty(204), $req);
        }

        try {
            $res = $this->router->dispatch($req, $this->kernel);
            if (!$res) {
                $res = Response::json(['ok' => false, 'error' => 'not_found'], 404);
            }

            return $this->withCors($res, $req);
        } catch (Throwable $e) {
            return $this->withCors(
                Response::json(['ok' => false, 'error' => 'server_error', 'message' => $e->getMessage()], 500),
                $req,
            );
        }
    }

    private function withCors(Response $res, Request $req): Response
    {
        $cors = $this->kernel->config->cors;

        if (in_array('*', $cors->allowedOrigins, true)) {
            return $res
                ->withHeader('Access-Control-Allow-Origin', '*')
                ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }

        if ($cors->isOriginAllowed($req->origin)) {
            return $res
                ->withHeader('Access-Control-Allow-Origin', $req->origin)
                ->withHeader('Vary', 'Origin')
                ->withHeader('Access-Control-Allow-Credentials', 'true')
                ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }

        return $res;
    }
}
