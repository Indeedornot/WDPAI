<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthService;
use App\Auth\AuthUser;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Dto\Auth\LoginInput;
use App\Dto\Auth\RegisterInput;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Request;
use App\Routing\Response;
use PDOException;
use RuntimeException;

final class AuthController extends Controller
{
    public function register(Request $req): Response
    {
        $input = RegisterInput::fromRequest($req);
        if ($input instanceof Response) {
            return $input;
        }

        $userRepo = new UserRepository($this->kernel->pdo());
        $passwordHash = password_hash($input->password, PASSWORD_DEFAULT);
        if (!is_string($passwordHash) || $passwordHash === '') {
            throw new RuntimeException('Failed to hash password.');
        }

        try {
            $user = $userRepo->createPlayer($input->email, $passwordHash);
        } catch (PDOException $e) {
            // PostgreSQL unique_violation
            if ($e->getCode() === '23505') {
                return Response::error('email_taken', 409, 'Email already registered.');
            }
            throw $e;
        }

        if ($user === null) {
            throw new RuntimeException('Failed to create user.');
        }

        $tokenRepo = new TokenRepository($this->kernel->pdo());
        $token = $tokenRepo->issueToken((int)$user['id']);

        return Response::ok(['token' => $token, 'user' => $user]);
    }

    public function login(Request $req): Response
    {
        $input = LoginInput::fromRequest($req);
        if ($input instanceof Response) {
            return $input;
        }

        $userRepo = new UserRepository($this->kernel->pdo());
        $row = $userRepo->findByEmail($input->email);
        if ($row === null) {
            return Response::error('invalid_credentials', 401, 'Bad credentials.');
        }

        if (($row['banned_at'] ?? null) !== null) {
            $reason = $row['banned_reason'] ?? null;
            $msg = 'Account banned.';
            if (is_string($reason) && trim($reason) !== '') {
                $msg = 'Account banned: ' . trim($reason);
            }
            return Response::error('banned', 403, $msg);
        }

        if (!password_verify($input->password, (string)$row['password_hash'])) {
            return Response::error('invalid_credentials', 401, 'Bad credentials.');
        }

        $userRepo->markLogin((int)$row['id']);

        $tokenRepo = new TokenRepository($this->kernel->pdo());
        $token = $tokenRepo->issueToken((int)$row['id']);

        return Response::ok([
            'token' => $token,
            'user' => [
                'id' => (int)$row['id'],
                'email' => (string)$row['email'],
                'role' => (string)$row['role'],
            ],
        ]);
    }

    #[RequireAuth(allowBanned: true)]
    public function logout(Request $req, AuthUser $user): Response
    {
        // $user is unused, but required for #[RequireAuth] to authenticate the token.
        $authorization = $req->headers['authorization'] ?? '';
        $authorization = is_string($authorization) ? $authorization : '';

        $auth = new AuthService($this->kernel->pdo());
        $token = $auth->parseBearerToken($authorization);
        if ($token === null) {
            return Response::error('unauthorized', 401);
        }

        $tokenRepo = new TokenRepository($this->kernel->pdo());
        $tokenRepo->revoke($token);
        return Response::ok();
    }
}
