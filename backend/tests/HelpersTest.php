<?php

declare(strict_types=1);

use App\Bootstrap\Helpers;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;

#[CoversClass(Helpers::class)]
final class HelpersTest extends TestCase
{
    public function testParseCsvListEmpty(): void
    {
        self::assertSame([], Helpers::parseCsvList(null));
        self::assertSame([], Helpers::parseCsvList(''));
        self::assertSame([], Helpers::parseCsvList('   '));
        self::assertSame([], Helpers::parseCsvList(' , , '));
    }

    public function testParseCsvListTrimsAndFilters(): void
    {
        self::assertSame(['a', 'b', 'c'], Helpers::parseCsvList(' a, b , ,c '));
    }

    public function testDbFromDatabaseUrlParsesPostgresUrl(): void
    {
        $cfg = Helpers::dbFromDatabaseUrl('postgres://game:game@db:5432/game');
        self::assertSame('pgsql:host=db;port=5432;dbname=game', $cfg['dsn']);
        self::assertSame('game', $cfg['user']);
        self::assertSame('game', $cfg['password']);
    }
}
