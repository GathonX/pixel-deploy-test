<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;        // ← import ajouté
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Vérifie que l'utilisateur authentifié est admin.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Utilisation de la façade Log
        Log::info('MIDDLEWARE admin — user:', [
            'id'       => optional($user)->id,
            'is_admin' => optional($user)->is_admin,
        ]);

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'message' => 'Accès interdit. Vous devez être administrateur.'
            ], 403);
        }

        return $next($request);
    }
}
