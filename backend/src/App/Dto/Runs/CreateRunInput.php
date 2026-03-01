<?php

declare(strict_types=1);

namespace App\Dto\Runs;

use App\Dto\JsonBody;
use App\Routing\Request;
use App\Routing\Response;

final readonly class CreateRunInput
{
    public function __construct(
        public int $timeSeconds,
        public int $level,
        public int $xp,
        public int $kills,
        public int $shotsFired,
        public int $shotsHit,
    ) {
    }

    public static function fromRequest(Request $req): self|Response
    {
        $body = JsonBody::requireArray($req, 'Invalid JSON.');
        if ($body instanceof Response) {
            return $body;
        }

        $timeSeconds = $body['timeSeconds'] ?? null;
        $level = $body['level'] ?? null;
        $xp = $body['xp'] ?? null;
        $kills = $body['kills'] ?? null;
        $shotsFired = $body['shotsFired'] ?? null;
        $shotsHit = $body['shotsHit'] ?? null;

        if (!is_numeric($timeSeconds) || !is_numeric($level) || !is_numeric($xp) || !is_numeric($kills) || !is_numeric($shotsFired) || !is_numeric($shotsHit)) {
            return Response::error('invalid_input', 400, 'Invalid run stats.');
        }

        $timeSecondsInt = max(0, (int)round((float)$timeSeconds));
        $levelInt = max(1, (int)round((float)$level));
        $xpInt = max(0, (int)round((float)$xp));
        $killsInt = max(0, (int)round((float)$kills));
        $shotsFiredInt = max(0, (int)round((float)$shotsFired));
        $shotsHitInt = max(0, (int)round((float)$shotsHit));

        if ($shotsHitInt > $shotsFiredInt) {
            $shotsHitInt = $shotsFiredInt;
        }

        return new self(
            $timeSecondsInt,
            $levelInt,
            $xpInt,
            $killsInt,
            $shotsFiredInt,
            $shotsHitInt,
        );
    }
}
