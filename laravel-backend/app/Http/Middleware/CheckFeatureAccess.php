<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;

class CheckFeatureAccess
{
    /**
     * ✅ MODIFIÉ : Vérifier l'accès à une fonctionnalité avec expiration
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Authentification requise'
            ], 401);
        }

        // ✅ CORRECTION : Rechercher le DERNIER achat (le plus récent) pour éviter les doublons
        $access = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                $query->where('key', $featureKey);
            })
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->orderBy('admin_enabled_at', 'desc') // ✅ Toujours prendre le plus récent
            ->first();

        if (!$access) {
            Log::info("🚫 [MIDDLEWARE] Accès refusé - Fonctionnalité non autorisée", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'reason' => 'feature_not_granted'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Accès non autorisé à cette fonctionnalité',
                'feature_key' => $featureKey,
                'requires_activation' => true,
                'error_type' => 'feature_not_granted'
            ], 403);
        }

        // ✅ NOUVEAU : Vérifier si la fonctionnalité est expirée
        if ($access->isExpired()) {
            // Marquer automatiquement comme expirée
            $access->markAsExpired();

            Log::info("📅 [MIDDLEWARE] Accès refusé - Fonctionnalité expirée", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'expired_at' => $access->expires_at?->toISOString(),
                'days_expired' => $access->expires_at ? now()->diffInDays($access->expires_at) : null
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Cette fonctionnalité a expiré. Veuillez renouveler votre accès.',
                'feature_key' => $featureKey,
                'error_type' => 'feature_expired',
                'expired_at' => $access->expires_at?->toISOString(),
                'days_expired' => $access->expires_at ? now()->diffInDays($access->expires_at) : null,
                'can_renew' => true
            ], 403);
        }

        // ✅ BASÉ SUR LA DATE : Vérifier si la fonctionnalité est activée par l'utilisateur
        if (!$access->user_activated) {
            Log::info("🔄 [MIDDLEWARE] Accès refusé - Fonctionnalité non activée", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'reason' => 'feature_not_activated'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Fonctionnalité non activée. Veuillez l\'activer dans vos paramètres.',
                'feature_key' => $featureKey,
                'requires_activation' => true,
                'error_type' => 'feature_not_activated'
            ], 403);
        }

        // ✅ SUPPRIMÉ : Plus de vérification du status, on se base uniquement sur expires_at via isExpired()

        // ✅ SUCCÈS : Accès autorisé
        Log::info("✅ [MIDDLEWARE] Accès autorisé", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'expires_at' => $access->expires_at?->toISOString(),
            'days_remaining' => $access->getDaysRemaining()
        ]);

        // ✅ NOUVEAU : Ajouter les informations d'accès dans la requête
        $request->merge([
            'feature_access' => [
                'feature_key' => $featureKey,
                'expires_at' => $access->expires_at?->toISOString(),
                'days_remaining' => $access->getDaysRemaining(),
                'is_active' => true
            ]
        ]);

        return $next($request);
    }
}
