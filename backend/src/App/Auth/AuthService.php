<?php

declare(strict_types=1);

namespace App\Auth;

use App\Routing\Request;
use PDO;

final class AuthService
{
    private TokenRepository $tokens;

    public function __construct(PDO $pdo)
    {
        $this->tokens = new TokenRepository($pdo);
    }

    public function authenticate(Request $req): ?AuthUser
    {
        $auth = $req->headers['authorization'] ?? '';
        if (!is_string($auth) || trim($auth) === '') {
            return null;
        }

        $token = $this->parseBearerToken($auth);
        if ($token === null) {
            return null;
        }

        return $this->tokens->findUserByToken($token);
    }

    public function parseBearerToken(string $authorizationHeader): ?string
    {
        $h = trim($authorizationHeader);
        if ($h === '') {
            return null;
        }

        // Case-insensitive "Bearer" scheme.
        if (stripos($h, 'bearer ') !== 0) {
            return null;
        }

        $token = trim(substr($h, 7));
        return $token !== '' ? $token : null;
    }
}
