<?php

declare(strict_types=1);

namespace App\Container;

use App\Container\Attributes\Injectable;
use App\Kernel;
use ReflectionClass;
use RuntimeException;

final class Container
{
    /** @var array<string, array{scope:string,factory:callable}> */
    private array $definitions = [];

    /** @var array<string, mixed> */
    private array $instances = [];

    private Kernel $kernel;

    public function __construct(Kernel $kernel)
    {
        $this->kernel = $kernel;
    }

    public function registerSingleton(string $id, callable $factory): void
    {
        $this->definitions[$id] = ['scope' => 'singleton', 'factory' => $factory];
    }

    public function registerScoped(string $id, callable $factory): void
    {
        $this->definitions[$id] = ['scope' => 'scoped', 'factory' => $factory];
    }

    /**
     * Get a registered service or attempt to auto-wire a class.
     * @return mixed
     */
    public function get(string $id)
    {
        if (array_key_exists($id, $this->instances)) {
            return $this->instances[$id];
        }

        if (array_key_exists($id, $this->definitions)) {
            $definition = $this->definitions[$id];
            $instance = ($definition['factory'])($this);
            if ($definition['scope'] === 'singleton') {
                $this->instances[$id] = $instance;
            }
            return $instance;
        }

        if (!class_exists($id) || !$this->isInjectable($id)) {
            throw new RuntimeException('Service not found or not injectable: ' . $id);
        }

        $rc = new ReflectionClass($id);
        $ctor = $rc->getConstructor();
        if ($ctor === null || $ctor->getNumberOfParameters() === 0) {
            $obj = $rc->newInstance();
            $this->instances[$id] = $obj;
            return $obj;
        }

        $params = [];
        foreach ($ctor->getParameters() as $p) {
            $t = $p->getType();
            if ($t && !$t->isBuiltin()) {
                $tn = $t->getName();
                if ($tn === Kernel::class) {
                    $params[] = $this->kernel;
                    continue;
                }
                // recursive resolve
                $params[] = $this->get($tn);
                continue;
            }

            if ($p->isDefaultValueAvailable()) {
                $params[] = $p->getDefaultValue();
                continue;
            }

            throw new RuntimeException('Unable to resolve dependency: ' . $p->getName());
        }

        $obj = $rc->newInstanceArgs($params);
        if ($this->isSingleton($id)) {
            $this->instances[$id] = $obj;
        }
        return $obj;
    }

    /** Alias to get for clarity. */
    public function make(string $id)
    {
        return $this->get($id);
    }

    private function isSingleton(string $id): bool
    {
        return array_key_exists($id, $this->definitions) && $this->definitions[$id]['scope'] === 'singleton';
    }

    private function isInjectable(string $id): bool
    {
        $rc = new ReflectionClass($id);

        while ($rc) {
            if ($rc->getAttributes(Injectable::class) !== []) {
                return true;
            }

            $rc = $rc->getParentClass() ?: null;
        }

        return false;
    }
}
