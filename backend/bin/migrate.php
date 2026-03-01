<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

use App\Bootstrap\Bootstrap;

$kernel = Bootstrap::kernel();
$pdo = $kernel->pdo();

// Ensure migrations table exists (in case you run migrate without the first migration).
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(255) PRIMARY KEY, applied_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)');

$migrationsDir = realpath(__DIR__ . '/../migrations');
if ($migrationsDir === false) {
    fwrite(STDERR, "Missing migrations directory\n");
    exit(1);
}

$files = glob($migrationsDir . '/*.sql');
if ($files === false) {
    fwrite(STDERR, "Failed to read migrations directory\n");
    exit(1);
}

sort($files);

$applied = [];
$stmt = $pdo->query('SELECT version FROM schema_migrations');
foreach ($stmt->fetchAll() as $row) {
    $applied[(string)$row['version']] = true;
}

$appliedCount = 0;
foreach ($files as $file) {
    $version = basename($file);
    if (isset($applied[$version])) {
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false) {
        fwrite(STDERR, "Failed to read $version\n");
        exit(1);
    }

    echo "Applying $version...\n";
    try {
        $pdo->exec($sql);
        $ins = $pdo->prepare('INSERT INTO schema_migrations (version) VALUES (:v)');
        $ins->execute([':v' => $version]);
        $appliedCount++;
    } catch (Throwable $e) {
        fwrite(STDERR, "Migration failed: " . $e->getMessage() . "\n");
        exit(1);
    }
}

echo "Done. Applied $appliedCount migration(s).\n";
