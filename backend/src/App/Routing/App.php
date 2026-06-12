<?php

declare(strict_types=1);

namespace App\Routing;

use App\Error\ApiErrorCode;
use App\Error\FailureRepository;
use App\Http\HttpStatus;
use App\Kernel;
use App\Routing\Middleware\ClientErrorLogger;
use Throwable;

final class App
{
    // X-Client-Errors is sent by the frontend HttpClient to ship buffered logs;
    // X-Client-Errors-Processed is read back from the response.
    private const CORS_ALLOW_HEADERS = 'Content-Type, Authorization, X-CSRF-Token, X-Client-Errors';
    private const CORS_EXPOSE_HEADERS = 'X-Client-Errors-Processed';

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

        $transport = $this->enforceTransportAndCsrf($req);
        if ($transport instanceof Response) {
            return $this->withCors($transport, $req);
        }

        try {
            $res = $this->router->dispatch($req, $this->kernel);
            if (!$res) {
                $res = Response::error(ApiErrorCode::NotFound, HttpStatus::NotFound);
            }

            $errorLogger = new ClientErrorLogger();
            $res = $errorLogger->process($req, $res);

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
                ->withHeader('Access-Control-Allow-Headers', self::CORS_ALLOW_HEADERS)
                ->withHeader('Access-Control-Expose-Headers', self::CORS_EXPOSE_HEADERS)
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }

        if ($cors->isOriginAllowed($req->origin)) {
            return $res
                ->withHeader('Access-Control-Allow-Origin', $req->origin)
                ->withHeader('Vary', 'Origin')
                ->withHeader('Access-Control-Allow-Credentials', 'true')
                ->withHeader('Access-Control-Allow-Headers', self::CORS_ALLOW_HEADERS)
                ->withHeader('Access-Control-Expose-Headers', self::CORS_EXPOSE_HEADERS)
                ->withHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        }

        return $res;
    }

    private function enforceTransportAndCsrf(Request $req): ?Response
    {
        $method = strtoupper($req->method);
        $unsafe = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

        if (!$unsafe) {
            return null;
        }

        if ($this->kernel->config->routing->requireHttps && str_starts_with($req->path, '/auth/') && !$req->secure) {
            return Response::error(ApiErrorCode::Forbidden, HttpStatus::Forbidden, 'HTTPS required.');
        }

        if ($req->path === '/auth/csrf') {
            return null;
        }

        $csrfCookie = $req->cookie('csrf_token');
        $csrfHeader = $req->headers['x-csrf-token'] ?? '';
        $csrfHeader = is_string($csrfHeader) ? trim($csrfHeader) : '';

        if ($csrfCookie === null || $csrfCookie === '' || $csrfHeader === '' || !hash_equals($csrfCookie, $csrfHeader)) {
            return Response::error(ApiErrorCode::Forbidden, HttpStatus::Forbidden, 'CSRF validation failed.');
        }

        return null;
    }
}
