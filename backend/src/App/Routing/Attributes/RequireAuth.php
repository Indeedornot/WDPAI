<?php

declare(strict_types=1);

namespace App\Routing\Attributes;

use Attribute;

#[Attribute(Attribute::TARGET_METHOD)]
final class RequireAuth
{
    public function __construct(
        public readonly PermissionPolicyGroup $policy = PermissionPolicyGroup::User,
        public readonly bool $allowBanned = false,
    ) {
    }
}
