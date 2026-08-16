<?php

declare(strict_types=1);

namespace Tests\Integration;

use Palermo\Database\ConnectionFactory;
use PHPUnit\Framework\TestCase;

final class DatabaseConnectionTest extends TestCase
{
    public function testApplicationCanConnectToConfiguredDatabase(): void
    {
        if (!isset($_ENV['DB_HOST']) && getenv('DB_HOST') === false) {
            self::markTestSkipped('Set DB_HOST to run the MySQL integration test.');
        }

        $statement = ConnectionFactory::fromEnvironment()->query('SELECT 1');

        if ($statement === false) {
            self::fail('MySQL smoke query could not be executed.');
        }

        $result = $statement->fetchColumn();

        self::assertSame(1, (int) $result);
    }
}
