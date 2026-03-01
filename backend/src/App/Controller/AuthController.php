<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthService;
use App\Auth\AuthUser;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Request;
use App\Routing\Response;
use PDOException;

final class AuthController extends Controller
{
    public function register(Request $req): Response
    {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::error('invalid_json', 400);
        }

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            return Response::error('invalid_input', 400);
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return Response::error('invalid_email', 400, 'Invalid email.');
        }
        if (strlen($password) < 8) {
            return Response::error('weak_password', 400, 'Password must be at least 8 characters.');
        }

        $userRepo = new UserRepository($this->kernel->pdo());
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($passwordHash) || $passwordHash === '') {
            return Response::error('server_error', 500);
        }

        try {
            $user = $userRepo->createPlayer($email, $passwordHash);
        } catch (PDOException $e) {
            return Response::error('email_taken', 409, 'Email already registered.');
        }

        if ($user === null) {
            return Response::error('server_error', 500);
        }

        $tokenRepo = new TokenRepository($this->kernel->pdo());
        $token = $tokenRepo->issueToken((int)$user['id']);

        return Response::ok(['token' => $token, 'user' => $user]);
    }

    public function login(Request $req): Response
    {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::error('invalid_json', 400);
        }

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            return Response::error('invalid_input', 400);
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return Response::error('invalid_credentials', 401, 'Bad credentials.');
        }

        $userRepo = new UserRepository($this->kernel->pdo());
        $row = $userRepo->findByEmail($email);
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

        if (!password_verify($password, (string)$row['password_hash'])) {
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
