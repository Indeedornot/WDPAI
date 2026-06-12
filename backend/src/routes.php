<?php

declare(strict_types=1);

namespace App\Routes;

use App\Controller\AdminController;
use App\Controller\AuthController;
use App\Controller\HealthController;
use App\Controller\MeController;
use App\Controller\RunsController;
use App\Controller\SaveController;
use App\Routing\App;
use App\Routing\ControllerAction;

/**
 * Minimal-API style endpoint mapping.
 */
function map_endpoints(App $app): void
{
    $app->get('/health', new ControllerAction(HealthController::class, 'health'));

    $app->post('/auth/register', new ControllerAction(AuthController::class, 'register'));
    $app->post('/auth/login', new ControllerAction(AuthController::class, 'login'));
    $app->get('/auth/csrf', new ControllerAction(AuthController::class, 'csrf'));
    $app->get('/auth/session', new ControllerAction(AuthController::class, 'session'));
    $app->post('/auth/refresh', new ControllerAction(AuthController::class, 'refresh'));
    $app->post('/auth/logout', new ControllerAction(AuthController::class, 'logout'));

    $app->get('/me', new ControllerAction(MeController::class, 'me'));
    $app->get('/me/achievements', new ControllerAction(MeController::class, 'achievements'));
    $app->post('/runs', new ControllerAction(RunsController::class, 'create'));
    $app->get('/runs/leaderboard', new ControllerAction(RunsController::class, 'leaderboard'));

    $app->get('/admin/users', new ControllerAction(AdminController::class, 'users'));
    $app->get('/admin/saves', new ControllerAction(AdminController::class, 'saves'));
    $app->get('/admin/runs', new ControllerAction(AdminController::class, 'runs'));
    $app->get('/admin/login-audit', new ControllerAction(AdminController::class, 'loginAudit'));
    $app->get('/admin/latest-runs', new ControllerAction(AdminController::class, 'latestRuns'));
    $app->get('/admin/save-summary', new ControllerAction(AdminController::class, 'saveSummary'));
    $app->post('/admin/ban', new ControllerAction(AdminController::class, 'ban'));

    $app->get('/save', new ControllerAction(SaveController::class, 'get'));
    $app->post('/save', new ControllerAction(SaveController::class, 'upsert'));
    $app->delete('/save', new ControllerAction(SaveController::class, 'delete'));
}
