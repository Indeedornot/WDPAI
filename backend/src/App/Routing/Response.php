<?php

declare(strict_types=1);

namespace App\Routing;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;

final class Response
{
    /** @var array<string, string> */
    private array $headers;
    /** @var list<string> */
    private array $cookies;

    public function __construct(
        private int $status,
        array $headers,
        private string $body,
        array $cookies = [],
    ) {
        $this->headers = $headers;
        $this->cookies = $cookies;
    }

    /** @return array<string, string> */
    public function headers(): array
    {
        return $this->headers;
    }

    public function status(): int
    {
        return $this->status;
    }

    public function body(): string
    {
        return $this->body;
    }

    public function withHeader(string $name, string $value): self
    {
        $next = new self($this->status, $this->headers, $this->body, $this->cookies);
        $next->headers[$name] = $value;
        return $next;
    }

    /** @param array{expires?:string|int|null,path?:string,secure?:bool,httpOnly?:bool,sameSite?:string,domain?:string} $options */
    public function withCookie(string $name, string $value, array $options = []): self
    {
        $next = new self($this->status, $this->headers, $this->body, $this->cookies);
        $next->cookies[] = self::buildCookieHeader($name, $value, $options);
        return $next;
    }

    public function deleteCookie(string $name, string $path = '/'): self
    {
        return $this->withCookie($name, '', ['expires' => 1, 'path' => $path]);
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $k => $v) {
            header($k . ': ' . $v);
        }
        foreach ($this->cookies as $cookie) {
            header('Set-Cookie: ' . $cookie, false);
        }
        echo $this->body;
    }

    public static function json(mixed $data, HttpStatus|int $status = HttpStatus::Ok): self
    {
        $statusCode = $status instanceof HttpStatus ? $status->value : $status;
        $payload = json_encode($data, JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            $payload = '{"ok":false,"error":"json_encode_failed"}';
            $statusCode = HttpStatus::InternalServerError->value;
        }

        return new self($statusCode, ['Content-Type' => 'application/json; charset=utf-8'], $payload);
    }

    public static function ok(mixed $data = [], HttpStatus|int $status = HttpStatus::Ok): self
    {
        if (!is_array($data)) {
            return self::json($data, $status);
        }
        return self::json(array_merge(['ok' => true], $data), $status);
    }

    /** @param array<string, mixed> $extra */
    public static function error(ApiErrorCode|string $error, HttpStatus|int $status, ?string $message = null, array $extra = []): self
    {
        $code = $error instanceof ApiErrorCode ? $error->value : $error;
        $payload = ['ok' => false, 'error' => $code];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        return self::json(array_merge($payload, $extra), $status);
    }

    public static function empty(HttpStatus|int $status = HttpStatus::NoContent): self
    {
        $statusCode = $status instanceof HttpStatus ? $status->value : $status;
        return new self($statusCode, [], '');
    }

    /** @param array{expires?:string|int|null,path?:string,secure?:bool,httpOnly?:bool,sameSite?:string,domain?:string} $options */
    private static function buildCookieHeader(string $name, string $value, array $options): string
    {
        $parts = [rawurlencode($name) . '=' . rawurlencode($value)];

        if (array_key_exists('expires', $options) && $options['expires'] !== null) {
            $expires = $options['expires'];
            $parts[] = 'Expires=' . (is_int($expires) ? gmdate('D, d M Y H:i:s T', $expires) : $expires);
        }

        $parts[] = 'Path=' . ($options['path'] ?? '/');

        if (!empty($options['domain'])) {
            $parts[] = 'Domain=' . $options['domain'];
        }
        if (($options['secure'] ?? false) === true) {
            $parts[] = 'Secure';
        }
        if (($options['httpOnly'] ?? false) === true) {
            $parts[] = 'HttpOnly';
        }

        $sameSite = $options['sameSite'] ?? null;
        if (is_string($sameSite) && $sameSite !== '') {
            $parts[] = 'SameSite=' . $sameSite;
        }

        return implode('; ', $parts);
    }
}
