<?php

declare(strict_types=1);

namespace App\Dto\Save;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class UpsertSaveInput
{
    public function __construct(
        public string $slot,
        public mixed $snapshot,
        public int $version,
    ) {
    }

    public static function fromRequest(Request $req): self
    {
        $body = JsonBody::requireArray($req);

        $slot = $body['slot'] ?? null;
        $snapshot = $body['snapshot'] ?? null;
        $version = $body['version'] ?? 1;

        if (!is_string($slot) || trim($slot) === '') {
            throw new ValidationException('missing_slot', 400, 'Missing slot.');
        }
        $slot = trim($slot);
        if (strlen($slot) > 255) {
            throw new ValidationException('invalid_slot', 400, 'Slot is too long.');
        }

        if ($snapshot === null) {
            throw new ValidationException('missing_snapshot', 400, 'Missing snapshot.');
        }

        $versionInt = 1;
        if (is_int($version)) {
            $versionInt = $version;
        } elseif (is_numeric($version)) {
            $versionInt = (int)round((float)$version);
        }
        if ($versionInt < 1) {
            $versionInt = 1;
        }

        return new self($slot, $snapshot, $versionInt);
    }
}
