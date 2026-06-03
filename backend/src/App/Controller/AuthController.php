<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthService;
use App\Auth\AuthUser;
use App\Auth\CsrfTokenGenerator;
use App\Auth\Dto\Response\AuthSessionResponse;
use App\Auth\Dto\Response\CsrfTokenResponse;
use App\Auth\EmailAlreadyExistsException;
use App\Auth\LoginAuditReason;
use App\Auth\LoginAuditRepository;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Constants\AuthConstants;
use App\Dto\Auth\LoginInput;
use App\Dto\Auth\RegisterInput;
use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Dto\CookieOptions;
use App\Routing\Request;
use App\Routing\Response;
use DateTimeImmutable;
use DateTimeInterface;
use RuntimeException;

final class AuthController extends Controller
{
    public function register(RegisterInput $input, UserRepository $userRepo, TokenRepository $tokenRepo): Response
    {
        $passwordHash = $this->hashPassword($input->password);

        try {
            $user = $userRepo->createPlayer($input->email, $passwordHash);
        } catch (EmailAlreadyExistsException) {
            return Response::error(ApiErrorCode::InvalidInput, HttpStatus::BadRequest, AuthConstants::MSG_REGISTRATION_FAILED);
        }

        if ($user === null) {
            throw new RuntimeException(AuthConstants::MSG_USER_CREATE_FAILED);
        }

        return $this->issueSession((int)$user['id'], $user['email'], $user['role'], $tokenRepo);
    }

    public function login(LoginInput $input, UserRepository $userRepo, LoginAuditRepository $audit, TokenRepository $tokenRepo): Response
    {
        $row = $userRepo->findByEmail($input->email);
        if ($row === null) {
            $audit->logFailed($input->email, LoginAuditReason::NotFound);
            return Response::error(ApiErrorCode::InvalidCredentials, HttpStatus::Unauthorized, AuthConstants::MSG_BAD_CREDENTIALS);
        }

        if (($row['banned_at'] ?? null) !== null) {
            $reason = $row['banned_reason'] ?? null;
            $msg = AuthConstants::MSG_ACCOUNT_BANNED;
            if (is_string($reason) && trim($reason) !== '') {
                $msg = AuthConstants::MSG_ACCOUNT_BANNED_WITH_REASON . trim($reason);
            }
            return Response::error(ApiErrorCode::Banned, HttpStatus::Forbidden, $msg);
        }

        if (!password_verify($input->password, (string)$row['password_hash'])) {
            $audit->logFailed($input->email, LoginAuditReason::InvalidPassword);
            return Response::error(ApiErrorCode::InvalidCredentials, HttpStatus::Unauthorized, AuthConstants::MSG_BAD_CREDENTIALS);
        }

        $userRepo->markLogin((int)$row['id']);
        $audit->logSuccess($input->email);

        return $this->issueSession((int)$row['id'], (string)$row['email'], (string)$row['role'], $tokenRepo);
    }

    public function csrf(Request $req, CsrfTokenGenerator $tokenGenerator): Response
    {
        $token = $tokenGenerator->generate();
        return Response::ok(new CsrfTokenResponse($token))
            ->withCookie(AuthConstants::CSRF_COOKIE_NAME, $token, $this->csrfCookieOptions($req));
    }

    #[RequireAuth(allowBanned: true)]
    public function session(Request $req, AuthUser $user, TokenRepository $tokenRepo, AuthService $auth): Response
    {
        $rawToken = $auth->rawTokenFromRequest($req);
        if ($rawToken === null) {
            return Response::error(ApiErrorCode::Unauthorized, HttpStatus::Unauthorized, AuthConstants::MSG_MISSING_INVALID_TOKEN);
        }

        $session = $tokenRepo->findSessionByToken($rawToken);
        if ($session === null) {
            return Response::error(ApiErrorCode::Unauthorized, HttpStatus::Unauthorized, AuthConstants::MSG_MISSING_INVALID_TOKEN);
        }

        return Response::ok(AuthSessionResponse::fromSession($session));
    }

    #[RequireAuth(allowBanned: true)]
    public function refresh(Request $req, AuthUser $user, TokenRepository $tokenRepo, AuthService $auth): Response
    {
        if ($user->isBanned()) {
            return Response::error(ApiErrorCode::Banned, HttpStatus::Forbidden, AuthConstants::MSG_ACCOUNT_BANNED);
        }

        $rawToken = $auth->rawTokenFromRequest($req);
        if ($rawToken === null) {
            return Response::error(ApiErrorCode::Unauthorized, HttpStatus::Unauthorized, AuthConstants::MSG_MISSING_INVALID_TOKEN);
        }

        $tokenRepo->revoke($rawToken);

        return $this->issueSession($user->id, $user->email, $user->role, $tokenRepo);
    }

    #[RequireAuth(allowBanned: true)]
    public function logout(Request $req, AuthUser $user, TokenRepository $tokenRepo, AuthService $auth): Response
    {
        $token = $auth->rawTokenFromRequest($req);
        if ($token === null) {
            return Response::error(ApiErrorCode::Unauthorized, HttpStatus::Unauthorized);
        }

        $tokenRepo->revoke($token);

        return Response::ok()->deleteCookie(AuthConstants::AUTH_TOKEN_COOKIE_NAME);
    }

    private function issueSession(int $userId, string $email, string $role, TokenRepository $tokenRepo): Response
    {
        $expiresAt = (new DateTimeImmutable(AuthConstants::TOKEN_TTL))->format(DateTimeInterface::ATOM);
        $rawToken = $tokenRepo->issueToken($userId, $expiresAt);

        return Response::ok(new AuthSessionResponse($expiresAt, new \App\Auth\Dto\Response\UserResponse($userId, $email, $role)))
            ->withCookie(AuthConstants::AUTH_TOKEN_COOKIE_NAME, $rawToken, $this->authCookieOptions($expiresAt));
    }

    private function authCookieOptions(string $expiresAt): array
    {
        return (new CookieOptions(
            path: AuthConstants::COOKIE_PATH,
            secure: AuthConstants::COOKIE_SECURE,
            httpOnly: AuthConstants::COOKIE_HTTP_ONLY,
            sameSite: AuthConstants::COOKIE_SAME_SITE,
            expires: $expiresAt,
        ))->toArray();
    }

    private function csrfCookieOptions(Request $req): array
    {
        return (new CookieOptions(
            path: AuthConstants::COOKIE_PATH,
            secure: $req->secure,
            httpOnly: false,
            sameSite: AuthConstants::COOKIE_SAME_SITE,
        ))->toArray();
    }

    /** @return non-empty-string */
    private function hashPassword(string $password): string
    {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($hash)) {
            throw new RuntimeException(AuthConstants::MSG_PASSWORD_HASH_FAILED);
        }
        return $hash;
    }
}
