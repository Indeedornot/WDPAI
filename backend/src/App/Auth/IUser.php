<?php

declare(strict_types=1);

namespace App\Auth;

interface IUser
{
    public string $email { get; }
    public string $role { get; }
    public int $id { get; }
}
