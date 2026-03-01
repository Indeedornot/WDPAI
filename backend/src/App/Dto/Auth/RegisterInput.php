<?php

declare(strict_types=1);

namespace App\Dto\Auth;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\Response;

final readonly class RegisterInput
{
    public function __construct(
        public string $email,
        public string $password,
    ) {
    }

    public static function fromRequest(Request $req): self|Response
    {
        $body = JsonBody::requireArray($req);
        if ($body instanceof Response) {
            return $body;
        }

        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        if (!is_string($email) || !is_string($password)) {
            return Response::error('invalid_input', 400, 'Email and password are required.');
        }

        $email = strtolower(trim($email));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return Response::error('invalid_email', 400, 'Please provide a valid email address.');
        }

        if (strlen($password) < 8) {
            return Response::error('weak_password', 400, 'Password must be at least 8 characters.');
        }

        return new self($email, $password);
    }
}
