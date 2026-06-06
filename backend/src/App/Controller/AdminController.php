<?php

declare(strict_types=1);

namespace App\Controller;

use App\Admin\AdminRepository;
use App\Auth\AuthUser;
use App\Auth\LoginAuditRepository;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Dto\Admin\BanUserInput;
use App\Dto\Admin\UserIdQuery;
use App\Error\ApiErrorCode;
use App\Http\HttpStatus;
use App\Routing\Attributes\PermissionPolicyGroup;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Response;

final class AdminController extends Controller
{
    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function users(AuthUser $user, AdminRepository $repo): Response
    {
        return Response::ok(['users' => $repo->listUsers()]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function saves(UserIdQuery $query, AuthUser $user, AdminRepository $repo): Response
    {
        return Response::ok(['userId' => $query->userId, 'saves' => $repo->listSavesByUser($query->userId)]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function runs(UserIdQuery $query, AuthUser $user, AdminRepository $repo): Response
    {
        return Response::ok(['userId' => $query->userId, 'runs' => $repo->listRunsByUser($query->userId)]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function loginAudit(AuthUser $user, LoginAuditRepository $repo): Response
    {
        return Response::ok(['entries' => $repo->listRecent(50)]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function latestRuns(AuthUser $user, AdminRepository $repo): Response
    {
        return Response::ok(['runs' => $repo->listLatestRuns()]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function saveSummary(AuthUser $user, AdminRepository $repo): Response
    {
        return Response::ok(['summary' => $repo->listSaveSummary()]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function ban(BanUserInput $input, AuthUser $user, UserRepository $userRepo, TokenRepository $tokenRepo): Response
    {
        if ($input->userId === $user->id) {
            return Response::error(ApiErrorCode::CannotBanSelf, HttpStatus::BadRequest, 'Cannot ban yourself.');
        }

        $userRepo->setBan($input->userId, $input->banned, $input->reason);
        if ($input->banned) {
            $tokenRepo->revokeAllForUser($input->userId);
        }

        return Response::ok();
    }
}
