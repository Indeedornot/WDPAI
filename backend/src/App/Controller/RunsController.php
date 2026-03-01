<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Dto\Runs\CreateRunInput;
use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Response;
use App\Run\RunStatsRepository;
use PDOException;

final class RunsController extends Controller
{
    #[RequireAuth]
    public function create(CreateRunInput $input, AuthUser $user): Response
    {
        try {
            $repo = new RunStatsRepository($this->kernel->pdo());
            $repo->recordRunWithAwards(
                $user->id,
                $input->timeSeconds,
                $input->level,
                $input->xp,
                $input->kills,
                $input->shotsFired,
                $input->shotsHit,
            );
        } catch (PDOException $e) {
            // PostgreSQL serialization_failure
            if ($e->getCode() === '40001') {
                return Response::error(ApiErrorCode::Retry, HttpStatus::Conflict, 'Please retry.');
            }
            throw $e;
        }

        return Response::ok();
    }
}
