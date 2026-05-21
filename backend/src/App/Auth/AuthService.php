<?php

declare(strict_types=1);

namespace App\Auth;

use App\Container\Attributes\Injectable;
use App\Routing\Request;
use PDO;

#[Injectable]
final class AuthService
{
    private TokenRepository $tokens;

    public function __construct(PDO $pdo)
    {
        $this->tokens = new TokenRepository($pdo);
    }

    public function authenticate(Request $req): ?AuthUser
    {
        $token = $this->rawTokenFromRequest($req);
        if ($token === null) {
            return null;
        }

        return $this->tokens->findUserByToken($token);
    }

    public function rawTokenFromRequest(Request $req): ?string
    {
        $auth = $req->headers['authorization'] ?? '';
        if (is_string($auth) && trim($auth) !== '') {
            $token = $this->parseBearerToken($auth);
            if ($token !== null) {
                return $token;
            }
        }

        $cookieToken = $req->cookie('auth_token');
        if (is_string($cookieToken) && trim($cookieToken) !== '') {
            return trim($cookieToken);
        }

        return null;
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
