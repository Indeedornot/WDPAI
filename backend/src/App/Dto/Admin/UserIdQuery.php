<?php

declare(strict_types=1);

namespace App\Dto\Admin;

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
            throw new ValidationException('missing_userId', 400, 'Missing userId.');
        }

        $userId = (int)$userIdStr;
        if ($userId <= 0) {
            throw new ValidationException('invalid_userId', 400, 'Invalid userId.');
        }

        return new self($userId);
    }
}
