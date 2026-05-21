<?php

declare(strict_types=1);

namespace App\Constants;

final class AuthConstants
{
    // Auth token configuration
    public const TOKEN_TTL = '+7 days';
    public const CSRF_TOKEN_BYTES = 32;
    public const CSRF_COOKIE_NAME = 'csrf_token';
    public const AUTH_TOKEN_COOKIE_NAME = 'auth_token';

    // Cookie configuration
    public const COOKIE_PATH = '/';
    public const COOKIE_SECURE = true;
    public const COOKIE_HTTP_ONLY = true;
    public const COOKIE_SAME_SITE = 'Lax';

    // Error messages
    public const MSG_BAD_CREDENTIALS = 'Bad credentials.';
    public const MSG_ACCOUNT_BANNED = 'Account banned.';
    public const MSG_ACCOUNT_BANNED_WITH_REASON = 'Account banned: ';
    public const MSG_MISSING_INVALID_TOKEN = 'Missing or invalid token.';
    public const MSG_REGISTRATION_FAILED = 'Registration failed.';
    public const MSG_PASSWORD_HASH_FAILED = 'Failed to hash password.';
    public const MSG_USER_CREATE_FAILED = 'Failed to create user.';
}
