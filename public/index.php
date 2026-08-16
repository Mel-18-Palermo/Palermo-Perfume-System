<?php

declare(strict_types=1);

use Palermo\Application;
use Palermo\Config\Environment;
use Palermo\Http\Response;

$root = dirname(__DIR__);
$autoload = $root . '/vendor/autoload.php';

if (!is_file($autoload)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Dependencies are not installed. Run: composer install\n";
    exit;
}

require $autoload;
Environment::load($root);

try {
    $application = new Application(Environment::get('APP_NAME') ?? 'Palermo Perfume System');
    $response = $application->handle(
        $_SERVER['REQUEST_METHOD'] ?? 'GET',
        (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH),
    );
} catch (Throwable $exception) {
    $message = Environment::bool('APP_DEBUG', false)
        ? $exception->getMessage()
        : 'An unexpected error occurred.';

    $response = Response::json(['error' => $message], 500);
}

$response->send();
