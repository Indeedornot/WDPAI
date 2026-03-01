<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Request;
use App\Routing\Response;
use App\Save\PlayerSaveRepository;

final class SaveController extends Controller
{
    #[RequireAuth]
    public function get(Request $req, AuthUser $user): Response
    {
        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            return Response::error('missing_slot', 400);
        }

        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $row = $repo->findByUserAndSlot($user->id, $slot);
        if ($row === null) {
            return Response::error('not_found', 404);
        }

        return Response::ok([
            'slot' => $row['slot'],
            'version' => $row['version'],
            'snapshot' => $row['payload'],
            'updatedAt' => $row['updated_at'],
        ]);
    }

    #[RequireAuth]
    public function upsert(Request $req, AuthUser $user): Response
    {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::error('invalid_json', 400);
        }

        $slot = $body['slot'] ?? null;
        $snapshot = $body['snapshot'] ?? null;
        $version = $body['version'] ?? 1;

        if (!is_string($slot) || trim($slot) === '') {
            return Response::error('missing_slot', 400);
        }
        if ($snapshot === null) {
            return Response::error('missing_snapshot', 400);
        }
        if (!is_int($version)) {
            $version = 1;
        }

        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $repo->upsert($user->id, $slot, $snapshot, $version);
        return Response::ok();
    }

    #[RequireAuth]
    public function delete(Request $req, AuthUser $user): Response
    {
        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            return Response::error('missing_slot', 400);
        }

        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $repo->deleteByUserAndSlot($user->id, $slot);
        return Response::ok();
    }
}
