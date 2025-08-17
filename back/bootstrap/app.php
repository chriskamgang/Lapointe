<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function ($response, \Throwable $exception, \Illuminate\Http\Request $request) {
            // Gestion des erreurs d'authentification pour les APIs
            if ($request->is('api/*') && $exception instanceof AuthenticationException) {
                return response()->json([
                    'success' => false,
                    'message' => 'Non authentifié. Veuillez vous connecter.',
                    'error' => 'Unauthorized'
                ], 401);
            }
            
            // Gestion des erreurs de route manquante (notamment login)
            if ($request->is('api/*') && $exception instanceof \Symfony\Component\Routing\Exception\RouteNotFoundException) {
                if (str_contains($exception->getMessage(), 'Route [login] not defined')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Non authentifié. Veuillez vous connecter.',
                        'error' => 'Unauthorized'
                    ], 401);
                }
            }
            
            return $response;
        });
    })->create();
