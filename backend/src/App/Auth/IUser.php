<?php

declare(strict_types=1);

namespace App\Auth;

interface IUser
{
    public function id(): int;

    public function email(): string;

    public function role(): string;
}
