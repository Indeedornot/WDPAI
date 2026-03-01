<?php

declare(strict_types=1);

namespace App\Dto;

use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Request;
use App\Routing\ValidationException;

final class JsonBody
{
    /** @return array<string, mixed> */
    public static function requireArray(Request $req, string $message = 'Invalid JSON.'): array
    {
        if ($req->jsonError !== null) {
            throw new ValidationException(ApiErrorCode::InvalidJson, HttpStatus::BadRequest, $message);
        }

        if (!is_array($req->json)) {
            throw new ValidationException(ApiErrorCode::InvalidJson, HttpStatus::BadRequest, $message);
        }

        /** @var array<string, mixed> */
        return $req->json;
    }
}
