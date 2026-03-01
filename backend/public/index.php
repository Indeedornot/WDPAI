<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/autoload.php';

// Route mapping is a functions file, so include explicitly.
require_once __DIR__ . '/../src/routes.php';

use App\Bootstrap\Bootstrap;
use App\Http\Http;
use App\Routing\App;
use App\Routing\Request;
use App\Routes;

$kernel = Bootstrap::kernel();
$path = $kernel->config->routing->stripBasePath(Http::path());

$app = new App($kernel);
Routes\map_endpoints($app);

$req = Request::fromGlobals($path);
$res = $app->handle($req);
$res->send();
