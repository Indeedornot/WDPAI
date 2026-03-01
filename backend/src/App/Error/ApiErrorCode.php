<?php

declare(strict_types=1);

namespace App\Error;

/**
 * Stable machine-readable API error codes.
 *
 * These values intentionally match the existing response payloads.
 */
enum ApiErrorCode: string
{
    case JsonEncodeFailed = 'json_encode_failed';

    case InvalidJson = 'invalid_json';
    case InvalidInput = 'invalid_input';

    case InvalidEmail = 'invalid_email';
    case WeakPassword = 'weak_password';
    case EmailTaken = 'email_taken';

    case InvalidCredentials = 'invalid_credentials';

    case Unauthorized = 'unauthorized';
    case Forbidden = 'forbidden';
    case Banned = 'banned';

    case MissingSlot = 'missing_slot';
    case InvalidSlot = 'invalid_slot';
    case MissingSnapshot = 'missing_snapshot';

    case MissingUserId = 'missing_userId';
    case InvalidUserId = 'invalid_userId';

    case InvalidBanned = 'invalid_banned';
    case InvalidReason = 'invalid_reason';
    case CannotBanSelf = 'cannot_ban_self';

    case Retry = 'retry';

    case NotFound = 'not_found';
    case ServerError = 'server_error';
}
