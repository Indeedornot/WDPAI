<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Request;
use App\Routing\Response;
use App\Run\RunStatsRepository;
use PDOException;

final class RunsController extends Controller
{
    #[RequireAuth]
    public function create(Request $req, AuthUser $user): Response
    {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::error('invalid_json', 400, 'Invalid JSON.');
        }

        $timeSeconds = $body['timeSeconds'] ?? null;
        $level = $body['level'] ?? null;
        $xp = $body['xp'] ?? null;
        $kills = $body['kills'] ?? null;
        $shotsFired = $body['shotsFired'] ?? null;
        $shotsHit = $body['shotsHit'] ?? null;

        if (!is_numeric($timeSeconds) || !is_numeric($level) || !is_numeric($xp) || !is_numeric($kills) || !is_numeric($shotsFired) || !is_numeric($shotsHit)) {
            return Response::error('invalid_input', 400, 'Invalid run stats.');
        }

        $timeSeconds = max(0, (int)round((float)$timeSeconds));
        $level = max(1, (int)round((float)$level));
        $xp = max(0, (int)round((float)$xp));
        $kills = max(0, (int)round((float)$kills));
        $shotsFired = max(0, (int)round((float)$shotsFired));
        $shotsHit = max(0, (int)round((float)$shotsHit));
        if ($shotsHit > $shotsFired) {
            $shotsHit = $shotsFired;
        }

        try {
            $repo = new RunStatsRepository($this->kernel->pdo());
            $repo->recordRunWithAwards(
                $user->id,
                $timeSeconds,
                $level,
                $xp,
                $kills,
                $shotsFired,
                $shotsHit,
            );
        } catch (PDOException $e) {
            // PostgreSQL serialization_failure
            if ($e->getCode() === '40001') {
                return Response::error('retry', 409, 'Please retry.');
            }
            throw $e;
        }

        return Response::ok();
    }
}
