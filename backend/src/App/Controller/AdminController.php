<?php

declare(strict_types=1);

namespace App\Controller;

use App\Auth\AuthUser;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Routing\Attributes\PermissionPolicyGroup;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Request;
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
    public function saves(Request $req, AuthUser $user): Response
    {
        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            return Response::error('missing_userId', 400);
        }
        $userId = (int)$userIdStr;

        $stmt = $this->kernel->pdo()->prepare('SELECT slot, version, updated_at FROM player_saves WHERE user_id = :uid ORDER BY updated_at DESC');
        $stmt->execute([':uid' => $userId]);
        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'slot' => (string)$r['slot'],
                'version' => (int)$r['version'],
                'updatedAt' => (string)$r['updated_at'],
            ];
        }

        return Response::ok(['userId' => $userId, 'saves' => $rows]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function runs(Request $req, AuthUser $user): Response
    {
        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            return Response::error('missing_userId', 400);
        }
        $userId = (int)$userIdStr;

        $stmt = $this->kernel->pdo()->prepare('SELECT created_at, time_seconds, level, xp, kills, shots_fired, shots_hit FROM player_run_stats WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([':uid' => $userId]);
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

        return Response::ok(['userId' => $userId, 'runs' => $rows]);
    }

    #[RequireAuth(policy: PermissionPolicyGroup::Admin)]
    public function ban(Request $req, AuthUser $user): Response
    {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::error('invalid_json', 400, 'Invalid JSON.');
        }

        $userId = $body['userId'] ?? null;
        $banned = $body['banned'] ?? null;
        $reason = $body['reason'] ?? null;

        if (!is_int($userId)) {
            return Response::error('invalid_userId', 400, 'Invalid userId.');
        }
        if (!is_bool($banned)) {
            return Response::error('invalid_banned', 400, 'Invalid banned flag.');
        }
        if ($reason !== null && !is_string($reason)) {
            return Response::error('invalid_reason', 400, 'Invalid reason.');
        }

        if ($userId === $user->id) {
            return Response::error('cannot_ban_self', 400, 'Cannot ban yourself.');
        }

        $userRepo = new UserRepository($this->kernel->pdo());
        $tokenRepo = new TokenRepository($this->kernel->pdo());

        $userRepo->setBan($userId, $banned, $reason);
        if ($banned) {
            $tokenRepo->revokeAllForUser($userId);
        }

        return Response::ok();
    }
}
