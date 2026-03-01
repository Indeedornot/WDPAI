<?php

declare(strict_types=1);

namespace App\Error;

use App\Routing\Request;
use PDO;
use Throwable;

final class FailureRepository
{
    public function __construct(
        private readonly PDO $pdo,
    ) {
    }

    /**
     * Logs an unexpected server-side failure and returns the failure id.
     *
     * Note: This intentionally redacts sensitive fields and the Authorization header.
     */
    public function logFailure(Request $req, Throwable $e): string
    {
        $failureId = bin2hex(random_bytes(16)); // 32 hex chars

        $headers = $req->headers;
        unset($headers['authorization']);

        $json = $req->json;
        if (is_array($json)) {
            $json = $this->redactSensitive($json);
        } else {
            $json = null;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO api_failures '
            . '(id, method, path, origin, exception_class, message, trace, request_headers, request_json) '
            . 'VALUES (:id, :m, :p, :o, :c, :msg, :tr, :h::jsonb, :j::jsonb)'
        );

        $stmt->execute([
            ':id' => $failureId,
            ':m' => $req->method,
            ':p' => $req->path,
            ':o' => $req->origin,
            ':c' => $e::class,
            ':msg' => $e->getMessage(),
            ':tr' => $e->getTraceAsString(),
            ':h' => json_encode($headers, JSON_UNESCAPED_SLASHES) ?: '{}',
            ':j' => $json === null ? 'null' : (json_encode($json, JSON_UNESCAPED_SLASHES) ?: 'null'),
        ]);

        return $failureId;
    }

    /** @param array<string, mixed> $data */
    private function redactSensitive(array $data): array
    {
        $out = [];
        foreach ($data as $k => $v) {
            $key = is_string($k) ? strtolower($k) : '';

            if (in_array($key, ['password', 'password_hash', 'token', 'authorization'], true)) {
                $out[$k] = '[redacted]';
                continue;
            }

            if (is_array($v)) {
                $out[$k] = $this->redactSensitive($v);
                continue;
            }

            $out[$k] = $v;
        }

        return $out;
    }
}
