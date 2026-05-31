<?php

declare(strict_types=1);

namespace App\Validation;

class Validator
{
    /** @var array<string, string> */
    private array $errors = [];

    /**
     * @param array<string, mixed> $data
     * @param array<string, string> $rules
     */
    public static function make(array $data, array $rules): self
    {
        $validator = new self();
        $validator->validate($data, $rules);
        return $validator;
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, string> $rules
     */
    private function validate(array $data, array $rules): void
    {
        foreach ($rules as $field => $ruleString) {
            $fieldRules = array_map('trim', explode('|', $ruleString));
            foreach ($fieldRules as $rule) {
                $this->validateField($field, $data[$field] ?? null, $rule);
            }
        }
    }

    private function validateField(string $field, mixed $value, string $rule): void
    {
        if (str_starts_with($rule, 'min:')) {
            $min = (int)substr($rule, 4);
            if (is_string($value) && strlen($value) < $min) {
                $this->errors[$field] = "$field must be at least $min characters";
            }
        } elseif (str_starts_with($rule, 'max:')) {
            $max = (int)substr($rule, 4);
            if (is_string($value) && strlen($value) > $max) {
                $this->errors[$field] = "$field must not exceed $max characters";
            }
        } elseif ($rule === 'required') {
            if ($value === null || (is_string($value) && trim($value) === '')) {
                $this->errors[$field] = "$field is required";
            }
        } elseif ($rule === 'email') {
            if ($value !== null && !is_string($value)) {
                $this->errors[$field] = "$field must be a valid email";
            } elseif ($value && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                $this->errors[$field] = "$field must be a valid email";
            }
        } elseif ($rule === 'numeric') {
            if ($value !== null && !is_numeric($value)) {
                $this->errors[$field] = "$field must be numeric";
            }
        } elseif ($rule === 'int') {
            if ($value !== null && !is_int($value)) {
                $this->errors[$field] = "$field must be an integer";
            }
        }
    }

    public function passes(): bool
    {
        return empty($this->errors);
    }

    public function fails(): bool
    {
        return !$this->passes();
    }

    /** @return array<string, string> */
    public function errors(): array
    {
        return $this->errors;
    }

    public function getError(string $field): ?string
    {
        return $this->errors[$field] ?? null;
    }
}
