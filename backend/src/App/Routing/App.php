<?php

declare(strict_types=1);

namespace App\Routing;

use App\Error\ApiErrorCode;
use App\Error\FailureRepository;
use App\Http\HttpStatus;
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
            return $this->withCors(Response::empty(HttpStatus::NoContent), $req);
        }

        try {
            $res = $this->router->dispatch($req, $this->kernel);
            if (!$res) {
                $res = Response::error(ApiErrorCode::NotFound, HttpStatus::NotFound);
            }

            return $this->withCors($res, $req);
        } catch (Throwable $e) {
            $failureId = null;
            try {
                $failureId = (new FailureRepository($this->kernel->pdo()))->logFailure($req, $e);
            } catch (Throwable $ignore) {
                // If failure logging itself fails, still return a friendly 500.
                $failureId = null;
            }

            $message = 'Something went wrong.';
            $extra = [];
            if (is_string($failureId) && $failureId !== '') {
                $message .= ' Reference: ' . $failureId;
                $extra['failureId'] = $failureId;
            }

            return $this->withCors(
                Response::error(ApiErrorCode::ServerError, HttpStatus::InternalServerError, $message, $extra),
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
