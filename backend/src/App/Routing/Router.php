<?php

declare(strict_types=1);

namespace App\Routing;

use App\Auth\AuthService;
use App\Auth\AuthUser;
use App\Kernel;
use App\Routing\Attributes\RequireAuth;
use App\Routing\Attributes\PermissionPolicyGroup;
use ReflectionException;
use ReflectionMethod;
use ReflectionNamedType;
use RuntimeException;

final class Router
{
    /** @var array<string, ControllerAction> */
    private array $routes = [];

    public function map(string $method, string $path, ControllerAction $handler): void
    {
        $method = strtoupper($method);
        $key = $method . ' ' . $path;
        $this->routes[$key] = $handler;
    }

    public function get(string $path, ControllerAction $handler): void
    {
        $this->map('GET', $path, $handler);
    }

    public function post(string $path, ControllerAction $handler): void
    {
        $this->map('POST', $path, $handler);
    }

    public function delete(string $path, ControllerAction $handler): void
    {
        $this->map('DELETE', $path, $handler);
    }

    public function dispatch(Request $req, Kernel $kernel): ?Response
    {
        $key = $req->method . ' ' . $req->path;
        $handler = $this->routes[$key] ?? null;
        if ($handler === null) {
            return null;
        }

        return $this->dispatchController($handler, $req, $kernel);
    }

    private function dispatchController(ControllerAction $action, Request $req, Kernel $kernel): Response
    {
        $controllerClass = $action->controllerClass;
        if (!class_exists($controllerClass)) {
            throw new RuntimeException('Controller not found: ' . $controllerClass);
        }

        $controller = new $controllerClass($kernel);
        if (!method_exists($controller, $action->method)) {
            throw new RuntimeException('Controller method not found: ' . $controllerClass . '::' . $action->method);
        }

        try {
            $rm = new ReflectionMethod($controller, $action->method);
        } catch (ReflectionException $e) {
            throw new RuntimeException('Failed to reflect controller method.', 0, $e);
        }

        $authResult = $this->authorizeIfRequired($rm, $req, $kernel);
        if ($authResult instanceof Response) {
            return $authResult;
        }
        $authUser = $authResult;

        $args = [];
        foreach ($rm->getParameters() as $param) {
            $type = $param->getType();
            if ($type instanceof ReflectionNamedType && !$type->isBuiltin()) {
                $name = $type->getName();
                if ($name === Request::class) {
                    $args[] = $req;
                    continue;
                }
                if ($name === Kernel::class) {
                    $args[] = $kernel;
                    continue;
                }
                if ($name === AuthUser::class) {
                    if (!$authUser instanceof AuthUser) {
                        throw new RuntimeException('Controller expects AuthUser but method is missing #[RequireAuth].');
                    }
                    $args[] = $authUser;
                    continue;
                }
            }

            if ($param->isDefaultValueAvailable()) {
                $args[] = $param->getDefaultValue();
                continue;
            }

            throw new RuntimeException('Unsupported controller parameter: $' . $param->getName());
        }

        $res = $rm->invokeArgs($controller, $args);
        if (!$res instanceof Response) {
            throw new RuntimeException('Controller did not return a Response.');
        }

        return $res;
    }

    private function authorizeIfRequired(ReflectionMethod $rm, Request $req, Kernel $kernel): AuthUser|Response|null
    {
        $attrs = $rm->getAttributes(RequireAuth::class);
        if ($attrs === []) {
            return null;
        }

        /** @var RequireAuth $cfg */
        $cfg = $attrs[0]->newInstance();

        $auth = new AuthService($kernel->pdo());
        $user = $auth->authenticate($req);
        if ($user === null) {
            return Response::error('unauthorized', 401, 'Missing or invalid token.');
        }

        if (!$cfg->allowBanned && $user->isBanned()) {
            return Response::error('banned', 403, 'Account banned.');
        }

        if ($cfg->policy === PermissionPolicyGroup::Admin && !$user->isAdmin()) {
            return Response::error('forbidden', 403);
        }

        return $user;
    }
}
