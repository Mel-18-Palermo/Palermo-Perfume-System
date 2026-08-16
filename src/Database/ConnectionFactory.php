<?php

declare(strict_types=1);

namespace Palermo\Database;

use Palermo\Config\Environment;
use PDO;

final class ConnectionFactory
{
    private function __construct()
    {
    }

    public static function fromEnvironment(): PDO
    {
        $host = Environment::require('DB_HOST');
        $port = Environment::get('DB_PORT', '3306');
        $database = Environment::require('DB_DATABASE');
        $username = Environment::require('DB_USERNAME');
        $password = Environment::get('DB_PASSWORD', '');

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $host,
            $port,
            $database,
        );

        return new PDO($dsn, $username, $password, [
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    }
}
