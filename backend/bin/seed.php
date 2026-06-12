<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use App\Bootstrap\Bootstrap;

// Loads backend/db/seed.sql (idempotent sample data) into the database.
// Invoked from the docker entrypoint when SEED_ON_START=true, or run manually:
//   php bin/seed.php

$kernel = Bootstrap::kernel();
$pdo = $kernel->pdo();

$seedFile = realpath(__DIR__ . '/../db/seed.sql');
if ($seedFile === false) {
    fwrite(STDERR, "Missing db/seed.sql\n");
    exit(1);
}

$sql = file_get_contents($seedFile);
if ($sql === false) {
    fwrite(STDERR, "Failed to read seed.sql\n");
    exit(1);
}

try {
    $pdo->exec($sql);
    echo "Seed applied.\n";
} catch (Throwable $e) {
    // Non-fatal: a failed seed should never block application boot.
    fwrite(STDERR, "Seed failed (continuing): " . $e->getMessage() . "\n");
    exit(0);
}
