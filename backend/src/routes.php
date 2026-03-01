<?php

declare(strict_types=1);

namespace App\Routes;

use App\Auth\AuthService;
use App\Auth\TokenRepository;
use App\Auth\UserRepository;
use App\Kernel;
use App\Routing\App;
use App\Routing\Request;
use App\Routing\Response;
use App\Save\PlayerSaveRepository;
use PDOException;

/**
 * Minimal-API style endpoint mapping.
 */
function map_endpoints(App $app): void
{
    $requireUser = static function (Request $req, Kernel $kernel) {
        $auth = new AuthService($kernel->pdo());
        $user = $auth->authenticate($req);
        return $user;
    };

    $app->get('/health', static function (Request $req, Kernel $kernel): Response {
        return Response::json(['ok' => true, 'service' => 'my-ts-app-backend']);
    });

    $app->post('/auth/register', static function (Request $req, Kernel $kernel): Response {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::json(['ok' => false, 'error' => 'invalid_json'], 400);
        }

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            return Response::json(['ok' => false, 'error' => 'invalid_input'], 400);
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return Response::json(['ok' => false, 'error' => 'invalid_email', 'message' => 'Invalid email.'], 400);
        }
        if (strlen($password) < 8) {
            return Response::json(['ok' => false, 'error' => 'weak_password', 'message' => 'Password must be at least 8 characters.'], 400);
        }

        $userRepo = new UserRepository($kernel->pdo());
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($passwordHash) || $passwordHash === '') {
            return Response::json(['ok' => false, 'error' => 'server_error'], 500);
        }

        try {
            $user = $userRepo->createPlayer($email, $passwordHash);
        } catch (PDOException $e) {
            return Response::json(['ok' => false, 'error' => 'email_taken', 'message' => 'Email already registered.'], 409);
        }

        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'server_error'], 500);
        }

        $tokenRepo = new TokenRepository($kernel->pdo());
        $token = $tokenRepo->issueToken((int)$user['id']);

        return Response::json([
            'ok' => true,
            'token' => $token,
            'user' => $user,
        ]);
    });

    $app->post('/auth/login', static function (Request $req, Kernel $kernel): Response {
        $body = $req->json;
        if (!is_array($body)) {
            return Response::json(['ok' => false, 'error' => 'invalid_json'], 400);
        }

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            return Response::json(['ok' => false, 'error' => 'invalid_input'], 400);
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return Response::json(['ok' => false, 'error' => 'invalid_credentials', 'message' => 'Bad credentials.'], 401);
        }

        $userRepo = new UserRepository($kernel->pdo());
        $row = $userRepo->findByEmail($email);
        if ($row === null) {
            return Response::json(['ok' => false, 'error' => 'invalid_credentials', 'message' => 'Bad credentials.'], 401);
        }

        if (($row['banned_at'] ?? null) !== null) {
            $reason = $row['banned_reason'] ?? null;
            $msg = 'Account banned.';
            if (is_string($reason) && trim($reason) !== '') {
                $msg = 'Account banned: ' . trim($reason);
            }
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => $msg], 403);
        }

        if (!password_verify($password, (string)$row['password_hash'])) {
            return Response::json(['ok' => false, 'error' => 'invalid_credentials', 'message' => 'Bad credentials.'], 401);
        }

        $userRepo->markLogin((int)$row['id']);

        $tokenRepo = new TokenRepository($kernel->pdo());
        $token = $tokenRepo->issueToken((int)$row['id']);

        return Response::json([
            'ok' => true,
            'token' => $token,
            'user' => [
                'id' => (int)$row['id'],
                'email' => (string)$row['email'],
                'role' => (string)$row['role'],
            ],
        ]);
    });

    $app->post('/auth/logout', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $auth = new AuthService($kernel->pdo());
        $authorization = $req->headers['authorization'] ?? '';
        $token = is_string($authorization) ? $auth->parseBearerToken($authorization) : null;
        if ($token === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized'], 401);
        }

        $user = $requireUser($req, $kernel);
        // logout is allowed even for banned users if they still have a token
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }

        $tokenRepo = new TokenRepository($kernel->pdo());
        $tokenRepo->revoke($token);
        return Response::json(['ok' => true]);
    });

    $app->get('/me', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }

        return Response::json([
            'ok' => true,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    });

    $app->post('/runs', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }

        $body = $req->json;
        if (!is_array($body)) {
            return Response::json(['ok' => false, 'error' => 'invalid_json', 'message' => 'Invalid JSON.'], 400);
        }

        $timeSeconds = $body['timeSeconds'] ?? null;
        $level = $body['level'] ?? null;
        $xp = $body['xp'] ?? null;
        $kills = $body['kills'] ?? null;
        $shotsFired = $body['shotsFired'] ?? null;
        $shotsHit = $body['shotsHit'] ?? null;

        if (!is_numeric($timeSeconds) || !is_numeric($level) || !is_numeric($xp) || !is_numeric($kills) || !is_numeric($shotsFired) || !is_numeric($shotsHit)) {
            return Response::json(['ok' => false, 'error' => 'invalid_input', 'message' => 'Invalid run stats.'], 400);
        }

        $timeSeconds = max(0, (int)round((float)$timeSeconds));
        $level = max(1, (int)round((float)$level));
        $xp = max(0, (int)round((float)$xp));
        $kills = max(0, (int)round((float)$kills));
        $shotsFired = max(0, (int)round((float)$shotsFired));
        $shotsHit = max(0, (int)round((float)$shotsHit));
        if ($shotsHit > $shotsFired) $shotsHit = $shotsFired;

        $stmt = $kernel->pdo()->prepare(
            'INSERT INTO player_run_stats (user_id, time_seconds, level, xp, kills, shots_fired, shots_hit) VALUES (:uid, :t, :lvl, :xp, :k, :sf, :sh)'
        );
        $stmt->execute([
            ':uid' => $user->id,
            ':t' => $timeSeconds,
            ':lvl' => $level,
            ':xp' => $xp,
            ':k' => $kills,
            ':sf' => $shotsFired,
            ':sh' => $shotsHit,
        ]);

        return Response::json(['ok' => true]);
    });

    $app->get('/admin/users', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }
        if (!$user->isAdmin()) {
            return Response::json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $stmt = $kernel->pdo()->query('SELECT id, email, role, created_at, last_login_at, banned_at, banned_reason FROM users ORDER BY id ASC');
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

        return Response::json(['ok' => true, 'users' => $rows]);
    });

    $app->get('/admin/saves', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }
        if (!$user->isAdmin()) {
            return Response::json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            return Response::json(['ok' => false, 'error' => 'missing_userId'], 400);
        }
        $userId = (int)$userIdStr;

        $stmt = $kernel->pdo()->prepare('SELECT slot, version, updated_at FROM player_saves WHERE user_id = :uid ORDER BY updated_at DESC');
        $stmt->execute([':uid' => $userId]);
        $rows = [];
        foreach ($stmt->fetchAll() as $r) {
            $rows[] = [
                'slot' => (string)$r['slot'],
                'version' => (int)$r['version'],
                'updatedAt' => (string)$r['updated_at'],
            ];
        }

        return Response::json(['ok' => true, 'userId' => $userId, 'saves' => $rows]);
    });

    $app->get('/admin/runs', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }
        if (!$user->isAdmin()) {
            return Response::json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $userIdStr = $req->queryString('userId');
        if ($userIdStr === null || trim($userIdStr) === '' || !ctype_digit($userIdStr)) {
            return Response::json(['ok' => false, 'error' => 'missing_userId'], 400);
        }
        $userId = (int)$userIdStr;

        $stmt = $kernel->pdo()->prepare('SELECT created_at, time_seconds, level, xp, kills, shots_fired, shots_hit FROM player_run_stats WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50');
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

        return Response::json(['ok' => true, 'userId' => $userId, 'runs' => $rows]);
    });

    $app->post('/admin/ban', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }
        if (!$user->isAdmin()) {
            return Response::json(['ok' => false, 'error' => 'forbidden'], 403);
        }

        $body = $req->json;
        if (!is_array($body)) {
            return Response::json(['ok' => false, 'error' => 'invalid_json', 'message' => 'Invalid JSON.'], 400);
        }

        $userId = $body['userId'] ?? null;
        $banned = $body['banned'] ?? null;
        $reason = $body['reason'] ?? null;

        if (!is_int($userId)) {
            return Response::json(['ok' => false, 'error' => 'invalid_userId', 'message' => 'Invalid userId.'], 400);
        }
        if (!is_bool($banned)) {
            return Response::json(['ok' => false, 'error' => 'invalid_banned', 'message' => 'Invalid banned flag.'], 400);
        }
        if ($reason !== null && !is_string($reason)) {
            return Response::json(['ok' => false, 'error' => 'invalid_reason', 'message' => 'Invalid reason.'], 400);
        }

        if ($userId === $user->id) {
            return Response::json(['ok' => false, 'error' => 'cannot_ban_self', 'message' => 'Cannot ban yourself.'], 400);
        }

        $userRepo = new UserRepository($kernel->pdo());
        $tokenRepo = new TokenRepository($kernel->pdo());

        $userRepo->setBan($userId, $banned, $reason);
        if ($banned) {
            $tokenRepo->revokeAllForUser($userId);
        }

        return Response::json(['ok' => true]);
    });

    $app->get('/save', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }

        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            return Response::json(['ok' => false, 'error' => 'missing_slot'], 400);
        }

        $repo = new PlayerSaveRepository($kernel->pdo());
        $row = $repo->findByUserAndSlot($user->id, $slot);
        if ($row === null) {
            return Response::json(['ok' => false, 'error' => 'not_found'], 404);
        }

        return Response::json([
            'ok' => true,
            'slot' => $row['slot'],
            'version' => $row['version'],
            'snapshot' => $row['payload'],
            'updatedAt' => $row['updated_at'],
        ]);
    });

    $app->post('/save', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }

        $body = $req->json;
        if (!is_array($body)) {
            return Response::json(['ok' => false, 'error' => 'invalid_json'], 400);
        }

        $slot = $body['slot'] ?? null;
        $snapshot = $body['snapshot'] ?? null;
        $version = $body['version'] ?? 1;

        if (!is_string($slot) || trim($slot) === '') {
            return Response::json(['ok' => false, 'error' => 'missing_slot'], 400);
        }
        if ($snapshot === null) {
            return Response::json(['ok' => false, 'error' => 'missing_snapshot'], 400);
        }
        if (!is_int($version)) {
            $version = 1;
        }

        $repo = new PlayerSaveRepository($kernel->pdo());
        $repo->upsert($user->id, $slot, $snapshot, $version);
        return Response::json(['ok' => true]);
    });

    $app->delete('/save', static function (Request $req, Kernel $kernel) use ($requireUser): Response {
        $user = $requireUser($req, $kernel);
        if ($user === null) {
            return Response::json(['ok' => false, 'error' => 'unauthorized', 'message' => 'Missing or invalid token.'], 401);
        }
        if ($user->isBanned()) {
            return Response::json(['ok' => false, 'error' => 'banned', 'message' => 'Account banned.'], 403);
        }

        $slot = $req->queryString('slot');
        if ($slot === null || trim($slot) === '') {
            return Response::json(['ok' => false, 'error' => 'missing_slot'], 400);
        }

        $repo = new PlayerSaveRepository($kernel->pdo());
        $repo->deleteByUserAndSlot($user->id, $slot);
        return Response::json(['ok' => true]);
    });
}
