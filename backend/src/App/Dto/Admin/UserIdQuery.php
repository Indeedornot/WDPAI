<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Routing\Request;
use App\Routing\Response;

final readonly class UserIdQuery
{
    public function __construct(
        public int $userId,
    ) {
    }

    public static function fromRequest(Request $req): self|Response
    {
        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            return Response::error('missing_userId', 400, 'Missing userId.');
        }

        $userId = (int)$userIdStr;
        if ($userId <= 0) {
            return Response::error('invalid_userId', 400, 'Invalid userId.');
        }

        return new self($userId);
    }
}
