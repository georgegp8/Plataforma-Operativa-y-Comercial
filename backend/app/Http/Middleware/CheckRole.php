<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Verifica que el usuario autenticado tenga el rol requerido.
     * Uso: ->middleware('role:admin')
     */
    public function handle(Request $request, Closure $next, string $role): mixed
    {
        if ($request->user()?->rol !== $role) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción.',
            ], 403);
        }

        return $next($request);
    }
}
