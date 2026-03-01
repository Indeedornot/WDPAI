<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Dto\Save\SlotQuery;
use App\Dto\Save\UpsertSaveInput;
use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Response;
use App\Save\PlayerSaveRepository;

final class SaveController extends Controller
{
    #[RequireAuth]
    public function get(SlotQuery $query, AuthUser $user): Response
    {
        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $row = $repo->findByUserAndSlot($user->id, $query->slot);
        if ($row === null) {
            return Response::error(ApiErrorCode::NotFound, HttpStatus::NotFound);
        }

        return Response::ok([
            'slot' => $row['slot'],
            'version' => $row['version'],
            'snapshot' => $row['payload'],
            'updatedAt' => $row['updated_at'],
        ]);
    }

    #[RequireAuth]
    public function upsert(UpsertSaveInput $input, AuthUser $user): Response
    {
        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $repo->upsert($user->id, $input->slot, $input->snapshot, $input->version);
        return Response::ok();
    }

    #[RequireAuth]
    public function delete(SlotQuery $query, AuthUser $user): Response
    {
        $repo = new PlayerSaveRepository($this->kernel->pdo());
        $repo->deleteByUserAndSlot($user->id, $query->slot);
        return Response::ok();
    }
}
