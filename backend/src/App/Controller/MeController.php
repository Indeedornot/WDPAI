<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Response;

final class MeController extends Controller
{
    #[RequireAuth]
    public function me(AuthUser $user): Response
    {
        return Response::ok(['user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}
