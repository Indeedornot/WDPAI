<?php

declare(strict_types=1);

namespace App\Auth;

enum LoginAuditReason: string
{
    case Success = 'success';
    case NotFound = 'not_found';
    case InvalidPassword = 'invalid_password';
}
