<?php

declare(strict_types=1);

namespace App\Controller;

use App\Routing\Response;

final class HealthController extends Controller
{
    public function health(): Response
    {
        return Response::ok(['service' => 'my-ts-app-backend']);
    }
}
