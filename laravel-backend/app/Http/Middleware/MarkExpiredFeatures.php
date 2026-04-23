<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\UserFeatureAccess;

class MarkExpiredFeatures
{
    /**
     * ✅ Middleware pour marquer automatiquement les fonctionnalités expirées
     *
     * Ce middleware s'exécute à CHAQUE requête authentifiée pour :
     * 1. Détecter les fonctionnalités dont la date d'expiration est dépassée
     * 2. Marquer leur status comme 'expired'
     * 3. Désactiver leur toggle (user_activated = false)
     */
    public function handle(Request $request, Closure $next)
    {
        // Uniquement pour les utilisateurs authentifiés
        if (auth()->check()) {
            try {
                $userId = auth()->id();

                // ✅ Marquer les fonctionnalités expirées
                $expiredCount = UserFeatureAccess::where('user_id', $userId)
                    ->expired() // Scope qui vérifie expires_at < now()->startOfDay()
                    ->where('status', '!=', 'expired') // Seulement celles pas encore marquées
                    ->update([
                        'status' => 'expired',
                        'user_activated' => false
                    ]);

                // Log uniquement s'il y a eu des expirations
                if ($expiredCount > 0) {
                    Log::info("🔄 [Auto] Fonctionnalités expirées marquées", [
                        'user_id' => $userId,
                        'expired_count' => $expiredCount,
                        'route' => $request->path()
                    ]);
                }
            } catch (\Exception $e) {
                // Ne pas bloquer la requête en cas d'erreur
                Log::error("❌ [Auto] Erreur marquage expiration", [
                    'user_id' => auth()->id(),
                    'error' => $e->getMessage(),
                    'route' => $request->path()
                ]);
            }
        }

        return $next($request);
    }
}
