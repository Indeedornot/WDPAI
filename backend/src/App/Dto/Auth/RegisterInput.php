<?php

declare(strict_types=1);

namespace App\Dto\Auth;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class RegisterInput
{
    public function __construct(
        public string $email,
        public string $password,
    ) {
    }

    public static function fromRequest(Request $req): self
    {
        $body = JsonBody::requireArray($req);

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            throw new ValidationException('invalid_input', 400, 'Email and password are required.');
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new ValidationException('invalid_email', 400, 'Please provide a valid email address.');
        }

        if (strlen($password) < 8) {
            throw new ValidationException('weak_password', 400, 'Password must be at least 8 characters.');
        }

        return new self($email, $password);
    }
}
