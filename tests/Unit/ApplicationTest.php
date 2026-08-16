<?php

declare(strict_types=1);

namespace Tests\Unit;

use Palermo\Application;
use PHPUnit\Framework\TestCase;

final class ApplicationTest extends TestCase
{
    public function testHealthEndpointReportsServiceStatus(): void
    {
        $response = (new Application('Palermo Test'))->handle('GET', '/health');

        self::assertSame(200, $response->status());
        self::assertSame(
            ['service' => 'Palermo Test', 'status' => 'ok'],
            json_decode($response->body(), true, 512, JSON_THROW_ON_ERROR),
        );
    }

    public function testUnknownRouteReturnsNotFound(): void
    {
        $response = (new Application('Palermo Test'))->handle('GET', '/missing');

        self::assertSame(404, $response->status());
    }

    public function testApplicationNameIsEscapedOnHomepage(): void
    {
        $response = (new Application('<script>alert(1)</script>'))->handle('GET', '/');

        self::assertStringNotContainsString('<script>', $response->body());
        self::assertStringContainsString('&lt;script&gt;', $response->body());
    }
}
