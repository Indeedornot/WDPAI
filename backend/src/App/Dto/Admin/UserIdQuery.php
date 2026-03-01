<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class UserIdQuery
{
    public function __construct(
        public int $userId,
    ) {
    }

    public static function fromRequest(Request $req): self
    {
        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            throw new ValidationException(ApiErrorCode::MissingUserId, HttpStatus::BadRequest, 'Missing userId.');
        }

        $userId = (int)$userIdStr;
        if ($userId <= 0) {
            throw new ValidationException(ApiErrorCode::InvalidUserId, HttpStatus::BadRequest, 'Invalid userId.');
        }

        return new self($userId);
    }
}
