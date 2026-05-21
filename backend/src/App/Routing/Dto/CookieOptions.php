<?php

declare(strict_types=1);

namespace App\Routing\Dto;

final class CookieOptions
{
    public function __construct(
        public readonly string $path = '/',
        public readonly bool $secure = true,
        public readonly bool $httpOnly = true,
        public readonly string $sameSite = 'Lax',
        public readonly ?string $expires = null,
    ) {}

    /**
     * @return array{path:string,secure:bool,httpOnly:bool,sameSite:string,expires?:string}
     */
    public function toArray(): array
    {
        $arr = [
            'path' => $this->path,
            'secure' => $this->secure,
            'httpOnly' => $this->httpOnly,
            'sameSite' => $this->sameSite,
        ];

        if ($this->expires !== null) {
            $arr['expires'] = $this->expires;
        }

        return $arr;
    }
}
