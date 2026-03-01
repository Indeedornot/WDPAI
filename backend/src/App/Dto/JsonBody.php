<?php

declare(strict_types=1);

namespace App\Dto;

use App\Routing\Request;
use App\Routing\ValidationException;

final class JsonBody
{
    /** @return array<string, mixed> */
    public static function requireArray(Request $req, string $message = 'Invalid JSON.'): array
    {
        if ($req->jsonError !== null) {
            throw new ValidationException('invalid_json', 400, $message);
        }

        if (!is_array($req->json)) {
            throw new ValidationException('invalid_json', 400, $message);
        }

        /** @var array<string, mixed> */
        return $req->json;
    }
}
