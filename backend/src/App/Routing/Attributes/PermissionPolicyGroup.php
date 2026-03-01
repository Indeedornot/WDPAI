<?php

declare(strict_types=1);

namespace App\Routing\Attributes;

enum PermissionPolicyGroup
{
    case User;
    case Admin;
}
