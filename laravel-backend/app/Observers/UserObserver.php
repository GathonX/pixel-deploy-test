<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Project;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Observer Utilisateur - 100% ASYNCHRONE avec VÉRIFICATION D'ACCÈS
 * 🚨 CORRIGÉ : Seuls les utilisateurs ayant acheté peuvent générer
 */
class UserObserver
{
    private const LOG_PREFIX = "👤 [UserObserver]";

    /**
     * Handle the User "created" event.
     * Délai de 5 minutes pour éviter tout blocage
     */
    public function created(User $user): void
    {
        Log::info(self::LOG_PREFIX . " Nouvel utilisateur créé", [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        // ✅ DÉLAI LONG pour éviter tout blocage à l'inscription
        $this->scheduleAsyncPostGeneration($user, 5);
    }

    /**
     * Handle the User "updated" event.
     * Génération 100% asynchrone si email vérifié
     */
    public function updated(User $user): void
    {
        // Vérifier si l'email vient d'être vérifié
        if ($user->wasChanged('email_verified_at') && $user->email_verified_at) {
            Log::info(self::LOG_PREFIX . " Email vérifié, vérification des accès", [
                'user_id' => $user->id,
                'email_verified_at' => $user->email_verified_at,
            ]);

            // 🚨 NOUVEAU : Vérifier si l'utilisateur a des fonctionnalités actives
            if (!$this->userHasActiveFeatures($user)) {
                Log::info(self::LOG_PREFIX . " Aucune fonctionnalité active, pas de génération", [
                    'user_id' => $user->id,
                ]);
                return;
            }

            // ✅ VÉRIFICATION RAPIDE sans génération synchrone
            $hasPosts = $this->quickCheckUserHasPosts($user);

            if (!$hasPosts) {
                Log::info(self::LOG_PREFIX . " Aucun post trouvé + fonctionnalités actives, génération programmée", [
                    'user_id' => $user->id,
                ]);

                // ✅ DÉLAI DE 2 MINUTES - Pas immédiat pour éviter blocage
                $this->scheduleAsyncPostGeneration($user, 2);
            } else {
                Log::info(self::LOG_PREFIX . " Posts déjà existants, pas de génération", [
                    'user_id' => $user->id,
                ]);
            }

        }
    }

    /**
     * Handle the User "deleted" event.
     */
    public function deleted(User $user): void
    {
        Log::info(self::LOG_PREFIX . " Utilisateur supprimé", [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);
    }

    // ===== MÉTHODES PRIVÉES 100% ASYNCHRONES =====

    /**
     * ✅ PROGRAMMER génération ASYNCHRONE avec délai
     * AUCUNE exécution synchrone - Tout en job
     */
    private function scheduleAsyncPostGeneration(User $user, int $delayMinutes): void
    {
        Log::info(self::LOG_PREFIX . " Programmation génération asynchrone", [
            'user_id' => $user->id,
            'delay_minutes' => $delayMinutes,
        ]);

        try {
            // ✅ JOB 100% ASYNCHRONE avec délai
            dispatch(function () use ($user) {
                $this->executeAsyncPostGeneration($user);
            })
            ->delay(now()->addMinutes($delayMinutes)) // ✅ Délai pour éviter blocage
            ->onQueue('posts'); // ✅ Queue dédiée

            Log::info(self::LOG_PREFIX . " Job asynchrone programmé", [
                'user_id' => $user->id,
                'delay_minutes' => $delayMinutes,
                'queue' => 'posts'
            ]);

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur programmation job asynchrone", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * 🚨 CORRIGÉ : executeAsyncPostGeneration() avec vérification d'accès
     */
    private function executeAsyncPostGeneration(User $user): void
    {
        Log::info(self::LOG_PREFIX . " Début génération asynchrone", [
            'user_id' => $user->id,
        ]);

        try {
            // Vérifier si l'utilisateur a l'email vérifié
            $user->refresh(); // Recharger depuis la DB

            if (!$user->email_verified_at) {
                Log::warning(self::LOG_PREFIX . " Email non vérifié, génération annulée", [
                    'user_id' => $user->id,
                ]);
                return;
            }

            // 🚨 NOUVEAU : Vérifier les accès aux fonctionnalités avant génération
            if (!$this->userHasActiveFeatures($user)) {
                Log::info(self::LOG_PREFIX . " Aucune fonctionnalité active, génération annulée", [
                    'user_id' => $user->id,
                ]);
                return;
            }

            // Vérifier si l'utilisateur a déjà des posts cette semaine
            if ($this->userHasPostsThisWeek($user)) {
                Log::info(self::LOG_PREFIX . " Posts déjà générés cette semaine", [
                    'user_id' => $user->id,
                ]);
                return;
            }

            // ✅ CORRECTION : Utiliser le service au lieu de la commande inexistante
            $weeklyService = app(\App\Services\ContentGeneration\WeeklyPostGenerationService::class);
            $result = $weeklyService->generateTodayPostOnly($user);

            if ($result['success']) {
                Log::info(self::LOG_PREFIX . " Génération asynchrone terminée", [
                    'user_id' => $user->id,
                    'status' => 'success',
                    'blog_posts' => count($result['data']['blog_posts'] ?? []),
                    'social_posts' => count($result['data']['social_posts'] ?? [])
                ]);
            } else {
                Log::error(self::LOG_PREFIX . " Erreur génération asynchrone", [
                    'user_id' => $user->id,
                    'status' => 'failed',
                    'error' => $result['error'] ?? 'Erreur inconnue'
                ]);
            }

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur génération asynchrone", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * 🚨 NOUVEAU : Vérifier si l'utilisateur a des fonctionnalités actives
     */
    private function userHasActiveFeatures(User $user): bool
    {
        try {
            // Vérifier s'il y a des accès aux fonctionnalités blog ou social_media
            $activeFeatures = $user->featureAccess()
                ->whereHas('feature', function ($query) {
                    $query->whereIn('key', ['blog', 'social_media']);
                })
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->count();

            $hasAccess = $activeFeatures > 0;

            Log::info(self::LOG_PREFIX . " Vérification accès fonctionnalités", [
                'user_id' => $user->id,
                'active_features_count' => $activeFeatures,
                'has_access' => $hasAccess,
            ]);

            return $hasAccess;

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur vérification accès", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false; // Par défaut, pas d'accès en cas d'erreur
        }
    }

    /**
     * ✅ VÉRIFICATION RAPIDE sans requêtes lourdes
     */
    private function quickCheckUserHasPosts(User $user): bool
    {
        try {
            // ✅ Requête simple et rapide
            $blogPostsCount = \App\Models\BlogPost::where('user_id', $user->id)->count();
            $socialPostsCount = \App\Models\SocialMediaPost::where('user_id', $user->id)->count();

            $hasPosts = ($blogPostsCount > 0 || $socialPostsCount > 0);

            Log::info(self::LOG_PREFIX . " Vérification rapide posts", [
                'user_id' => $user->id,
                'blog_posts' => $blogPostsCount,
                'social_posts' => $socialPostsCount,
                'has_posts' => $hasPosts,
            ]);

            return $hasPosts;

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur vérification rapide", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * ✅ VÉRIFICATION posts cette semaine (pour éviter doublons)
     */
    private function userHasPostsThisWeek(User $user): bool
    {
        try {
            $startOfWeek = Carbon::now()->startOfWeek();
            $endOfWeek = Carbon::now()->endOfWeek();

            $blogPostsThisWeek = \App\Models\BlogPost::where('user_id', $user->id)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            $socialPostsThisWeek = \App\Models\SocialMediaPost::where('user_id', $user->id)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            $hasPostsThisWeek = ($blogPostsThisWeek > 0 || $socialPostsThisWeek > 0);

            Log::info(self::LOG_PREFIX . " Vérification posts cette semaine", [
                'user_id' => $user->id,
                'blog_posts_this_week' => $blogPostsThisWeek,
                'social_posts_this_week' => $socialPostsThisWeek,
                'has_posts_this_week' => $hasPostsThisWeek,
            ]);

            return $hasPostsThisWeek;

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur vérification posts semaine", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

}
