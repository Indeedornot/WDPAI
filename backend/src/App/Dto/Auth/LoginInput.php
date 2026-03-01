<?php

declare(strict_types=1);

namespace App\Dto\Auth;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\Response;

final readonly class LoginInput
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
            // Keep messaging intentionally vague.
            return Response::error('invalid_credentials', 401, 'Bad credentials.');
        }

        return new self($email, $password);
    }
}
