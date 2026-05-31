<?php

declare(strict_types=1);

namespace App\Routing\Middleware;

use App\Logging\Logger;
use App\Routing\Request;
use App\Routing\Response;

final class ClientErrorLogger
{
    private Logger $logger;

    public const HEADER_ERRORS = 'X-Client-Errors';
    public const HEADER_PROCESSED = 'X-Client-Errors-Processed';

    public function __construct()
    {
        $this->logger = new Logger('ClientErrors');
    }

    public function process(Request $req, Response $res): Response
    {
        $header = $req->headers[strtolower(self::HEADER_ERRORS)] ?? null;

        if ($header && is_string($header))
        {
            try
            {
                $decoded = base64_decode($header, true);
                if ($decoded !== false)
                {
                    $errors = json_decode($decoded, true);
                    if (is_array($errors))
                    {
                        foreach ($errors as $error)
                        {
                            $this->logger->error('Client error logged', [
                                'type' => $error['type'] ?? 'unknown',
                                'message' => $error['message'] ?? '',
                                'timestamp' => $error['timestamp'] ?? null,
                                'url' => $error['url'] ?? '',
                                'userAgent' => $error['userAgent'] ?? '',
                            ]);
                        }

                        return $res->withHeader(self::HEADER_PROCESSED, 'true');
                    }
                }
            }
            catch (\Throwable)
            {
                // Silently ignore decode errors
            }
        }

        return $res;
    }
}
