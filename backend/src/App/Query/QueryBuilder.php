<?php

declare(strict_types=1);

namespace App\Query;

use PDO;
use PDOStatement;

class QueryBuilder
{
    private string $select = '';

    private string $from = '';

    private array $wheres = [];

    private array $bindings = [];

    private string $orderBy = '';

    private int $limitValue = 0;

    private int $offsetValue = 0;

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function select(string ...$columns): self
    {
        $this->select = 'SELECT ' . implode(', ', $columns);
        return $this;
    }

    public function from(string $table): self
    {
        $this->from = 'FROM ' . $table;
        return $this;
    }

    private const ALLOWED_OPERATORS = ['=', '!=', '<>', '<', '>', '<=', '>=', 'LIKE', 'NOT LIKE', 'IS', 'IS NOT'];

    public function where(string $column, string $operator, mixed $value): self
    {
        $op = strtoupper(trim($operator));
        if (!in_array($op, self::ALLOWED_OPERATORS, true)) {
            throw new \InvalidArgumentException("Disallowed SQL operator: $operator");
        }
        $placeholder = ':' . str_replace(['.', '_'], ['_', '__'], $column) . '_' . count($this->bindings);
        $this->wheres[] = "$column $op $placeholder";
        $this->bindings[$placeholder] = $value;
        return $this;
    }

    public function orderBy(string $column, string $direction = 'ASC'): self
    {
        $this->orderBy = "ORDER BY $column $direction";
        return $this;
    }

    public function limit(int $value): self
    {
        $this->limitValue = $value;
        return $this;
    }

    public function offset(int $value): self
    {
        $this->offsetValue = $value;
        return $this;
    }

    public function toSql(): string
    {
        $sql = $this->select . ' ' . $this->from;

        if (!empty($this->wheres)) {
            $sql .= ' WHERE ' . implode(' AND ', $this->wheres);
        }

        if ($this->orderBy) {
            $sql .= ' ' . $this->orderBy;
        }

        if ($this->limitValue > 0) {
            $sql .= ' LIMIT ' . $this->limitValue;
        }

        if ($this->offsetValue > 0) {
            $sql .= ' OFFSET ' . $this->offsetValue;
        }

        return $sql;
    }

    public function get(): PDOStatement
    {
        $sql = $this->toSql();
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($this->bindings);
        return $stmt;
    }

    /** @return array<string, mixed>|null */
    public function first(): ?array
    {
        $stmt = $this->limit(1)->get();
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return array<int, array<string, mixed>> */
    public function all(): array
    {
        $stmt = $this->get();
        return $stmt->fetchAll();
    }
}
