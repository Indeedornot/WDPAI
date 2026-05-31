<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use PDOStatement;

abstract class BaseRepository
{
    protected PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Fetch a single row from a prepared statement.
     *
     * @return array<string, mixed>|null
     */
    protected function fetchRow(PDOStatement $stmt): ?array
    {
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }
}
