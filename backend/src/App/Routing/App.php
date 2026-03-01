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

    public function get(string $path, ControllerAction $handler): void
    {
        $this->router->get($path, $handler);
    }

    public function post(string $path, ControllerAction $handler): void
    {
        $this->router->post($path, $handler);
    }

    public function delete(string $path, ControllerAction $handler): void
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
                $res = Response::error('not_found', 404);
            }

            return $this->withCors($res, $req);
        } catch (Throwable $e) {
            return $this->withCors(
                Response::error('server_error', 500, $e->getMessage()),
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
