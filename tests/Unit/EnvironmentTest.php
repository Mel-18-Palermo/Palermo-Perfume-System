<?php

declare(strict_types=1);

namespace Tests\Unit;

use Palermo\Config\Environment;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class EnvironmentTest extends TestCase
{
    protected function tearDown(): void
    {
        unset($_ENV['TEST_FLAG'], $_ENV['TEST_REQUIRED_VALUE']);
    }

    public function testBooleanValuesAreParsed(): void
    {
        $_ENV['TEST_FLAG'] = 'true';

        self::assertTrue(Environment::bool('TEST_FLAG'));
    }

    public function testMissingRequiredValueThrows(): void
    {
        $this->expectException(RuntimeException::class);

        Environment::require('TEST_REQUIRED_VALUE');
    }
}
