<?php

declare(strict_types=1);

namespace App\Dto\Save;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class SlotQuery
{
    public function __construct(
        public string $slot,
    ) {
    }

    public static function fromRequest(Request $req): self
    {
        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            throw new ValidationException(ApiErrorCode::MissingSlot, HttpStatus::BadRequest, 'Missing slot.');
        }

        $slot = trim($slot);
        if (strlen($slot) > 255) {
            throw new ValidationException(ApiErrorCode::InvalidSlot, HttpStatus::BadRequest, 'Slot is too long.');
        }

        return new self($slot);
    }
}
