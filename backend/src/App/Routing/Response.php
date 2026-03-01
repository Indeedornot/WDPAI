<?php

declare(strict_types=1);

namespace App\Routing;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;

final class Response
{
    /** @var array<string, string> */
    private array $headers;

    public function __construct(
        private int $status,
        array $headers,
        private string $body,
    ) {
        $this->headers = $headers;
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
        $next = new self($this->status, $this->headers, $this->body);
        $next->headers[$name] = $value;
        return $next;
    }

    public function send(): void
    {
        http_response_code($this->status);
        foreach ($this->headers as $k => $v) {
            header($k . ': ' . $v);
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

    /** @param array<string, mixed> $data */
    public static function ok(array $data = [], HttpStatus|int $status = HttpStatus::Ok): self
    {
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
}
