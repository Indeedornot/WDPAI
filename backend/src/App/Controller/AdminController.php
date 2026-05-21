<?php

declare(strict_types=1);

namespace App\Controller;

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
    public function users(AuthUser $user): Response
    {
        $stmt = $this->kernel->pdo()->query('SELECT id, email, role, created_at, last_login_at, banned_at, banned_reason FROM users ORDER BY id ASC');
        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'id' => (int)$r['id'],
                'email' => (string)$r['email'],
                'role' => (string)$r['role'],
                'createdAt' => (string)$r['created_at'],
                'lastLoginAt' => $r['last_login_at'] === null ? null : (string)$r['last_login_at'],
                'bannedAt' => $r['banned_at'] === null ? null : (string)$r['banned_at'],
                'bannedReason' => $r['banned_reason'] === null ? null : (string)$r['banned_reason'],
            ];
        }

        return Response::ok(['users' => $rows]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function saves(UserIdQuery $query, AuthUser $user): Response
    {
        $stmt = $this->kernel->pdo()->prepare('SELECT slot, version, updated_at FROM player_saves WHERE user_id = :uid ORDER BY updated_at DESC');
        $stmt->execute([':uid' => $query->userId]);
        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'slot' => (string)$r['slot'],
                'version' => (int)$r['version'],
                'updatedAt' => (string)$r['updated_at'],
            ];
        }

        return Response::ok(['userId' => $query->userId, 'saves' => $rows]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function runs(UserIdQuery $query, AuthUser $user): Response
    {
        $stmt = $this->kernel->pdo()->prepare('SELECT created_at, time_seconds, level, xp, kills, shots_fired, shots_hit FROM player_run_stats WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([':uid' => $query->userId]);
        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'createdAt' => (string)$r['created_at'],
                'timeSeconds' => (int)$r['time_seconds'],
                'level' => (int)$r['level'],
                'xp' => (int)$r['xp'],
                'kills' => (int)$r['kills'],
                'shotsFired' => (int)$r['shots_fired'],
                'shotsHit' => (int)$r['shots_hit'],
            ];
        }

        return Response::ok(['userId' => $query->userId, 'runs' => $rows]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function loginAudit(AuthUser $user, LoginAuditRepository $repo): Response
    {
        return Response::ok(['entries' => $repo->listRecent(50)]);
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
