<?php

declare(strict_types=1);

namespace App\Routing;

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

    public static function json(mixed $data, int $status = 200): self
    {
        $payload = json_encode($data, JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            $payload = '{"ok":false,"error":"json_encode_failed"}';
            $status = 500;
        }

        return new self($status, ['Content-Type' => 'application/json; charset=utf-8'], $payload);
    }

    /** @param array<string, mixed> $data */
    public static function ok(array $data = [], int $status = 200): self
    {
        return self::json(array_merge(['ok' => true], $data), $status);
    }

    /** @param array<string, mixed> $extra */
    public static function error(string $error, int $status, ?string $message = null, array $extra = []): self
    {
        $payload = ['ok' => false, 'error' => $error];
        if ($message !== null) {
            $payload['message'] = $message;
        }
        return self::json(array_merge($payload, $extra), $status);
    }

    public static function empty(int $status = 204): self
    {
        return new self($status, [], '');
    }
}
