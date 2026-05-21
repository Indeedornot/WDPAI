<?php

declare(strict_types=1);

namespace App;

use App\Config\AppConfig;
use App\Container\Container;
use App\Db\Db;
use PDO;

final class Kernel
{
    public readonly AppConfig $config;

    private ?PDO $pdo = null;
    private ?Container $container = null;

    public function __construct(AppConfig $config)
    {
        $this->config = $config;
    }

    public function pdo(): PDO
    {
        if ($this->pdo instanceof PDO) {
            return $this->pdo;
        }

        $this->pdo = Db::createPdo($this->config->db);
        return $this->pdo;
    }

    public function container(): Container
    {
        if ($this->container instanceof Container) {
            return $this->container;
        }

        $this->container = new Container($this);
        return $this->container;
    }
}
