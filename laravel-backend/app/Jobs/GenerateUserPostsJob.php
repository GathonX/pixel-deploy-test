<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class GenerateUserPostsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutes max
    public $tries = 1; // 1 seule tentative

    private User $user;
    private string $featureKey;

    public function __construct(User $user, string $featureKey)
    {
        $this->user = $user;
        $this->featureKey = $featureKey;
    }

    /**
     * ✅ NOUVEAU : Génération hebdomadaire complète (7 blog + 7 social posts)
     * Utilisé pour la régénération automatique chaque lundi
     */
    public function handle(): void
    {
        try {
            Log::info("🚀 [JOB] Génération hebdomadaire démarrée", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'week' => now()->format('Y-W'),
                'timestamp' => now()->toISOString()
            ]);

            // ✅ Marquer génération en cours
            Cache::put("generation_in_progress_{$this->user->id}_{$this->featureKey}", [
                'status' => 'processing',
                'feature_key' => $this->featureKey,
                'started_at' => now()->toISOString(),
                'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution'
            ], now()->addHours(1));

            // ✅ NOUVEAU : Initialiser l'état de génération progressive
            $this->initializeProgressiveGeneration();

            // ✅ NOUVEAU : Génération hebdomadaire complète (7 posts) pour régénération lundi
            $result = $this->generateWeeklyRegeneration();

            if ($result['success']) {
                $totalGenerated = count($result['data']['blog_posts'] ?? []) + count($result['data']['social_posts'] ?? []);
                
                Log::info("✅ [JOB] Génération hebdomadaire réussie", [
                    'user_id' => $this->user->id,
                    'feature_key' => $this->featureKey,
                    'blog_posts' => count($result['data']['blog_posts'] ?? []),
                    'social_posts' => count($result['data']['social_posts'] ?? []),
                    'total_posts' => $totalGenerated
                ]);

                // ✅ NOUVEAU : Marquer la génération hebdomadaire comme terminée
                $this->updateProgressiveState($totalGenerated);

                Cache::put("first_post_generated_{$this->user->id}_{$this->featureKey}", [
                    'status' => 'completed',
                    'feature_key' => $this->featureKey,
                    'completed_at' => now()->toISOString(),
                    'blog_posts_count' => count($result['data']['blog_posts'] ?? []),
                    'social_posts_count' => count($result['data']['social_posts'] ?? [])
                ], now()->addDays(1));

            } else {
                Log::error("❌ [JOB] Échec génération post du jour", [
                    'user_id' => $this->user->id,
                    'feature_key' => $this->featureKey,
                    'error' => $result['error'] ?? 'Erreur inconnue'
                ]);

                Cache::put("generation_failed_{$this->user->id}_{$this->featureKey}", [
                    'status' => 'failed',
                    'error' => $result['error'] ?? 'Erreur inconnue',
                    'failed_at' => now()->toISOString()
                ], now()->addHours(24));
            }

            // ✅ Nettoyer cache génération en cours
            Cache::forget("generation_in_progress_{$this->user->id}_{$this->featureKey}");

        } catch (\Exception $e) {
            Log::error("💥 [JOB] Exception génération post du jour", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            Cache::forget("generation_in_progress_{$this->user->id}_{$this->featureKey}");

            Cache::put("generation_failed_{$this->user->id}_{$this->featureKey}", [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'failed_at' => now()->toISOString()
            ], now()->addHours(24));

            throw $e;
        }
    }

    /**
     * ✅ NOUVEAU : Initialiser l'état de génération progressive
     */
    private function initializeProgressiveGeneration(): void
    {
        try {
            Log::info("📋 [JOB] Initialisation génération progressive", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey
            ]);

            // ✅ Calculer posts restants basés sur les jours jusqu'à dimanche
            $postsRemaining = $this->calculateRemainingPosts();

            $cacheKey = "remaining_posts_{$this->user->id}_{$this->featureKey}";

            $progressState = [
                'posts_remaining' => $postsRemaining,
                'activation_date' => now()->toISOString(),
                'last_generation' => null,
                'can_generate_next' => now()->addMinutes(3)->toISOString(), // Prochain dans 3 min
                'feature_key' => $this->featureKey,
                'initialized_by_job' => true
            ];

            Cache::put($cacheKey, $progressState, now()->addDays(7));

            Log::info("✅ [JOB] État progressif initialisé", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'posts_remaining' => $postsRemaining,
                'cache_key' => $cacheKey,
                'next_generation' => $progressState['can_generate_next']
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [JOB] Erreur initialisation progressive", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ NOUVEAU : Calculer le nombre de posts restants à générer
     */
    private function calculateRemainingPosts(): int
    {
        $now = Carbon::now();
        $endOfWeek = $now->copy()->endOfWeek();
        $daysUntilSunday = $now->diffInDays($endOfWeek);

        // Calcul intelligent basé sur les jours restants
        // - 1 car on génère déjà le post d'aujourd'hui
        $remainingPosts = max(0, $daysUntilSunday * 2); // 2 posts par jour restant (1 blog + 1 social)

        Log::info("📊 [JOB] Calcul posts restants", [
            'user_id' => $this->user->id,
            'current_day' => $now->format('l'),
            'days_until_sunday' => $daysUntilSunday,
            'posts_remaining' => $remainingPosts
        ]);

        return min(14, $remainingPosts); // Maximum 14 posts restants
    }

    /**
     * ✅ NOUVEAU : Génération hebdomadaire complète (utilise WeeklyPostGenerationService)
     */
    private function generateWeeklyRegeneration(): array
    {
        try {
            Log::info("📅 [JOB] Génération hebdomadaire complète", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'week' => now()->format('Y-W'),
                'date' => now()->format('Y-m-d')
            ]);

            // ✅ NOUVEAU : Utiliser la nouvelle méthode de génération hebdomadaire
            $weeklyService = app(WeeklyPostGenerationService::class);
            $result = $weeklyService->generateWeeklyRegeneration($this->user);

            if ($result['success']) {
                Log::info("✅ [JOB] Service a généré la semaine complète", [
                    'user_id' => $this->user->id,
                    'blog_posts_count' => count($result['data']['blog_posts'] ?? []),
                    'social_posts_count' => count($result['data']['social_posts'] ?? []),
                    'total_posts' => count($result['data']['blog_posts'] ?? []) + count($result['data']['social_posts'] ?? [])
                ]);
            } else {
                Log::error("❌ [JOB] Service génération hebdomadaire a échoué", [
                    'user_id' => $this->user->id,
                    'error' => $result['error'] ?? 'Erreur service'
                ]);
            }

            return $result;

        } catch (\Exception $e) {
            Log::error("💥 [JOB] Exception génération hebdomadaire", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Exception génération hebdomadaire: ' . $e->getMessage(),
                'data' => ['blog_posts' => [], 'social_posts' => []]
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Mettre à jour l'état de génération progressive
     */
    private function updateProgressiveState(int $postsGenerated): void
    {
        try {
            $cacheKey = "remaining_posts_{$this->user->id}_{$this->featureKey}";
            $progressState = Cache::get($cacheKey);

            if ($progressState) {
                $progressState['posts_remaining'] = max(0, $progressState['posts_remaining'] - $postsGenerated);
                $progressState['last_generation'] = now()->toISOString();
                $progressState['can_generate_next'] = now()->addMinutes(3)->toISOString();

                Cache::put($cacheKey, $progressState, now()->addDays(7));

                Log::info("🔄 [JOB] État progressif mis à jour", [
                    'user_id' => $this->user->id,
                    'feature_key' => $this->featureKey,
                    'posts_generated' => $postsGenerated,
                    'posts_remaining' => $progressState['posts_remaining'],
                    'next_generation' => $progressState['can_generate_next']
                ]);
            }

        } catch (\Exception $e) {
            Log::error("💥 [JOB] Erreur mise à jour état progressif", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ NOUVEAU : Obtenir le statut du job pour debug
     */
    public function getJobStatus(): array
    {
        return [
            'user_id' => $this->user->id,
            'feature_key' => $this->featureKey,
            'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution',
            'timeout' => $this->timeout,
            'tries' => $this->tries,
            'created_at' => now()->toISOString()
        ];
    }

    /**
     * ✅ NOUVEAU : Log détaillé en cas d'échec définitif
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("💀 [JOB] Job définitivement échoué", [
            'user_id' => $this->user->id,
            'feature_key' => $this->featureKey,
            'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution',
            'exception_class' => get_class($exception),
            'exception_message' => $exception->getMessage(),
            'exception_file' => $exception->getFile(),
            'exception_line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString()
        ]);

        // ✅ Nettoyer tous les caches liés
        $this->cleanupCaches();

        // ✅ Marquer comme échoué pour le frontend
        Cache::put("generation_failed_{$this->user->id}_{$this->featureKey}", [
            'status' => 'definitively_failed',
            'error' => $exception->getMessage(),
            'failed_at' => now()->toISOString(),
            'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution',
            'exception_class' => get_class($exception)
        ], now()->addDays(1));
    }

    /**
     * ✅ NOUVEAU : Nettoyer tous les caches en cas d'échec
     */
    private function cleanupCaches(): void
    {
        try {
            $cachesToClean = [
                "generation_in_progress_{$this->user->id}_{$this->featureKey}",
                "remaining_posts_{$this->user->id}_{$this->featureKey}",
                "first_post_generated_{$this->user->id}_{$this->featureKey}"
            ];

            foreach ($cachesToClean as $cacheKey) {
                Cache::forget($cacheKey);
            }

            Log::info("🧹 [JOB] Caches nettoyés après échec", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'caches_cleaned' => count($cachesToClean)
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [JOB] Erreur nettoyage caches", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage()
            ]);
        }
    }
}
