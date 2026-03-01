<?php

declare(strict_types=1);

namespace App\Dto\Admin;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class BanUserInput
{
    public function __construct(
        public int $userId,
        public bool $banned,
        public ?string $reason,
    ) {
    }

    public static function fromRequest(Request $req): self
    {
        $body = JsonBody::requireArray($req);

        $userId = $body['userId'] ?? null;
        $banned = $body['banned'] ?? null;
        $reason = $body['reason'] ?? null;

        $userIdInt = null;
        if (is_int($userId)) {
            $userIdInt = $userId;
        } elseif (is_numeric($userId) && (string)(int)$userId === (string)$userId) {
            $userIdInt = (int)$userId;
        }

        if ($userIdInt === null || $userIdInt <= 0) {
            throw new ValidationException('invalid_userId', 400, 'Invalid userId.');
        }
        if (!is_bool($banned)) {
            throw new ValidationException('invalid_banned', 400, 'Invalid banned flag.');
        }
        if ($reason !== null && !is_string($reason)) {
            throw new ValidationException('invalid_reason', 400, 'Invalid reason.');
        }

        $reasonNorm = null;
        if (is_string($reason)) {
            $reasonNorm = trim($reason);
            if ($reasonNorm === '') {
                $reasonNorm = null;
            }
            if ($reasonNorm !== null && strlen($reasonNorm) > 255) {
                throw new ValidationException('invalid_reason', 400, 'Reason is too long.');
            }
        }

        return new self($userIdInt, $banned, $reasonNorm);
    }
}
