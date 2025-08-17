<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class ApiAuthenticate extends Middleware
{
    /**
     * Handle unauthenticated users for API requests.
     */
    protected function redirectTo(Request $request): ?string
    {
        // Pour les requêtes API, nous ne redirigeons jamais
        return null;
    }

    /**
     * Handle an unauthenticated user.
     */
    protected function unauthenticated($request, array $guards)
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            throw new \Illuminate\Auth\AuthenticationException(
                'Non authentifié',
                $guards,
                null
            );
        }

        parent::unauthenticated($request, $guards);
    }
}