<?php

declare(strict_types=1);

namespace Palermo\Config;

use Dotenv\Dotenv;
use RuntimeException;

final class Environment
{
    private function __construct()
    {
    }

    public static function load(string $root): void
    {
        Dotenv::createImmutable($root)->safeLoad();
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

        if ($value === false || $value === '') {
            return $default;
        }

        return (string) $value;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);

        if ($value === null) {
            throw new RuntimeException(sprintf('Required environment variable "%s" is missing.', $key));
        }

        return $value;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);

        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? $default;
    }
}
