<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use Carbon\Carbon;

class GenerateImmediatePostJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public $timeout = 120; // 2 minutes max
    public $tries = 1; // Une seule tentative

    protected $userId;
    protected $featureKey;
    protected $accessId;
    protected $jobId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $userId, string $featureKey, int $accessId, string $jobId)
    {
        $this->userId = $userId;
        $this->featureKey = $featureKey;
        $this->accessId = $accessId;
        $this->jobId = $jobId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("🚀 [JOB-IMMEDIATE] Démarrage génération immédiate", [
                'job_id' => $this->jobId,
                'user_id' => $this->userId,
                'feature_key' => $this->featureKey,
                'access_id' => $this->accessId
            ]);

            // ✅ Mettre à jour le statut : en cours
            $this->updateJobStatus('processing', 10);

            $user = User::find($this->userId);
            if (!$user) {
                throw new \Exception("User not found: {$this->userId}");
            }

            // ✅ CORRECTION : Vérifier si un post existe déjà AUJOURD'HUI (peu importe l'access_id)
            // Règle : Si un post existe aujourd'hui, on ne génère pas (même si c'est un rachat)
            $today = Carbon::now()->startOfDay();
            $existingPost = null;

            if ($this->featureKey === 'blog') {
                $existingPost = \App\Models\BlogPost::where('user_id', $this->userId)
                    // ✅ SUPPRIMÉ : ->where('user_feature_access_id', $this->accessId)
                    // On vérifie TOUS les posts du jour, peu importe l'achat
                    ->whereDate('created_at', $today)
                    ->where('is_ai_generated', true)
                    ->first();
            } elseif ($this->featureKey === 'social_media') {
                $existingPost = \App\Models\SocialMediaPost::where('user_id', $this->userId)
                    // ✅ SUPPRIMÉ : ->where('user_feature_access_id', $this->accessId)
                    // On vérifie TOUS les posts du jour, peu importe l'achat
                    ->whereDate('created_at', $today)
                    ->where('is_ai_generated', true)
                    ->first();
            }

            if ($existingPost) {
                Log::info("⏭️ [JOB-IMMEDIATE] Post déjà existant - skip génération", [
                    'job_id' => $this->jobId,
                    'existing_post_id' => $existingPost->id
                ]);

                $this->updateJobStatus('completed', 100, [
                    'success' => true,
                    'data' => $existingPost,
                    'skipped' => true,
                    'message' => 'Post existant utilisé'
                ]);
                return;
            }

            // ✅ Statut : Génération des objectifs
            $this->updateJobStatus('processing', 20, null, 'Récupération des objectifs hebdomadaires');

            $weeklyService = app(WeeklyPostGenerationService::class);
            $contentGenerationService = app(\App\Services\ContentGeneration\ContentGenerationService::class);

            $dayInfo = [
                'date' => Carbon::now(),
                'day_name' => strtolower(Carbon::now()->format('l')),
                'is_today' => true,
                'status' => 'published'
            ];

            // ✅ Statut : Création du contenu
            $this->updateJobStatus('processing', 40, null, 'Création du contenu avec IA');

            if ($this->featureKey === 'blog') {
                // ✅ NIVEAU 2 : Utiliser les objectifs pour générer le contenu
                $result = $contentGenerationService->generateBlogContent($user);

                if ($result['success']) {
                    // ✅ Créer le BlogPost depuis les données
                    $postData = $result['data'];
                    $post = \App\Models\BlogPost::create([
                        'user_id' => $user->id,
                        'user_feature_access_id' => $this->accessId,
                        'title' => $postData['title'],
                        'summary' => $postData['summary'] ?? '',
                        'content' => $postData['content'],
                        'tags' => $postData['tags'] ?? [],
                        'header_image' => $postData['header_image'] ?? null,
                        'status' => 'published',
                        'published_at' => now()
                    ]);

                    // ✅ Statut : Finalisation
                    $this->updateJobStatus('processing', 90, null, 'Finalisation et sauvegarde');

                    Log::info("✅ [JOB-IMMEDIATE] Blog post généré avec succès", [
                        'job_id' => $this->jobId,
                        'post_id' => $post->id,
                        'access_id' => $this->accessId
                    ]);

                    $this->updateJobStatus('completed', 100, [
                        'success' => true,
                        'data' => $post,
                        'message' => 'Post généré avec succès'
                    ]);
                } else {
                    throw new \Exception($result['message'] ?? 'Échec génération blog post');
                }

            } elseif ($this->featureKey === 'social_media') {
                // ✅ NIVEAU 2 : Utiliser les objectifs pour générer le contenu
                // ✅ NOUVEAU : Récupérer les plateformes activées
                $access = \App\Models\UserFeatureAccess::find($this->accessId);
                $enabledPlatforms = $access->enabled_platforms ?? [];
                
                // ✅ CORRECTION : Vérifier qu'au moins une plateforme est activée
                if (empty($enabledPlatforms)) {
                    throw new \Exception('Aucune plateforme sociale activée. Veuillez sélectionner au moins une plateforme.');
                }
                
                // Première plateforme activée
                $platform = $enabledPlatforms[0];
                
                Log::info("📱 [JOB-IMMEDIATE] Génération post immédiat", [
                    'platform' => $platform,
                    'enabled_platforms' => $enabledPlatforms,
                    'access_id' => $this->accessId
                ]);
                
                $result = $contentGenerationService->generateSocialContent($user, $platform);

                if ($result['success']) {
                    // ✅ Créer le SocialMediaPost depuis les données
                    $postData = $result['data'];

                    // ✅ CORRECTION : Mapper 'images' vers 'media_url'
                    $mediaUrl = null;
                    if (isset($postData['images']) && is_array($postData['images']) && count($postData['images']) > 0) {
                        $mediaUrl = $postData['images'][0];
                    } elseif (isset($postData['media_url'])) {
                        $mediaUrl = $postData['media_url'];
                    }

                    $post = \App\Models\SocialMediaPost::create([
                        'user_id' => $user->id,
                        'user_feature_access_id' => $this->accessId,
                        'platform' => $platform,
                        'content' => $postData['content'],
                        'images' => isset($postData['images']) && is_array($postData['images']) ? $postData['images'] : [$mediaUrl],
                        'tags' => $postData['hashtags'] ?? [],
                        'status' => 'published',
                        'published_at' => now()
                    ]);

                    // ✅ Statut : Finalisation
                    $this->updateJobStatus('processing', 90, null, 'Programmation et sauvegarde');

                    Log::info("✅ [JOB-IMMEDIATE] Social post généré avec succès", [
                        'job_id' => $this->jobId,
                        'post_id' => $post->id,
                        'platform' => 'facebook',
                        'access_id' => $this->accessId
                    ]);

                    $this->updateJobStatus('completed', 100, [
                        'success' => true,
                        'data' => $post,
                        'platform' => 'facebook',
                        'message' => 'Post social généré avec succès'
                    ]);
                } else {
                    throw new \Exception($result['message'] ?? 'Échec génération social post');
                }
            }

        } catch (\Exception $e) {
            Log::error("❌ [JOB-IMMEDIATE] Erreur génération", [
                'job_id' => $this->jobId,
                'user_id' => $this->userId,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->updateJobStatus('failed', 0, [
                'success' => false,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Mettre à jour le statut du job dans le cache
     */
    private function updateJobStatus(string $status, int $progress, ?array $result = null, ?string $currentStep = null): void
    {
        $cacheKey = "immediate_job_{$this->jobId}";

        $data = [
            'job_id' => $this->jobId,
            'status' => $status, // pending, processing, completed, failed
            'progress' => $progress,
            'current_step' => $currentStep,
            'user_id' => $this->userId,
            'feature_key' => $this->featureKey,
            'access_id' => $this->accessId,
            'updated_at' => now()->toISOString()
        ];

        if ($result) {
            $data['result'] = $result;
        }

        // ✅ Garder en cache pendant 5 minutes
        Cache::put($cacheKey, $data, now()->addMinutes(5));

        Log::info("📊 [JOB-IMMEDIATE] Statut mis à jour", [
            'job_id' => $this->jobId,
            'status' => $status,
            'progress' => $progress,
            'step' => $currentStep
        ]);
    }
}
