<?php

declare(strict_types=1);

namespace App\Routing;

final class Request
{
    /** @param array<string, string> $headers */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $headers,
        public readonly mixed $json,
        public readonly ?string $rawBody,
        public readonly ?string $jsonError,
        public readonly string $origin,
    ) {
    }

    public static function fromGlobals(string $path): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $headers = [];
        foreach ($_SERVER as $k => $v) {
            if (!is_string($v)) {
                continue;
            }
            if (!str_starts_with($k, 'HTTP_')) {
                continue;
            }
            $name = strtolower(str_replace('_', '-', substr($k, 5)));
            $headers[$name] = $v;
        }

        // Some environments (notably certain CGI/FastCGI/proxy configs) don't forward the
        // Authorization header into HTTP_AUTHORIZATION. Support a couple common variants.
        if (!isset($headers['authorization'])) {
            $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $_SERVER['AUTHORIZATION'] ?? null;
            if (is_string($auth) && trim($auth) !== '') {
                $headers['authorization'] = $auth;
            }
        }

        $raw = file_get_contents('php://input');
        $rawBody = ($raw !== false) ? $raw : null;

        $json = null;
        $jsonError = null;
        if ($rawBody !== null && trim($rawBody) !== '') {
            $decoded = json_decode($rawBody, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $json = $decoded;
            } else {
                $jsonError = json_last_error_msg();
            }
        }

        return new self(
            $method,
            $path,
            $_GET,
            $headers,
            $json,
            $rawBody,
            $jsonError,
            is_string($origin) ? $origin : '',
        );
    }

    public function queryString(string $key): ?string
    {
        $v = $this->query[$key] ?? null;
        return is_string($v) ? $v : null;
    }
}
