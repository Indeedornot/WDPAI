<?php

declare(strict_types=1);

namespace App\Http;

enum HttpStatus: int
{
    case Ok = 200;
    case NoContent = 204;

    case BadRequest = 400;
    case Unauthorized = 401;
    case Forbidden = 403;
    case NotFound = 404;
    case Conflict = 409;

    case InternalServerError = 500;
}
