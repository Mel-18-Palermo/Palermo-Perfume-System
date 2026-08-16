<?php

declare(strict_types=1);

namespace Palermo;

use Palermo\Http\Response;

final class Application
{
    public function __construct(private readonly string $name)
    {
    }

    public function handle(string $method, string $path): Response
    {
        if ($method === 'GET' && $path === '/health') {
            return Response::json([
                'service' => $this->name,
                'status' => 'ok',
            ]);
        }

        if ($method === 'GET' && $path === '/') {
            $name = htmlspecialchars($this->name, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

            return Response::html(<<<HTML
                <!doctype html>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>{$name}</title>
                </head>
                <body>
                    <main>
                        <h1>{$name}</h1>
                        <p>The application foundation is ready for feature development.</p>
                    </main>
                </body>
                </html>
                HTML);
        }

        return Response::json(['error' => 'Not found.'], 404);
    }
}
