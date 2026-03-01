<?php

declare(strict_types=1);

namespace App\Dto;

use App\Routing\Request;
use App\Routing\Response;

final class JsonBody
{
    /** @return array<string, mixed>|Response */
    public static function requireArray(Request $req, string $message = 'Invalid JSON.'): array|Response
    {
        if ($req->jsonError !== null) {
            return Response::error('invalid_json', 400, $message);
        }

        if (!is_array($req->json)) {
            return Response::error('invalid_json', 400, $message);
        }

        /** @var array<string, mixed> */
        return $req->json;
    }
}
