<?php

namespace App\Http\Controllers;

use App\Models\Feature;
use App\Models\UserFeatureAccess;
use App\Models\FeatureActivationRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use App\Services\ContentGeneration\NewUserDetectionService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Jobs\GenerateUserPostsJob;
use App\Jobs\GenerateActivationPostsJob;
use App\Events\FeatureActivated;

class UserFeatureController extends Controller
{

    /**
     * ✅ MODIFIÉ : Fonctionnalités disponibles avec vérification d'expiration
     * ⚠️ IMPORTANT : Retourne TOUTES les fonctionnalités (actives ET expirées)
     * pour que le frontend puisse afficher les anciens contenus des fonctionnalités expirées
     */
    public function getAvailableFeatures(): JsonResponse
    {
        try {
            $user = auth()->user();

            // ✅ CORRECTION : Retourner uniquement le DERNIER achat pour chaque fonctionnalité
            // Évite les doublons quand l'utilisateur a racheté une fonctionnalité expirée
            $allAccess = UserFeatureAccess::with('feature')
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->orderBy('admin_enabled_at', 'desc') // Les plus récents en premier
                ->get();

            // Grouper par feature_id et garder seulement le plus récent
            $latestAccessByFeature = $allAccess->groupBy('feature_id')->map(function ($group) {
                return $group->first(); // Le plus récent (car orderBy desc)
            });

            $features = $latestAccessByFeature->filter(function ($access) {
                return $access->feature !== null;
            })->map(function ($access) {
                $isExpired = $access->isExpired();
                $daysRemaining = $access->getDaysRemaining();

                return [
                    'id' => $access->feature->id,
                    'key' => $access->feature->key,
                    'name' => $access->feature->name,
                    'description' => $access->feature->description,
                    'user_activated' => $access->user_activated && !$isExpired,
                    'can_toggle' => !$isExpired,
                    'can_renew' => $isExpired || ($daysRemaining !== null && $daysRemaining <= 3),
                    'status' => $access->status,
                    'is_expired' => $isExpired,
                    'expires_at' => $access->expires_at?->toISOString(),
                    'days_remaining' => $daysRemaining,
                    'billing_period' => $access->billing_period ?? 'monthly',
                    'period_label' => $access->getPeriodLabel(),
                    'amount_paid' => $access->amount_paid,
                    'original_price' => $access->original_price,
                    'discount_percentage' => $access->discount_percentage,
                    'user_feature_access_id' => $access->id, // ✅ AJOUT : ID du UserFeatureAccess pour le toggle
                ];
            })->values(); // Réindexer le tableau après groupBy

            return response()->json([
                'success' => true,
                'data' => $features
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur fonctionnalités disponibles", [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des fonctionnalités'
            ], 500);
        }
    }

    /**
     * ✅ MODIFIÉ : Toggle avec vérification d'expiration
     */
    public function toggleFeature(Request $request): JsonResponse
    {
        $request->validate([
            'feature_id' => 'required|exists:features,id',
            'activate' => 'required|boolean',
        ]);

        $user = auth()->user();

        Log::info("🎯 Toggle fonctionnalité demandé", [
            'user_id' => $user->id,
            'feature_id' => $request->feature_id,
            'activate' => $request->activate
        ]);

        // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW), le plus récent
        $access = UserFeatureAccess::where('user_id', $user->id)
            ->where('feature_id', $request->feature_id)
            ->where('admin_enabled', true)
            ->where(function($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->orderBy('admin_enabled_at', 'desc') // ✅ CORRECTION : Trier par date d'achat
            ->first();

        if (!$access) {
            return response()->json([
                'success' => false,
                'message' => 'Accès non autorisé à cette fonctionnalité ou accès expiré'
            ], 403);
        }

        // ✅ NOUVEAU : Vérification d'expiration
        if ($request->activate && $access->isExpired()) {
            return response()->json([
                'success' => false,
                'message' => 'Cette fonctionnalité a expiré. Veuillez renouveler votre accès.',
                'expired' => true,
                'expired_at' => $access->expires_at?->toISOString()
            ], 403);
        }

        $feature = $access->feature;

        DB::beginTransaction();

        try {
            if ($request->activate) {
                // ✅ MODIFIÉ : activateByUser() ne redéfinit plus expires_at
                $success = $access->activateByUser();

                $daysRemaining = $access->fresh()->getDaysRemaining();
                $message = "Fonctionnalité activée avec succès. {$daysRemaining} jours restants.";

                Log::info("✅ Fonctionnalité activée avec expiration", [
                    'user_id' => $user->id,
                    'feature_key' => $feature->key,
                    'expires_at' => $access->fresh()->expires_at?->toISOString(),
                    'success' => $success
                ]);

                // Déclencher l'event d'activation
                event(new FeatureActivated($access->fresh(), $feature->key));

                $firstPost = null;
                $postsRemaining = 0;
                $sprintGenerated = null;
                $isReactivation = false;

                if ($success && ($feature->key === 'blog' || $feature->key === 'social_media')) {

                    Log::info("🚀 [CONTROLLER] Génération ASYNCHRONE avec rattrapage intelligent", [
                        'user_id' => $user->id,
                        'feature_key' => $feature->key
                    ]);

                    // ✅ NIVEAU 1 : Générer les objectifs hebdomadaires AVANT les posts
                    $this->ensureWeeklyObjectivesExist($user, $feature->key);

                    // ✅ NOUVEAU : Générer job_id unique pour tracking
                    $jobId = uniqid('job_', true);

                    // ✅ NOUVEAU : Initialiser le statut du job dans le cache
                    Cache::put("immediate_job_{$jobId}", [
                        'job_id' => $jobId,
                        'status' => 'pending',
                        'progress' => 0,
                        'current_step' => 'Démarrage de la génération...',
                        'user_id' => $user->id,
                        'feature_key' => $feature->key,
                        'access_id' => $access->id,
                        'updated_at' => now()->toISOString()
                    ], now()->addMinutes(5));

                    // ✅ NOUVEAU : Dispatcher le Job asynchrone (NON-BLOQUANT)
                    // Le job vérifiera lui-même si un post existe pour aujourd'hui
                    \App\Jobs\GenerateImmediatePostJob::dispatch(
                        $user->id,
                        $feature->key,
                        $access->id,
                        $jobId
                    )->onQueue('posts');

                    Log::info("✅ [CONTROLLER] Job asynchrone dispatché", [
                        'user_id' => $user->id,
                        'feature_key' => $feature->key,
                        'job_id' => $jobId,
                        'queue' => 'posts'
                    ]);

                    // ✅ Retourner immédiatement le job_id (pas d'attente)
                    $firstPost = [
                        'success' => true,
                        'job_id' => $jobId,
                        'message' => 'Génération démarrée en arrière-plan'
                    ];

                    // ✅ Programmer le reste en arrière-plan (posts 2, 3, etc.)
                    // scheduleRemainingPosts vérifie ce qui manque et génère seulement ça
                    $postsRemaining = $this->scheduleRemainingPosts($user, $feature->key, $access->id);

                    Log::info("✅ [CONTROLLER] Système asynchrone initialisé", [
                        'user_id' => $user->id,
                        'feature_key' => $feature->key,
                        'job_id' => $jobId,
                        'remaining_posts_scheduled' => $postsRemaining
                    ]);
                }

                // ✅ SPRINT : Déclenchement avec modal de progression
                if ($success && $feature->key === 'sprint_planning') {

                    Log::info("🏃‍♂️ [CONTROLLER] Sprint - Génération avec rattrapage intelligent", [
                        'user_id' => $user->id,
                        'feature_key' => $feature->key
                    ]);

                    try {
                        // ✅ NOUVEAU : Générer job_id unique pour tracking du sprint
                        $sprintJobId = uniqid('sprint_job_', true);

                        // ✅ NOUVEAU : Initialiser le statut du job dans le cache
                        Cache::put("sprint_job_{$sprintJobId}", [
                            'job_id' => $sprintJobId,
                            'status' => 'pending',
                            'progress' => 0,
                            'current_step' => 'Démarrage de la génération du sprint...',
                            'user_id' => $user->id,
                            'feature_key' => 'sprint_planning',
                            'updated_at' => now()->toISOString()
                        ], now()->addMinutes(10));

                        // ✅ CORRECTION : Génération asynchrone avec job_id
                        // Le job vérifiera lui-même ce qui manque
                        $sprintGenerated = $this->triggerSprintGenerationAsync($user, $sprintJobId);

                        Log::info("✅ [CONTROLLER] Sprint job dispatché avec modal", [
                            'user_id' => $user->id,
                            'feature_key' => $feature->key,
                            'sprint_job_id' => $sprintJobId,
                            'scheduled' => $sprintGenerated['success'] ?? false
                        ]);

                        // ✅ Ajouter job_id pour le modal
                        $sprintGenerated['job_id'] = $sprintJobId;

                    } catch (\Exception $e) {
                        Log::error("❌ [CONTROLLER] Erreur programmation sprint", [
                            'user_id' => $user->id,
                            'feature_key' => $feature->key,
                            'error' => $e->getMessage()
                        ]);

                        // ✅ Même en cas d'erreur, ne pas bloquer l'interface
                        $sprintGenerated = [
                            'success' => false,
                            'message' => 'Erreur programmation - sera retenté automatiquement',
                            'scheduled' => false
                        ];
                    }
                }

                DB::commit();

                $accessRefresh = $access->fresh();

                return response()->json([
                    'success' => $success,
                    'message' => $message,
                    'feature_key' => $feature->key,
                    'activated' => $request->activate,
                    'user_activated' => $accessRefresh->user_activated, // 🎯 CORRECTION : Envoyer user_activated pour le toggle
                    'expires_at' => $accessRefresh->expires_at?->toISOString(),
                    'days_remaining' => $accessRefresh->getDaysRemaining(),
                    'first_post' => $firstPost,
                    'job_id' => $firstPost['job_id'] ?? ($sprintGenerated['job_id'] ?? null), // 🎯 job_id pour polling (blog/social/sprint)
                    'posts_remaining' => $postsRemaining,
                    'generation_scheduled' => $postsRemaining > 0,
                    'immediate_job_started' => isset($firstPost['job_id']) || isset($sprintGenerated['job_id']), // 🎯 indique si job démarré
                    'show_progress_modal' => isset($firstPost['job_id']) || isset($sprintGenerated['job_id']) || ($firstPost['success'] ?? false),
                    'sprint_generated' => $sprintGenerated,
                    'sprint_created' => $sprintGenerated && ($sprintGenerated['success'] ?? false)
                ]);

            } else {
                $success = $access->deactivateByUser();
                $message = 'Fonctionnalité désactivée';

                $this->cleanGenerationCache($user->id, $feature->key);

                DB::commit();

                return response()->json([
                    'success' => $success,
                    'message' => $message,
                    'feature_key' => $feature->key,
                    'activated' => false,
                    'user_activated' => false // 🎯 CORRECTION : Envoyer user_activated pour le toggle
                ]);
            }

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("❌ Erreur toggle fonctionnalité", [
                'user_id' => $user->id,
                'feature_id' => $request->feature_id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification de la fonctionnalité'
            ], 500);
        }
    }

    /**
     * ✅ MODIFIÉ : Vérification d'accès avec expiration
     */
    public function checkAccess(string $featureKey): JsonResponse
    {
        try {
            $user = auth()->user();

            // ✅ CORRECTION : Récupérer le DERNIER achat (le plus récent) pour éviter les doublons
            // En cas de rachat après expiration, toujours prendre le plus récent
            $access = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                    $query->where('key', $featureKey);
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->orderBy('admin_enabled_at', 'desc') // Le plus récent en premier
                ->first();

            // Déterminer les états
            $hasAccess = $access && $access->isActive(); // Actif = admin_enabled + user_activated + non expiré
            $isExpired = $access && $access->isExpired(); // A déjà acheté mais expiré
            $neverPurchased = !$access; // N'a jamais acheté

            Log::info("🔍 Vérification accès", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'has_access' => $hasAccess,
                'is_expired' => $isExpired,
                'never_purchased' => $neverPurchased
            ]);

            return response()->json([
                'success' => true,
                'has_access' => $hasAccess,
                'is_expired' => $isExpired,
                'never_purchased' => $neverPurchased,
                'expires_at' => $access?->expires_at?->toISOString(),
                'days_remaining' => $access?->getDaysRemaining()
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification accès", [
                'user_id' => auth()->id(),
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'has_access' => false,
                'never_purchased' => true
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Marquer les fonctionnalités expirées
     */
    private function markExpiredFeatures(int $userId): void
    {
        try {
            $expiredCount = UserFeatureAccess::where('user_id', $userId)
                ->expired()
                ->where('status', '!=', 'expired')
                ->update([
                    'status' => 'expired',
                    'user_activated' => false
                ]);

            if ($expiredCount > 0) {
                Log::info("📅 Fonctionnalités expirées marquées", [
                    'user_id' => $userId,
                    'expired_count' => $expiredCount
                ]);
            }
        } catch (\Exception $e) {
            Log::error("❌ Erreur marquage expiration", [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ SUPPRIMÉ : Plus de renouvellement automatique
     * Chaque achat = nouveau UserFeatureAccess avec validation admin
     * L'utilisateur doit passer par /features/purchase/{id} pour "renouveler"
     */

    // === MÉTHODES CONSERVÉES IDENTIQUES ===

    private function scheduleAsyncGeneration($user, string $featureKey): int
    {
        try {
            Log::info("📅 [CONTROLLER] Programmation génération asynchrone", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'timestamp' => now()->toISOString()
            ]);

            // ✅ CORRECTION : Calculer posts restants selon le type de fonctionnalité
            $postsRemaining = $this->calculateRemainingPostsByFeature($user, $featureKey);

            if ($postsRemaining <= 0) {
                Log::info("ℹ️ [CONTROLLER] Aucun post restant à programmer", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey
                ]);
                return 0;
            }

            // ✅ CORRECTION : Cache avec timing correct selon règles d'activation
            $totalPostsTarget = $postsRemaining; // ✅ CORRECTION : Générer TOUS les posts selon les règles
            
            Cache::put("remaining_posts_{$user->id}_{$featureKey}", [
                'posts_remaining' => $postsRemaining,
                'activation_date' => now()->toISOString(),
                'last_generation' => null, // ✅ Aucune génération encore
                'can_generate_next' => now()->addMinutes(2)->toISOString(), // ✅ 2 minutes pour première génération
                'feature_key' => $featureKey,
                'total_posts_target' => $totalPostsTarget,
                'posts_generated' => 0, // ✅ Compteur démarre à 0
                'initialized_by' => 'controller_async_activation'
            ], now()->addDays(7));

            // ✅ CORRECTION : Première génération avec délai court pour ne pas bloquer
            GenerateActivationPostsJob::dispatch($user, $featureKey, 1) // Générer 1 post
                ->delay(now()->addMinutes(2)) // ✅ 2 minutes au lieu de 5
                ->onQueue('posts');

            Log::info("✅ [CONTROLLER] Job activation programmé", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'queue' => 'posts',
                'delay' => '5 minutes',
                'posts_remaining' => $postsRemaining,
                'job_type' => 'GenerateActivationPostsJob'
            ]);

            return $postsRemaining;

        } catch (\Exception $e) {
            Log::error("❌ [CONTROLLER] Erreur programmation génération", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return 0;
        }
    }

    /**
     * ✅ NOUVEAU : Calcul posts restants selon le type de fonctionnalité et plateformes activées
     */
    private function calculateRemainingPostsByFeature($user, string $featureKey): int
    {
        $now = Carbon::now();
        $dayName = strtolower($now->format('l'));

        // ✅ Calculer les jours restants jusqu'à dimanche (inclus)
        $daysUntilSunday = 7 - $now->dayOfWeek; // 0=Dimanche, 1=Lundi, ..., 6=Samedi
        if ($now->dayOfWeek === 0) { // Si dimanche
            $daysUntilSunday = 0; // Seulement aujourd'hui
        }

        // Nombre de posts par plateforme = jours restants (y compris aujourd'hui)
        $postsPerPlatform = $daysUntilSunday + 1; // +1 pour inclure le jour actuel

        // ✅ NOUVEAU : Pour social_media, multiplier par le nombre de plateformes activées
        if ($featureKey === 'social_media') {
            $access = UserFeatureAccess::where('user_id', $user->id)
                ->whereHas('feature', function($query) {
                    $query->where('key', 'social_media');
                })
                ->where('admin_enabled', true)
                ->where('status', 'active')
                ->first();

            // ✅ CORRECTION : Si aucune plateforme n'est définie, retourner 0
            $enabledPlatforms = $access->enabled_platforms ?? [];
            
            if (empty($enabledPlatforms)) {
                Log::warning("⚠️ [CONTROLLER] Aucune plateforme activée pour social_media", [
                    'user_id' => $user->id,
                    'access_id' => $access->id
                ]);
                return 0;
            }
            
            $platformCount = count($enabledPlatforms);
            $totalPosts = $postsPerPlatform * $platformCount;

            Log::info("📊 [CONTROLLER] Calcul posts social avec plateformes", [
                'user_id' => $user->id,
                'current_day' => $dayName,
                'posts_per_platform' => $postsPerPlatform,
                'enabled_platforms' => $enabledPlatforms,
                'platform_count' => $platformCount,
                'total_posts' => $totalPosts,
                'formula' => "{$postsPerPlatform} posts × {$platformCount} plateformes = {$totalPosts} posts"
            ]);

            return $totalPosts;
        }

        // Pour blog, retourner simplement le nombre de jours
        Log::info("📊 [CONTROLLER] Calcul posts blog", [
            'user_id' => $user->id,
            'current_day' => $dayName,
            'posts_to_generate' => $postsPerPlatform
        ]);

        return $postsPerPlatform;
    }

    /**
     * ✅ ANCIEN : Maintenu pour compatibilité
     */
    private function calculateRemainingPosts($user): int
    {
        return $this->calculateRemainingPostsByFeature($user, 'blog');
    }


    public function getGenerationStatus(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $featureKey = $request->query('feature_key');

            Log::info("🔍 [CONTROLLER] Vérification statut génération", [
                'user_id' => $user->id,
                'feature_key' => $featureKey
            ]);

            if (!in_array($featureKey, ['blog', 'social_media'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Feature key invalide'
                ], 400);
            }

            $cacheKey = "remaining_posts_{$user->id}_{$featureKey}";
            $progressState = Cache::get($cacheKey);

            if ($progressState) {
                $canGenerateNow = !$progressState['can_generate_next'] ||
                                now()->isAfter(Carbon::parse($progressState['can_generate_next']));

                Log::info("📊 [CONTROLLER] État progressif trouvé", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'posts_remaining' => $progressState['posts_remaining'],
                    'can_generate_now' => $canGenerateNow
                ]);

                return response()->json([
                    'success' => true,
                    'has_remaining' => $progressState['posts_remaining'] > 0,
                    'posts_remaining' => $progressState['posts_remaining'],
                    'can_generate_now' => $canGenerateNow,
                    'next_generation_time' => $progressState['can_generate_next'] ?? null,
                    'last_generation' => $progressState['last_generation'] ?? null
                ]);
            }

            $completedKey = "generation_completed_{$user->id}_{$featureKey}";
            $completed = Cache::get($completedKey);
            if ($completed) {
                return response()->json([
                    'success' => true,
                    'has_remaining' => false,
                    'posts_remaining' => 0,
                    'can_generate_now' => false,
                    'status' => 'completed',
                    'completed_at' => $completed['completed_at']
                ]);
            }

            return response()->json([
                'success' => true,
                'has_remaining' => false,
                'posts_remaining' => 0,
                'can_generate_now' => false,
                'status' => 'not_started'
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [CONTROLLER] Erreur statut génération", [
                'user_id' => auth()->id(),
                'feature_key' => $featureKey ?? 'unknown',
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification du statut'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Vérifier le statut du Job de génération immédiate (pour polling)
     */
    public function getImmediateJobStatus(Request $request): JsonResponse
    {
        try {
            $jobId = $request->query('job_id');

            if (!$jobId) {
                return response()->json([
                    'success' => false,
                    'message' => 'job_id requis'
                ], 400);
            }

            // ✅ Vérifier les deux types de cache : immediate_job (blog/social) et sprint_job (sprint)
            $cacheKey = "immediate_job_{$jobId}";
            $jobData = Cache::get($cacheKey);

            // Si pas trouvé, essayer le cache sprint
            if (!$jobData) {
                $cacheKey = "sprint_job_{$jobId}";
                $jobData = Cache::get($cacheKey);
            }

            if (!$jobData) {
                return response()->json([
                    'success' => false,
                    'message' => 'Job non trouvé ou expiré',
                    'status' => 'not_found'
                ], 404);
            }

            Log::info("📊 [CONTROLLER] Statut job demandé", [
                'job_id' => $jobId,
                'status' => $jobData['status'],
                'progress' => $jobData['progress']
            ]);

            return response()->json([
                'success' => true,
                'job_id' => $jobData['job_id'],
                'status' => $jobData['status'],
                'progress' => $jobData['progress'],
                'current_step' => $jobData['current_step'] ?? null,
                'result' => $jobData['result'] ?? null,
                'updated_at' => $jobData['updated_at']
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [CONTROLLER] Erreur récupération statut job", [
                'job_id' => $request->query('job_id'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification du statut'
            ], 500);
        }
    }

    private function cleanGenerationCache(int $userId, string $featureKey): void
    {
        $caches = [
            "remaining_posts_{$userId}_{$featureKey}",
            "generation_completed_{$userId}_{$featureKey}",
            "generation_failed_{$userId}_{$featureKey}",
            "first_post_generated_{$userId}_{$featureKey}",
            "generation_in_progress_{$userId}_{$featureKey}"
        ];

        foreach ($caches as $cacheKey) {
            Cache::forget($cacheKey);
        }

        Log::info("🧹 [CONTROLLER] Cache génération nettoyé", [
            'user_id' => $userId,
            'feature_key' => $featureKey,
            'caches_cleaned' => count($caches)
        ]);
    }

    public function getFeatureInfo(string $featureKey): JsonResponse
    {
        try {
            $user = auth()->user();

            if (!in_array($featureKey, ['blog', 'social_media'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Feature key invalide'
                ], 400);
            }

            $feature = Feature::where('key', $featureKey)->first();

            if (!$feature) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fonctionnalité non trouvée'
                ], 404);
            }

            // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW)
            $userAccess = UserFeatureAccess::where('user_id', $user->id)
                ->where('feature_id', $feature->id)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at', 'desc')
                ->first();

            $hasAccess = $userAccess && $userAccess->isActive();

            return response()->json([
                'success' => true,
                'data' => [
                    'key' => $feature->key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'price' => $feature->price,
                    'category' => $feature->category,
                    'has_access' => $hasAccess,
                    'is_active' => $feature->is_active,
                    'user_activated' => $userAccess ? $userAccess->user_activated : false,
                    'is_expired' => $userAccess ? $userAccess->isExpired() : false,
                    'expires_at' => $userAccess?->expires_at?->toISOString(),
                    'days_remaining' => $userAccess?->getDaysRemaining()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur info fonctionnalité", [
                'user_id' => auth()->id(),
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations'
            ], 500);
        }
    }

    // === MÉTHODES CONSERVÉES IDENTIQUES ===

    public function submitActivationRequest(Request $request): JsonResponse
    {
        Log::info('📥 [BACKEND] Nouvelle demande d\'activation de fonctionnalité', [
            'user_id' => auth()->id(),
            'feature_id' => $request->feature_id
        ]);

        Log::info('📋 [BACKEND] Données reçues du formulaire:', [
            'feature_id' => $request->feature_id,
            'full_name' => $request->full_name,
            'email' => $request->email,
            'contact_number' => $request->contact_number,
            'invoice_number' => $request->invoice_number,
            'amount_claimed' => $request->amount_claimed,
            'payment_method' => $request->payment_method,
            'billing_period' => $request->billing_period,
            'original_price' => $request->original_price,
            'discount_percentage' => $request->discount_percentage,
            'user_message' => $request->user_message ? 'Présent' : 'Absent',
            'payment_proofs_count' => $request->hasFile('payment_proofs') ? count($request->file('payment_proofs')) : 0
        ]);

        $request->validate([
            'feature_id' => 'required|exists:features,id',
            'full_name' => 'required|string|max:255',
            'amount_claimed' => 'required|numeric|min:0',
            'payment_method' => 'required|string',
            'payment_proofs' => 'required|array',
            'payment_proofs.*' => 'file|max:10240',
            'user_message' => 'nullable|string|max:1000',
            'email' => 'required|email',
            'contact_number' => 'required|string',
            'invoice_number' => 'nullable|string',
            'billing_period' => 'nullable|in:monthly,yearly',
            'original_price' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $user = auth()->user();
        $feature = Feature::findOrFail($request->feature_id);

        // ✅ VALIDATION 1 : Vérifier qu'il n'y a pas déjà une demande en attente
        $existingRequest = FeatureActivationRequest::where('user_id', $user->id)
            ->where('feature_id', $request->feature_id)
            ->where('status', 'pending')
            ->first();

        if ($existingRequest) {
            return response()->json([
                'success' => false,
                'message' => 'Une demande est déjà en cours de traitement pour cette fonctionnalité'
            ], 409);
        }

        // ✅ VALIDATION 2 : Vérifier qu'il n'y a pas déjà un achat ACTIF (SOURCE DE VÉRITÉ = expires_at)
        $activeAccess = UserFeatureAccess::where('user_id', $user->id)
            ->where('feature_id', $request->feature_id)
            ->where(function($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->orderBy('expires_at', 'desc')
            ->first();

        if ($activeAccess) {
            $daysRemaining = $activeAccess->getDaysRemaining();

            return response()->json([
                'success' => false,
                'message' => "Vous avez déjà un accès actif à cette fonctionnalité ({$daysRemaining} jours restants). Vous pourrez racheter après expiration.",
                'active_access' => [
                    'expires_at' => $activeAccess->expires_at?->toISOString(),
                    'days_remaining' => $daysRemaining,
                    'can_purchase_at' => $activeAccess->expires_at?->toISOString()
                ]
            ], 409);
        }

        try {
            $proofPaths = [];
            $proofUrls = [];

            if ($request->hasFile('payment_proofs')) {
                foreach ($request->file('payment_proofs') as $file) {
                    $path = $file->store('payment_proofs', 'public');
                    $proofPaths[] = $path;
                    $proofUrls[] = config('app.url') . "/storage/{$path}";
                }
            }

            $activationRequest = FeatureActivationRequest::create([
                'user_id' => $user->id,
                'feature_id' => $request->feature_id,
                'full_name' => $request->full_name,
                'amount_claimed' => $request->amount_claimed,
                'payment_method' => $request->payment_method,
                'payment_proofs' => $proofPaths,
                'user_message' => $request->user_message,
                'email' => $request->email,
                'contact_number' => $request->contact_number,
                'invoice_number' => $request->invoice_number,
                'billing_period' => $request->billing_period ?? 'monthly',
                'original_price' => $request->original_price,
                'discount_percentage' => $request->discount_percentage ?? 0,
            ]);

            Log::info('✅ [BACKEND] Demande d\'activation créée en BDD', [
                'activation_request_id' => $activationRequest->id,
                'données_stockées' => [
                    'user_id' => $activationRequest->user_id,
                    'feature_id' => $activationRequest->feature_id,
                    'full_name' => $activationRequest->full_name,
                    'email' => $activationRequest->email,
                    'contact_number' => $activationRequest->contact_number,
                    'invoice_number' => $activationRequest->invoice_number,
                    'amount_claimed' => $activationRequest->amount_claimed,
                    'payment_method' => $activationRequest->payment_method,
                    'billing_period' => $activationRequest->billing_period,
                    'original_price' => $activationRequest->original_price,
                    'discount_percentage' => $activationRequest->discount_percentage,
                    'payment_proofs_count' => count($proofPaths),
                    'user_message' => $activationRequest->user_message ? 'Présent' : 'Absent'
                ]
            ]);

            $ticketTitle = "Demande d'activation - {$feature->name}";
            $ticketDescription = $this->createTicketDescription($feature, $request, $proofUrls, $activationRequest);

            Log::info('📝 [BACKEND] Description du ticket créée', [
                'ticket_title' => $ticketTitle,
                'description_length' => strlen($ticketDescription)
            ]);

            $ticket = Ticket::create([
                'user_id' => $user->id,
                'title' => $ticketTitle,
                'description' => $ticketDescription,
                'category' => 'payment',
                'status' => 'open',
            ]);

            $ticketMessage = TicketMessage::create([
                'ticket_id' => $ticket->id,
                'sender' => 'user',
                'text' => $ticketDescription,
            ]);

            $this->sendAdminPaymentNotificationEmail($user, $feature, $activationRequest, $proofUrls, $ticket);
            $this->sendUserConfirmationEmail($user, $feature, $activationRequest);
            $this->notifyAdmins($user, $feature, $activationRequest, $ticket);

            Log::info('Demande d\'activation créée avec succès', [
                'activation_request_id' => $activationRequest->id,
                'ticket_id' => $ticket->id,
                'user_id' => $user->id,
                'feature_id' => $feature->id,
                'proof_count' => count($proofPaths)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Demande d\'activation soumise avec succès',
                'data' => [
                    'id' => $activationRequest->id,
                    'ticket_id' => $ticket->id,
                    'feature_name' => $feature->name,
                    'status' => 'pending',
                    'proof_count' => count($proofPaths)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la création de la demande d\'activation', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'feature_id' => $request->feature_id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission de la demande'
            ], 500);
        }
    }

    public function getRequestHistory(): JsonResponse
    {
        $user = auth()->user();
        $requests = FeatureActivationRequest::where('user_id', $user->id)
            ->with('feature')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => $request->id,
                    'feature_name' => $request->feature->name,
                    'full_name' => $request->full_name,
                    'amount_claimed' => $request->amount_claimed,
                    'payment_method' => $request->payment_method,
                    'status' => $request->status,
                    'admin_response' => $request->admin_response,
                    'email' => $request->email,
                    'contact_number' => $request->contact_number,
                    'invoice_number' => $request->invoice_number,
                    'created_at' => $request->created_at,
                    'processed_at' => $request->processed_at,
                    // ✅ Ajouter les informations de facturation
                    'billing_period' => $request->billing_period ?? 'monthly',
                    'billing_period_label' => $request->billing_period === 'yearly' ? 'Annuel' : 'Mensuel',
                    'duration_label' => $request->billing_period === 'yearly' ? '12 mois' : '1 mois',
                    'original_price' => $request->original_price,
                    'discount_percentage' => $request->discount_percentage ?? 0,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    /**
     * ✅ NOUVEAU : Historique complet des achats (tous les UserFeatureAccess)
     * Chaque achat est un enregistrement distinct, même pour la même fonctionnalité
     */
    public function getPurchaseHistory(): JsonResponse
    {
        try {
            $user = auth()->user();

            // ✅ Récupérer TOUS les UserFeatureAccess de l'utilisateur (pas seulement les actifs)
            $purchases = UserFeatureAccess::with(['feature', 'adminEnabledBy'])
                ->where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($access) {
                    return [
                        'id' => $access->id,
                        'purchase_id' => "ACH-{$access->id}", // ID d'achat unique
                        'feature_id' => $access->feature->id,
                        'feature_key' => $access->feature->key,
                        'feature_name' => $access->feature->name,
                        'feature_description' => $access->feature->description,

                        // Informations de statut
                        'status' => $access->status,
                        'status_label' => $this->getStatusLabel($access->status),
                        'is_expired' => $access->isExpired(),
                        'is_active' => $access->isActive(),

                        // Informations temporelles
                        'purchased_at' => $access->created_at?->toISOString(),
                        'admin_enabled_at' => $access->admin_enabled_at?->toISOString(),
                        'user_activated_at' => $access->user_activated_at?->toISOString(),
                        'expires_at' => $access->expires_at?->toISOString(),
                        'days_remaining' => $access->getDaysRemaining(),

                        // Informations financières
                        'amount_paid' => $access->amount_paid,
                        'original_price' => $access->original_price,
                        'discount_percentage' => $access->discount_percentage,
                        'payment_method' => $access->payment_method,

                        // Informations de période
                        'billing_period' => $access->billing_period ?? 'monthly',
                        'billing_period_label' => $access->getPeriodLabel(),
                        'duration_days' => $access->getDurationInDays(),

                        // Informations admin
                        'admin_enabled_by_id' => $access->admin_enabled_by,
                        'admin_enabled_by_name' => $access->adminEnabledBy?->name,
                        'admin_notes' => $access->admin_notes,
                    ];
                });

            // ✅ Statistiques globales
            $stats = [
                'total_purchases' => $purchases->count(),
                'active_purchases' => $purchases->filter(fn($p) => $p['is_active'])->count(),
                'expired_purchases' => $purchases->filter(fn($p) => $p['is_expired'])->count(),
                'total_spent' => $purchases->sum('amount_paid'),
            ];

            return response()->json([
                'success' => true,
                'data' => $purchases,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur récupération historique achats", [
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique'
            ], 500);
        }
    }

    /**
     * ✅ Helper pour obtenir le label de statut
     */
    private function getStatusLabel(string $status): string
    {
        return match($status) {
            'active' => 'Actif',
            'expired' => 'Expiré',
            'cancelled' => 'Annulé',
            'pending' => 'En attente',
            default => 'Inconnu'
        };
    }

    public function getAvailableForPurchase(): JsonResponse
    {
        $user = auth()->user();

        // ✅ Exclure les fonctionnalités déjà activées (non expirées)
        $activatedFeatureIds = DB::table('user_feature_access')
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->where(function($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->pluck('feature_id')
            ->toArray();

        // ✅ Exclure les fonctionnalités avec demande en attente
        $pendingFeatureIds = DB::table('feature_activation_requests')
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->pluck('feature_id')
            ->toArray();

        // ✅ Combiner les deux listes
        $excludedFeatureIds = array_merge($activatedFeatureIds, $pendingFeatureIds);

        $features = Feature::active()
            ->whereNotIn('id', $excludedFeatureIds)
            ->get()
            ->map(function ($feature) {
                return [
                    'id' => $feature->id,
                    'key' => $feature->key,
                    'name' => $feature->name,
                    'description' => $feature->description,
                    'price' => $feature->price,
                    'category' => $feature->category,
                    'pricing' => $feature->getPricingDetails(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $features
        ]);
    }

    private function sendAdminPaymentNotificationEmail($user, $feature, $activationRequest, $proofUrls, $ticket): void
    {
        try {
            // ✅ Déterminer le label de période de facturation
            $billingPeriodLabel = $activationRequest->billing_period === 'yearly' ? 'Annuel' : 'Mensuel';
            $durationLabel = $activationRequest->billing_period === 'yearly' ? '12 mois' : '1 mois';

            $subject = "Nouvelle demande d'activation - {$feature->name} ({$billingPeriodLabel}) - {$activationRequest->amount_claimed}€";

            $emailContent = "NOUVELLE DEMANDE D'ACTIVATION DE FONCTIONNALITÉ

Une nouvelle demande d'activation a été soumise sur la plateforme PixelRise.

DÉTAILS DE LA DEMANDE
-----------------------------------------
Fonctionnalité : {$feature->name}
Prix officiel : {$feature->price}€
Formule : {$billingPeriodLabel}
Durée : {$durationLabel}
ID Demande : {$activationRequest->id}
Ticket associé : #{$ticket->id}

INFORMATIONS CLIENT
-----------------------------------------
Nom complet : {$activationRequest->full_name}
Email : {$activationRequest->email}
Téléphone : {$activationRequest->contact_number}
ID Utilisateur : {$user->id}

DÉTAILS DU PAIEMENT
-----------------------------------------
Montant déclaré : {$activationRequest->amount_claimed}€
Méthode de paiement : {$activationRequest->payment_method}

PIÈCES JUSTIFICATIVES (" . count($proofUrls) . " fichiers)
-----------------------------------------";

            foreach ($proofUrls as $index => $url) {
                $emailContent .= "\nJustificatif " . ($index + 1) . " : {$url}";
            }

            if ($activationRequest->user_message) {
                $emailContent .= "\n\nMESSAGE DU CLIENT
-----------------------------------------
{$activationRequest->user_message}";
            }

            $emailContent .= "\n\nACTIONS DISPONIBLES
-----------------------------------------
• Interface d'administration : " . config('app.frontend_url') . "/admin/features
• Consulter le ticket : " . config('app.frontend_url') . "/admin/tickets/{$ticket->id}
• Profil utilisateur : " . config('app.frontend_url') . "/admin/users/{$user->id}

Date de réception : " . now()->format('d/m/Y à H:i:s') . "

Cordialement,
Système de notification PixelRise";

            Mail::raw($emailContent, function ($message) use ($subject) {
                $message->to(env('MAIL_ADMIN_EMAIL', 'admin@pixel-rise.com'))
                        ->subject($subject);
            });

            Log::info('Email admin envoyé avec succès', [
                'admin_email' => env('MAIL_ADMIN_EMAIL'),
                'activation_request_id' => $activationRequest->id
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur envoi email admin', [
                'error' => $e->getMessage(),
                'activation_request_id' => $activationRequest->id
            ]);
        }
    }

    private function sendUserConfirmationEmail($user, $feature, $activationRequest): void
    {
        try {
            $subject = "Confirmation de réception - Demande d'activation {$feature->name}";

            // ✅ Déterminer le label de période de facturation
            $billingPeriodLabel = $activationRequest->billing_period === 'yearly' ? 'Annuel' : 'Mensuel';
            $durationLabel = $activationRequest->billing_period === 'yearly' ? '12 mois' : '1 mois';

            $emailContent = "Bonjour {$activationRequest->full_name},

Nous accusons réception de votre demande d'activation et vous remercions de votre confiance.

RÉCAPITULATIF DE VOTRE DEMANDE
-----------------------------------------
Fonctionnalité : {$feature->name}
Formule : {$billingPeriodLabel}
Durée : {$durationLabel}
Montant : {$activationRequest->amount_claimed}€
Méthode de paiement : {$activationRequest->payment_method}
Référence de demande : #{$activationRequest->id}

TRAITEMENT DE VOTRE DEMANDE
-----------------------------------------
1. Notre équipe technique procède à la vérification de vos justificatifs
2. Vous recevrez une notification de validation sous 24 à 48 heures
3. Une fois approuvée, la fonctionnalité sera activée sur votre compte pour {$durationLabel}

ACCÈS À VOTRE ESPACE CLIENT
-----------------------------------------
• Tableau de bord : " . config('app.frontend_url') . "/dashboard
• Gestion des fonctionnalités : " . config('app.frontend_url') . "/features
• Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Pour toute question, n'hésitez pas à nous contacter en répondant à ce message.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($activationRequest, $subject) {
                $message->to($activationRequest->email)
                        ->subject($subject);
            });

            Log::info('Email utilisateur envoyé avec succès', [
                'user_email' => $activationRequest->email,
                'activation_request_id' => $activationRequest->id
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur envoi email utilisateur', [
                'error' => $e->getMessage(),
                'user_email' => $activationRequest->email
            ]);
        }
    }

    private function createTicketDescription($feature, $request, $proofUrls, $activationRequest): string
    {
        // ✅ Déterminer le label de période de facturation
        $billingPeriodLabel = $activationRequest->billing_period === 'yearly' ? 'Annuel' : 'Mensuel';
        $durationLabel = $activationRequest->billing_period === 'yearly' ? '12 mois' : '1 mois';

        $ticketDescription = "DEMANDE D'ACTIVATION DE FONCTIONNALITÉ\n\n";

        $ticketDescription .= "FONCTIONNALITÉ DEMANDÉE\n";
        $ticketDescription .= "Nom : {$feature->name}\n";
        $ticketDescription .= "Prix officiel : {$feature->price}€\n";
        $ticketDescription .= "Formule : {$billingPeriodLabel}\n";
        $ticketDescription .= "Durée : {$durationLabel}\n";
        $ticketDescription .= "Référence demande : #{$activationRequest->id}\n\n";

        $ticketDescription .= "INFORMATIONS CLIENT\n";
        $ticketDescription .= "Nom complet : {$request->full_name}\n";
        $ticketDescription .= "Email : {$request->email}\n";
        $ticketDescription .= "Téléphone : {$request->contact_number}\n\n";

        $ticketDescription .= "DÉTAILS DU PAIEMENT\n";
        $ticketDescription .= "Montant déclaré : {$request->amount_claimed}€\n";
        $ticketDescription .= "Méthode : {$request->payment_method}\n";
        if ($request->invoice_number) {
            $ticketDescription .= "Numéro de facture : {$request->invoice_number}\n";
        }
        if ($request->user_message) {
            $ticketDescription .= "MESSAGE DU CLIENT\n";
            $ticketDescription .= $request->user_message . "\n\n";
        }

        $ticketDescription .= "PIÈCES JUSTIFICATIVES (" . count($proofUrls) . " fichiers)\n";
        foreach ($proofUrls as $index => $url) {
            $ticketDescription .= "Justificatif " . ($index + 1) . " : {$url}\n";
        }

        $ticketDescription .= "\nDate de soumission : " . now()->format('d/m/Y à H:i');

        return $ticketDescription;
    }

    private function notifyAdmins($user, $feature, $activationRequest, $ticket): void
    {
        try {
            $admins = \App\Models\User::where('is_admin', true)->get();

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'payment_request',
                    'priority' => 'high',
                    'status' => 'unread',
                    'title' => 'Nouvelle demande d\'activation',
                    'message' => "{$user->name} a soumis une demande d'activation pour {$feature->name} ({$activationRequest->amount_claimed}€)",
                    'data' => [
                        'activation_request_id' => $activationRequest->id,
                        'ticket_id' => $ticket->id,
                        'feature_id' => $feature->id,
                        'feature_name' => $feature->name,
                        'user_id' => $user->id,
                        'user_name' => $user->name,
                        'user_email' => $user->email,
                        'full_name' => $activationRequest->full_name,
                        'contact_email' => $activationRequest->email,
                        'contact_number' => $activationRequest->contact_number,
                        'amount_claimed' => $activationRequest->amount_claimed,
                        'payment_method' => $activationRequest->payment_method,
                        'proof_count' => count($activationRequest->payment_proofs),
                        'created_at' => $activationRequest->created_at->toDateTimeString(),
                    ],
                    'href' => "/admin/tickets/{$ticket->id}",
                    'category' => 'payment',
                    'tags' => ['payment', 'activation', 'feature', $feature->key, 'urgent'],
                    'show_badge' => true,
                ]);
            }

            Log::info('🔔 Notifications admin créées', [
                'admin_count' => $admins->count(),
                'activation_request_id' => $activationRequest->id
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur création notifications admin', [
                'error' => $e->getMessage(),
                'activation_request_id' => $activationRequest->id
            ]);
        }
    }

    /**
     * ✅ GÉNÉRATION PROGRESSIVE : Générer posts restants
     * POST /api/features/generate-remaining
     */
    public function generateRemainingPosts(Request $request): JsonResponse
    {
        $request->validate([
            'feature_key' => 'required|string|in:blog,social_media'
        ]);

        $user = auth()->user();
        $featureKey = $request->input('feature_key');

        // ✅ NOUVEAU : Verrou global anti-doublon génération
        $lockKey = "generation_lock_{$user->id}_{$featureKey}";
        if (Cache::has($lockKey)) {
            Log::warning("🚫 [CONTROLLER] Génération déjà en cours - demande rejetée", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'lock_exists' => true
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Génération déjà en cours, veuillez patienter',
                'locked' => true
            ], 429);
        }

        // ✅ Poser le verrou pour 5 minutes
        Cache::put($lockKey, now()->toISOString(), now()->addMinutes(5));

        Log::info("🔄 [CONTROLLER] Génération progressive demandée", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'lock_set' => true
        ]);

        try {
            // ✅ NOUVEAU : Vérifier d'abord le type d'utilisateur
            if ($user->isFreeUser()) {
                Log::warning("🚫 [GENERATE] Utilisateur gratuit tente d'accéder à la génération progressive", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'user_type' => $user->getUserType()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Cette fonctionnalité est réservée aux utilisateurs avec des fonctionnalités payantes',
                    'user_type' => 'free',
                    'reason' => 'no_paid_features',
                    'suggestion' => 'Achetez au moins une fonctionnalité pour accéder à la génération progressive'
                ], 403);
            }

            // Vérifier l'accès à la fonctionnalité
            $hasAccess = $this->checkFeatureAccess($user, $featureKey);

            if (!$hasAccess) {
                Log::warning("🚫 [GENERATE] Utilisateur payant sans accès à cette fonctionnalité spécifique", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'user_type' => $user->getUserType(),
                    'paid_features_count' => $user->getPaidFeaturesCount()
                ]);

                return response()->json([
                    'success' => false,
                    'message' => "Accès non autorisé à la fonctionnalité '{$featureKey}'",
                    'user_type' => 'paid',
                    'reason' => 'feature_not_purchased',
                    'suggestion' => "Achetez la fonctionnalité '{$featureKey}' pour y accéder"
                ], 403);
            }

            // Vérifier le statut de génération
            $cacheKey = "remaining_posts_{$user->id}_{$featureKey}";
            $progressState = Cache::get($cacheKey);

            if (!$progressState) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune génération en cours',
                    'posts_remaining' => 0
                ]);
            }

            if ($progressState['posts_remaining'] <= 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Génération terminée',
                    'posts_remaining' => 0,
                    'completed' => true
                ]);
            }

            // Vérifier le délai entre générations
            $canGenerate = !isset($progressState['can_generate_next']) || 
                          now()->isAfter(Carbon::parse($progressState['can_generate_next']));

            if (!$canGenerate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Veuillez patienter avant la prochaine génération',
                    'posts_remaining' => $progressState['posts_remaining'],
                    'next_generation_at' => $progressState['can_generate_next']
                ]);
            }

            // Déclencher le job de génération
            GenerateActivationPostsJob::dispatch($user, $featureKey, 1) // Générer 1 post
                ->onQueue('posts');

            // Mettre à jour le cache
            $progressState['posts_remaining']--;
            $progressState['posts_generated']++;
            $progressState['last_generation'] = now()->toISOString();
            $progressState['can_generate_next'] = now()->addMinutes(5)->toISOString(); // 5 min délai

            Cache::put($cacheKey, $progressState, now()->addDays(7));

            Log::info("✅ [CONTROLLER] Job génération progressive programmé", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'posts_remaining' => $progressState['posts_remaining'],
                'posts_generated' => $progressState['posts_generated']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Génération en cours',
                'posts_remaining' => $progressState['posts_remaining'],
                'posts_generated' => $progressState['posts_generated'],
                'next_generation_at' => $progressState['can_generate_next']
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [CONTROLLER] Erreur génération progressive", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération'
            ], 500);
        } finally {
            // ✅ NOUVEAU : Libérer le verrou dans tous les cas
            Cache::forget($lockKey);
            Log::info("🔓 [CONTROLLER] Verrou génération libéré", [
                'user_id' => $user->id,
                'feature_key' => $featureKey
            ]);
        }
    }

    /**
     * ✅ Vérifier l'accès à une fonctionnalité avec distinction payant/gratuit
     */
    private function checkFeatureAccess($user, string $featureKey): bool
    {
        Log::info("🔍 [ACCESS_CHECK] Vérification accès fonctionnalité", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'user_type' => $user->getUserType(),
            'is_paid_user' => $user->isPaidUser(),
            'paid_features_count' => $user->getPaidFeaturesCount()
        ]);

        // ✅ NOUVEAU : Vérifier si l'utilisateur peut accéder aux fonctionnalités progressives
        if (!$user->canAccessProgressiveFeatures()) {
            Log::warning("❌ [ACCESS_CHECK] Utilisateur gratuit sans accès aux fonctionnalités progressives", [
                'user_id' => $user->id,
                'user_type' => $user->getUserType(),
                'feature_key' => $featureKey
            ]);
            return false;
        }

        // ✅ BASÉ SUR LA DATE : Vérifier l'accès avec expires_at uniquement
        $hasAccess = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                $query->where('key', $featureKey);
            })
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where(function($q) {
                // ✅ Actif = pas d'expiration OU expiration dans le futur
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->exists();

        Log::info("✅ [ACCESS_CHECK] Résultat vérification", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'has_access' => $hasAccess,
            'user_type' => $user->getUserType()
        ]);

        return $hasAccess;
    }

    /**
     * ✅ NOUVEAU : Générer le premier post IMMÉDIATEMENT lors de l'activation
     */
    private function generateImmediatePost($user, string $featureKey, int $accessId): array
    {
        try {
            Log::info("⚡ [IMMEDIATE] Génération post immédiat pour activation", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'access_id' => $accessId
            ]);

            // ✅ Vérifier si un post existe déjà aujourd'hui pour éviter les doublons
            $today = \Carbon\Carbon::now()->startOfDay();

            if ($featureKey === 'blog') {
                $existingPost = \App\Models\BlogPost::where('user_id', $user->id)
                    ->where('user_feature_access_id', $accessId)
                    ->whereDate('created_at', $today)
                    ->first();

                if ($existingPost) {
                    Log::info("⏭️ [IMMEDIATE] Post déjà existant aujourd'hui - skip génération", [
                        'user_id' => $user->id,
                        'feature_key' => $featureKey,
                        'existing_post_id' => $existingPost->id,
                        'created_at' => $existingPost->created_at
                    ]);

                    return [
                        'success' => true,
                        'data' => $existingPost,
                        'skipped' => true,
                        'message' => 'Post existant utilisé'
                    ];
                }
            } elseif ($featureKey === 'social_media') {
                $existingPost = \App\Models\SocialMediaPost::where('user_id', $user->id)
                    ->where('user_feature_access_id', $accessId)
                    ->whereDate('created_at', $today)
                    ->first();

                if ($existingPost) {
                    Log::info("⏭️ [IMMEDIATE] Post social déjà existant aujourd'hui - skip génération", [
                        'user_id' => $user->id,
                        'feature_key' => $featureKey,
                        'existing_post_id' => $existingPost->id,
                        'created_at' => $existingPost->created_at
                    ]);

                    return [
                        'success' => true,
                        'data' => $existingPost,
                        'skipped' => true,
                        'message' => 'Post existant utilisé'
                    ];
                }
            }

            $weeklyService = app(\App\Services\ContentGeneration\WeeklyPostGenerationService::class);

            // ✅ Post IMMÉDIAT (aujourd'hui) = published directement
            // ⚠️ DIFFÉRENT du système automatique qui gère scheduled → published
            $dayInfo = [
                'date' => \Carbon\Carbon::now(),
                'day_name' => strtolower(\Carbon\Carbon::now()->format('l')),
                'is_today' => true,
                'status' => 'published' // Immédiat = déjà publié
            ];

            if ($featureKey === 'blog') {
                $result = $weeklyService->generateSingleBlogPost($user, $dayInfo, $accessId);
                
                Log::info("✅ [IMMEDIATE] Blog post immédiat généré", [
                    'user_id' => $user->id,
                    'success' => $result['success'],
                    'post_id' => $result['success'] ? $result['data']->id : null
                ]);
                
                return $result;
                
            } elseif ($featureKey === 'social_media') {
                // ✅ Première plateforme TOUJOURS facebook (selon tes règles)
                $platform = 'facebook';
                $result = $weeklyService->generateSingleSocialPost($user, $platform, $dayInfo, $accessId);
                
                Log::info("✅ [IMMEDIATE] Social post immédiat généré", [
                    'user_id' => $user->id,
                    'platform' => $platform,
                    'success' => $result['success'],
                    'post_id' => $result['success'] ? $result['data']->id : null
                ]);
                
                return $result;
            }

            return ['success' => false, 'error' => 'Feature key non supporté'];

        } catch (\Exception $e) {
            Log::error("❌ [IMMEDIATE] Erreur génération post immédiat", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * ✅ NOUVEAU : Programmer les posts restants en arrière-plan (sans le premier)
     */
    private function scheduleRemainingPosts($user, string $featureKey, int $accessId): int
    {
        try {
            // ✅ CRITIQUE : Vérifier si génération déjà en cours ou terminée (éviter doublons)
            $activationKey = "activation_generation_{$user->id}_{$featureKey}";
            $completedKey = "activation_completed_{$user->id}_{$featureKey}";
            
            if (Cache::has($activationKey)) {
                Log::warning("⚠️ [REMAINING] Génération déjà en cours - SKIP pour éviter doublon", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'access_id' => $accessId
                ]);
                return 0;
            }

            if (Cache::has($completedKey)) {
                $completed = Cache::get($completedKey);
                Log::warning("⚠️ [REMAINING] Génération déjà terminée aujourd'hui - SKIP pour éviter doublon", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'completed_at' => $completed['completed_at'] ?? 'unknown',
                    'posts_generated' => $completed['total_posts'] ?? 0
                ]);
                return 0;
            }

            // ✅ CORRECTION : Vérifier combien de posts existent déjà cette semaine (peu importe l'access_id)
            // Règle : Rachat = Réactivation, on continue depuis le dernier état
            $today = \Carbon\Carbon::now();
            $weekStart = $today->copy()->startOfWeek();
            $weekEnd = $today->copy()->endOfWeek();

            $existingPostsThisWeek = 0;
            if ($featureKey === 'blog') {
                $existingPostsThisWeek = \App\Models\BlogPost::where('user_id', $user->id)
                    // ✅ SUPPRIMÉ : ->where('user_feature_access_id', $accessId)
                    // On compte TOUS les posts IA de la semaine
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$weekStart, $weekEnd])
                    ->count();
            } elseif ($featureKey === 'social_media') {
                $existingPostsThisWeek = \App\Models\SocialMediaPost::where('user_id', $user->id)
                    // ✅ SUPPRIMÉ : ->where('user_feature_access_id', $accessId)
                    // On compte TOUS les posts IA de la semaine
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$weekStart, $weekEnd])
                    ->count();
            }

            // ✅ Calculer nombre total de posts selon le jour d'activation
            $totalPostsNeeded = $this->calculateRemainingPostsByFeature($user, $featureKey);

            // ✅ CORRECTION CRITIQUE : Posts restants = total nécessaire - posts déjà existants - 1 (post immédiat)
            // Le -1 tient compte du post immédiat qui vient d'être généré juste avant
            $remainingPosts = max(0, $totalPostsNeeded - $existingPostsThisWeek - 1);

            Log::info("📅 [REMAINING] Vérification posts semaine actuelle", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'access_id' => $accessId,
                'week_start' => $weekStart->format('Y-m-d'),
                'week_end' => $weekEnd->format('Y-m-d'),
                'existing_posts_this_week' => $existingPostsThisWeek,
                'total_posts_needed' => $totalPostsNeeded,
                'remaining_to_generate' => $remainingPosts
            ]);

            if ($remainingPosts > 0) {
                // ✅ Marquer génération en cours pour éviter doublons
                Cache::put($activationKey, [
                    'status' => 'scheduled',
                    'feature_key' => $featureKey,
                    'access_id' => $accessId,
                    'remaining_posts' => $remainingPosts,
                    'scheduled_at' => now()->toISOString()
                ], now()->addHours(2));

                // ✅ CORRECTION : Programmer IMMÉDIATEMENT (pas de délai)
                \App\Jobs\GenerateActivationPostsJob::dispatch($user, $featureKey, $remainingPosts, $accessId)
                    ->onQueue('posts');

                Log::info("✅ [REMAINING] Job posts restants programmé", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'remaining_posts' => $remainingPosts,
                    'access_id' => $accessId
                ]);
            } else {
                Log::info("ℹ️ [REMAINING] Aucun post restant à générer", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'reason' => 'Tous les posts de la semaine sont déjà générés'
                ]);
            }

            return $remainingPosts;

        } catch (\Exception $e) {
            Log::error("❌ [REMAINING] Erreur programmation posts restants", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return 0;
        }
    }

    /**
     * ✅ NOUVEAU : Déclencher génération sprint 100% ASYNCHRONE avec modal de progression
     */
    private function triggerSprintGenerationAsync($user, string $jobId = null): array
    {
        try {
            Log::info("🎯 [CONTROLLER] Programmation sprint asynchrone pour utilisateur", [
                'user_id' => $user->id,
                'job_id' => $jobId
            ]);

            // ✅ CORRECTION CRITIQUE : Programmer via job au lieu d'exécution synchrone
            // Trouver le premier projet actif de l'utilisateur
            $activeProject = \App\Models\Project::where('user_id', $user->id)
                ->where('is_active', true)
                ->first();

            if (!$activeProject) {
                return [
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ];
            }

            // ✅ NOUVEAU : Récupérer l'access_id actif pour sprint_planning (le plus récent)
            $sprintAccess = \App\Models\UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'sprint_planning');
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('admin_enabled_at', 'desc') // ✅ CORRECTION : Trier par date d'achat
                ->first();

            $accessId = $sprintAccess ? $sprintAccess->id : null;

            // ✅ NOUVEAU : Dispatcher le job immédiat avec modal de progression
            if ($jobId) {
                Log::info("🚀 [CONTROLLER] Dispatch job immédiat sprint avec modal", [
                    'user_id' => $user->id,
                    'job_id' => $jobId,
                    'access_id' => $accessId
                ]);

                \App\Jobs\GenerateImmediateSprintJob::dispatch(
                    $user->id,
                    $accessId,
                    $jobId
                )->onQueue('default');

                Log::info("✅ [CONTROLLER] Sprint job immédiat dispatché", [
                    'user_id' => $user->id,
                    'job_id' => $jobId,
                    'queue' => 'default'
                ]);
            } else {
                // ✅ FALLBACK : Ancien système sans modal (pour compatibilité)
                \App\Jobs\GenerateOptimizedSprintJob::dispatch($user, $activeProject, 'generation', $accessId)
                    ->onQueue('default');

                Log::info("✅ [CONTROLLER] Sprint optimisé programmé (sans modal)", [
                    'user_id' => $user->id,
                    'project_id' => $activeProject->id
                ]);
            }

            return [
                'success' => true,
                'message' => 'Sprint optimisé programmé - jour actuel d\'abord',
                'scheduled_for_user' => $user->id,
                'project_id' => $activeProject->id,
                'generation_type' => 'generation',
                'optimization_enabled' => true,
                'blocking' => false
            ];

        } catch (\Exception $e) {
            Log::error("❌ [CONTROLLER] Erreur programmation sprint asynchrone", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'blocking' => false
            ];
        }
    }

    /**
     * ✅ TRIGGER GÉNÉRATION PROGRESSIVE MANUEL (DEBUG/ADMIN)
     * POST /api/features/trigger-progressive
     */
    public function triggerProgressiveGeneration(Request $request): JsonResponse
    {
        $request->validate([
            'feature_key' => 'required|string|in:blog,social_media',
            'force' => 'sometimes|boolean'
        ]);

        $user = auth()->user();
        $featureKey = $request->input('feature_key');
        $force = $request->input('force', false);

        Log::info("🔧 [CONTROLLER] Trigger génération progressive manuel", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'force' => $force
        ]);

        try {
            // Vérifier l'accès
            $hasAccess = $this->checkFeatureAccess($user, $featureKey);
            
            if (!$hasAccess) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé à cette fonctionnalité'
                ], 403);
            }

            // Si force, programmer la génération via scheduleAsyncGeneration
            if ($force) {
                $postsRemaining = $this->scheduleAsyncGeneration($user, $featureKey);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Génération forcée déclenchée',
                    'posts_scheduled' => $postsRemaining
                ]);
            }

            // Sinon, appeler generateRemainingPosts
            $request->merge(['feature_key' => $featureKey]);
            return $this->generateRemainingPosts($request);

        } catch (\Exception $e) {
            Log::error("❌ [CONTROLLER] Erreur trigger génération progressive", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du déclenchement'
            ], 500);
        }
    }

    /**
     * Obtenir les détails d'une fonctionnalité pour l'achat
     */
    public function getPurchaseDetails(int $featureId)
    {
        try {
            $user = auth()->user();
            $feature = Feature::findOrFail($featureId);

            // Vérifier si l'utilisateur a déjà accès à cette fonctionnalité
            $existingAccess = UserFeatureAccess::where('user_id', $user->id)
                ->where('feature_id', $featureId)
                ->where('expires_at', '>', now())
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'feature' => $feature,
                    'has_existing_access' => $existingAccess !== null,
                    'existing_access_expires_at' => $existingAccess ? $existingAccess->expires_at : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des détails de la fonctionnalité', [
                'feature_id' => $featureId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Impossible de récupérer les détails de la fonctionnalité'
            ], 500);
        }
    }

    /**
     * ✅ NIVEAU 1 : Générer automatiquement les objectifs hebdomadaires lors de l'activation
     */
    private function ensureWeeklyObjectivesExist($user, string $featureKey): void
    {
        try {
            Log::info("🎯 [OBJECTIVES] Vérification objectifs hebdomadaires", [
                'user_id' => $user->id,
                'feature_key' => $featureKey
            ]);

            // Récupérer le projet actif de l'utilisateur
            $project = $user->projects()->where('is_active', true)->first();
            
            if (!$project) {
                Log::warning("⚠️ [OBJECTIVES] Aucun projet actif - création automatique", [
                    'user_id' => $user->id
                ]);
                
                // Créer un projet par défaut si aucun n'existe
                $project = \App\Models\Project::create([
                    'user_id' => $user->id,
                    'name' => 'Mon Projet',
                    'description' => 'Projet créé automatiquement',
                    'is_active' => true
                ]);
            }

            $weekIdentifier = \Carbon\Carbon::now()->format('Y-\WW');
            
            // Mapper feature_key vers content_type
            $contentType = $featureKey === 'blog' ? 'blog' : 'social_media';

            // Vérifier si les objectifs existent déjà
            $existingObjective = \App\Models\WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => $contentType
            ])->first();

            if ($existingObjective) {
                Log::info("✅ [OBJECTIVES] Objectifs déjà existants", [
                    'user_id' => $user->id,
                    'content_type' => $contentType,
                    'week_identifier' => $weekIdentifier
                ]);
                return;
            }

            // Générer les objectifs via le service
            $weeklyObjectivesService = app(\App\Services\ContentGeneration\WeeklyObjectivesService::class);
            $result = $weeklyObjectivesService->generateWeeklyObjectives($project, $weekIdentifier);

            if ($result['success']) {
                Log::info("✅ [OBJECTIVES] Objectifs générés automatiquement", [
                    'user_id' => $user->id,
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier,
                    'content_type' => $contentType
                ]);
            } else {
                Log::error("❌ [OBJECTIVES] Échec génération objectifs", [
                    'user_id' => $user->id,
                    'error' => $result['error'] ?? 'Erreur inconnue'
                ]);
            }

        } catch (\Exception $e) {
            Log::error("❌ [OBJECTIVES] Erreur génération objectifs", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * ✅ NOUVEAU : Sauvegarder les plateformes sociales sélectionnées
     */
    public function saveSocialPlatforms(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            $validated = $request->validate([
                'platforms' => 'required|array|min:1',
                'platforms.*' => 'required|string|in:facebook,instagram,linkedin,twitter'
            ]);

            // Récupérer l'accès social_media
            $access = UserFeatureAccess::where('user_id', $user->id)
                ->whereHas('feature', function($query) {
                    $query->where('key', 'social_media');
                })
                ->where('admin_enabled', true)
                ->where('status', 'active')
                ->first();

            if (!$access) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fonctionnalité réseaux sociaux non disponible'
                ], 404);
            }

            // Sauvegarder les plateformes
            $access->enabled_platforms = $validated['platforms'];
            $access->save();

            // ✅ NOUVEAU : Vider le cache de génération pour permettre une nouvelle génération
            $completedKey = "activation_completed_{$user->id}_social_media";
            $activationKey = "activation_in_progress_{$user->id}_social_media";
            
            Cache::forget($completedKey);
            Cache::forget($activationKey);

            Log::info("✅ [PLATFORMS] Plateformes sociales sauvegardées", [
                'user_id' => $user->id,
                'platforms' => $validated['platforms'],
                'access_id' => $access->id,
                'cache_cleared' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Plateformes sauvegardées avec succès',
                'data' => [
                    'platforms' => $access->enabled_platforms
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [PLATFORMS] Erreur sauvegarde plateformes", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la sauvegarde des plateformes'
            ], 500);
        }
    }

    /**
     * Récupérer les plateformes sociales activées pour un site PRO.
     */
    public function getSocialPlatforms(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            $siteId = $request->query('site_id');

            $site = \App\Models\UserSite::where('user_id', $user->id)
                ->when($siteId, fn($q) => $q->where('id', $siteId))
                ->whereHas('planAssignment', fn($q) => $q->where('effective_plan_key', 'pro'))
                ->first();

            $platforms = $site?->social_enabled_platforms ?? [];

            return response()->json([
                'success' => true,
                'data' => [
                    'platforms' => $platforms,
                    'all_platforms' => ['facebook', 'instagram', 'linkedin', 'twitter']
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [PLATFORMS] Erreur récupération plateformes", ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des plateformes'
            ], 500);
        }
    }

    /**
     * Toggle une plateforme sociale individuelle sur un site PRO.
     */
    public function togglePlatform(Request $request): JsonResponse
    {
        $request->validate([
            'platform' => 'required|string|in:facebook,instagram,linkedin,twitter',
            'activate'  => 'required|boolean',
            'site_id'   => 'nullable|string',
        ]);

        try {
            $user     = auth()->user();
            $platform = $request->input('platform');
            $activate = $request->input('activate');
            $siteId   = $request->input('site_id');

            $site = \App\Models\UserSite::where('user_id', $user->id)
                ->when($siteId, fn($q) => $q->where('id', $siteId))
                ->whereHas('planAssignment', fn($q) => $q->where('effective_plan_key', 'pro'))
                ->first();

            if (!$site) {
                return response()->json([
                    'success' => false,
                    'message' => 'Site PRO introuvable'
                ], 404);
            }

            $enabledPlatforms = $site->social_enabled_platforms ?? [];

            if ($activate) {
                if (!in_array($platform, $enabledPlatforms)) {
                    $enabledPlatforms[] = $platform;
                    Log::info("✅ [TOGGLE-PLATFORM] Plateforme ajoutée", [
                        'user_id' => $user->id, 'site_id' => $site->id, 'platform' => $platform,
                    ]);
                    $this->generatePostsForPlatform($user, $platform, null);
                }
            } else {
                $enabledPlatforms = array_values(array_filter($enabledPlatforms, fn($p) => $p !== $platform));
                Log::info("🚫 [TOGGLE-PLATFORM] Plateforme retirée", [
                    'user_id' => $user->id, 'site_id' => $site->id, 'platform' => $platform,
                ]);
            }

            $site->update(['social_enabled_platforms' => $enabledPlatforms]);

            return response()->json([
                'success' => true,
                'message' => $activate ? 'Plateforme activée' : 'Plateforme désactivée',
                'data'    => [
                    'platform'         => $platform,
                    'is_active'        => $activate,
                    'enabled_platforms' => $enabledPlatforms,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [TOGGLE-PLATFORM] Erreur", [
                'user_id'  => auth()->id(),
                'platform' => $request->input('platform'),
                'error'    => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du toggle de la plateforme'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Générer des posts pour une plateforme spécifique (lors activation)
     */
    private function generatePostsForPlatform($user, $platform, $accessId): void
    {
        try {
            Log::info("🚀 [PLATFORM-GENERATION] Génération pour plateforme activée", [
                'user_id' => $user->id,
                'platform' => $platform,
                'access_id' => $accessId
            ]);

            // ✅ Calculer le nombre de posts selon le jour de la semaine
            $dayOfWeek = strtolower(now()->format('l'));
            $postsCount = [
                'monday' => 7,
                'tuesday' => 6,
                'wednesday' => 5,
                'thursday' => 4,
                'friday' => 3,
                'saturday' => 2,
                'sunday' => 1
            ][$dayOfWeek] ?? 1;

            // ✅ Lancer le job de génération (seulement pour cette plateforme)
            \App\Jobs\GenerateActivationPostsJob::dispatch(
                $user,
                'social_media',
                $postsCount,
                $accessId,
                false // Ne pas skip le premier post
            )->onQueue('posts');

            Log::info("✅ [PLATFORM-GENERATION] Job programmé", [
                'user_id' => $user->id,
                'platform' => $platform,
                'posts_count' => $postsCount
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [PLATFORM-GENERATION] Erreur", [
                'user_id' => $user->id,
                'platform' => $platform,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ CORRECTION : Détecter si réactivation (posts existent cette semaine, peu importe l'access_id)
     * Rachat = Réactivation, même comportement qu'une simple désactivation/réactivation
     */
    private function isFeatureReactivation($user, string $featureKey): bool
    {
        try {
            $now = Carbon::now();
            $startOfWeek = $now->copy()->startOfWeek(); // Lundi
            $endOfWeek = $now->copy()->endOfWeek(); // Dimanche

            if ($featureKey === 'blog') {
                // ✅ Vérifier TOUS les posts IA de la semaine (peu importe l'access_id)
                $existingPosts = \App\Models\BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                Log::info("🔍 [REACTIVATION-CHECK] Vérification blog", [
                    'user_id' => $user->id,
                    'existing_posts' => $existingPosts,
                    'week_start' => $startOfWeek->format('Y-m-d'),
                    'week_end' => $endOfWeek->format('Y-m-d')
                ]);

                return $existingPosts > 0;
            }

            if ($featureKey === 'social_media') {
                // ✅ Vérifier TOUS les posts IA de la semaine (peu importe l'access_id)
                $existingPosts = \App\Models\SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                Log::info("🔍 [REACTIVATION-CHECK] Vérification social", [
                    'user_id' => $user->id,
                    'existing_posts' => $existingPosts,
                    'week_start' => $startOfWeek->format('Y-m-d'),
                    'week_end' => $endOfWeek->format('Y-m-d')
                ]);

                return $existingPosts > 0;
            }

            if ($featureKey === 'sprint_planning') {
                // ✅ Vérifier TOUS les sprints de la semaine (peu importe l'access_id)
                $existingSprints = \App\Models\Sprint::where('user_id', $user->id)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                Log::info("🔍 [REACTIVATION-CHECK] Vérification sprint", [
                    'user_id' => $user->id,
                    'existing_sprints' => $existingSprints,
                    'week_start' => $startOfWeek->format('Y-m-d'),
                    'week_end' => $endOfWeek->format('Y-m-d')
                ]);

                return $existingSprints > 0;
            }

            return false;

        } catch (\Exception $e) {
            Log::error("💥 [REACTIVATION-CHECK] Erreur", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}
