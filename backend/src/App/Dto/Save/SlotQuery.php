<?php

declare(strict_types=1);

namespace App\Dto\Save;

use App\Routing\Request;
use App\Routing\Response;

final readonly class SlotQuery
{
    public function __construct(
        public string $slot,
    ) {
    }

    public static function fromRequest(Request $req): self|Response
    {
        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            return Response::error('missing_slot', 400, 'Missing slot.');
        }

        $slot = trim($slot);
        if (strlen($slot) > 255) {
            return Response::error('invalid_slot', 400, 'Slot is too long.');
        }

        return new self($slot);
    }
}
