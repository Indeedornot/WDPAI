<?php

declare(strict_types=1);

namespace App\Dto\Auth;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\ValidationException;

final readonly class LoginInput
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
            // Keep messaging intentionally vague.
            throw new ValidationException('invalid_credentials', 401, 'Bad credentials.');
        }

        return new self($email, $password);
    }
}
