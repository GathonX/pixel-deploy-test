<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use App\Services\ContentGeneration\SocialMediaGenerationRulesService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class GenerateActivationPostsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // ✅ CORRECTION : 10 minutes max (6 posts × ~60s chacun)
    public $tries = 1; // ✅ CORRECTION : 1 seule tentative (éviter doublons)
    public $backoff = []; // ✅ CORRECTION : Pas de retry automatique

    private User $user;
    private string $featureKey;
    private int $postsToGenerate;
    public $accessId; // Public sans type pour sérialisation correcte
    private bool $skipFirstPost; // ✅ NOUVEAU : Indique si le premier post existe déjà

    public function __construct(User $user, string $featureKey, int $postsToGenerate = null, ?int $accessId = null, bool $skipFirstPost = true)
    {
        $this->user = $user;
        $this->featureKey = $featureKey;
        $this->postsToGenerate = $postsToGenerate ?? $this->getDefaultPostsCount($featureKey);
        $this->accessId = $accessId;
        $this->skipFirstPost = $skipFirstPost;

        Log::info("🔧 [ACTIVATION-JOB] Job créé avec accessId", [
            'user_id' => $user->id,
            'feature_key' => $featureKey,
            'access_id' => $accessId,
            'skip_first_post' => $skipFirstPost,
            'access_id_is_null' => $accessId === null
        ]);
    }

    /**
     * ✅ NOUVEAU : Nombre de posts par défaut selon le jour (si non spécifié)
     */
    private function getDefaultPostsCount(string $featureKey): int
    {
        $dayOfWeek = strtolower(Carbon::now()->format('l'));
        $rules = $this->getActivationRules($dayOfWeek);
        
        return $featureKey === 'blog' ? $rules['blog_posts'] : $rules['social_posts'];
    }

    /**
     * ✅ NOUVEAU : Génération selon les règles d'activation par jour de la semaine
     * Respecte les règles spécifiques selon le jour d'activation
     */
    public function handle(): void
    {
        try {
            Log::info("🚀 [ACTIVATION-JOB] Génération posts activation démarrée", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'day' => now()->format('l'),
                'date' => now()->format('Y-m-d'),
                'timestamp' => now()->toISOString()
            ]);

            // ✅ Marquer génération en cours
            Cache::put("activation_generation_{$this->user->id}_{$this->featureKey}", [
                'status' => 'processing',
                'feature_key' => $this->featureKey,
                'started_at' => now()->toISOString(),
                'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution'
            ], now()->addHours(1));

            // ✅ NOUVEAU : Générer selon les règles d'activation par jour
            $result = $this->generateActivationPosts();

            if ($result['success']) {
                $totalGenerated = count($result['data']['blog_posts'] ?? []) + count($result['data']['social_posts'] ?? []);
                
                Log::info("✅ [ACTIVATION-JOB] Génération activation réussie", [
                    'user_id' => $this->user->id,
                    'feature_key' => $this->featureKey,
                    'blog_posts' => count($result['data']['blog_posts'] ?? []),
                    'social_posts' => count($result['data']['social_posts'] ?? []),
                    'total_posts' => $totalGenerated,
                    'day' => now()->format('l')
                ]);

                // ✅ Marquer la génération d'activation comme terminée
                Cache::put("activation_completed_{$this->user->id}_{$this->featureKey}", [
                    'status' => 'completed',
                    'feature_key' => $this->featureKey,
                    'completed_at' => now()->toISOString(),
                    'blog_posts_count' => count($result['data']['blog_posts'] ?? []),
                    'social_posts_count' => count($result['data']['social_posts'] ?? []),
                    'total_posts' => $totalGenerated
                ], now()->addDays(1));

            } else {
                Log::error("❌ [ACTIVATION-JOB] Échec génération activation", [
                    'user_id' => $this->user->id,
                    'feature_key' => $this->featureKey,
                    'error' => $result['error'] ?? 'Erreur inconnue'
                ]);

                Cache::put("activation_failed_{$this->user->id}_{$this->featureKey}", [
                    'status' => 'failed',
                    'error' => $result['error'] ?? 'Erreur inconnue',
                    'failed_at' => now()->toISOString()
                ], now()->addHours(24));
            }

            // ✅ Nettoyer cache génération en cours
            Cache::forget("activation_generation_{$this->user->id}_{$this->featureKey}");

        } catch (\Exception $e) {
            Log::error("💥 [ACTIVATION-JOB] Exception génération activation", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            Cache::put("activation_failed_{$this->user->id}_{$this->featureKey}", [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'failed_at' => now()->toISOString()
            ], now()->addHours(24));

            Cache::forget("activation_generation_{$this->user->id}_{$this->featureKey}");
        }
    }

    /**
     * ✅ NOUVEAU : Génération selon les règles d'activation spécifiques par jour
     */
    private function generateActivationPosts(): array
    {
        try {
            $today = Carbon::now();
            $dayOfWeek = strtolower($today->format('l'));
            
            Log::info("📅 [ACTIVATION-RULES] Application des règles d'activation", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'day' => $dayOfWeek,
                'date' => $today->format('Y-m-d')
            ]);

            Log::info("🎯 [ACTIVATION-RULES] Génération avec paramètres spécifiques", [
                'user_id' => $this->user->id,
                'day' => $dayOfWeek,
                'feature_key' => $this->featureKey,
                'posts_to_generate' => $this->postsToGenerate,
                'generation_type' => 'remaining_posts_only'
            ]);

            $weeklyService = app(WeeklyPostGenerationService::class);
            $socialRulesService = app(SocialMediaGenerationRulesService::class);
            $contentGenerationService = app(\App\Services\ContentGeneration\ContentGenerationService::class);

            $results = [
                'blog_posts' => [],
                'social_posts' => []
            ];

            // ✅ CORRIGÉ : Générer seulement les posts restants (pas le premier)
            if ($this->featureKey === 'blog' && $this->postsToGenerate > 0) {
                Log::info("📝 [ACTIVATION-BLOG] Génération posts restants seulement", [
                    'user_id' => $this->user->id,
                    'posts_to_generate' => $this->postsToGenerate,
                    'note' => 'Premier post déjà généré immédiatement'
                ]);

                $results['blog_posts'] = $this->generateRemainingBlogPosts($this->postsToGenerate);
            }

            // ✅ CORRIGÉ : Générer seulement les posts restants (pas le premier)
            if ($this->featureKey === 'social_media' && $this->postsToGenerate > 0) {
                Log::info("📱 [ACTIVATION-SOCIAL] Génération posts restants seulement", [
                    'user_id' => $this->user->id,
                    'posts_to_generate' => $this->postsToGenerate,
                    'note' => 'Premier post déjà généré immédiatement'
                ]);

                $results['social_posts'] = $this->generateRemainingSocialPosts($this->postsToGenerate, $socialRulesService);
            }

            return [
                'success' => true,
                'data' => $results
            ];

        } catch (\Exception $e) {
            Log::error("💥 [ACTIVATION-RULES] Erreur génération activation", [
                'user_id' => $this->user->id,
                'feature_key' => $this->featureKey,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération activation: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Règles d'activation selon le jour de la semaine
     */
    private function getActivationRules(string $dayOfWeek): array
    {
        $rules = [
            'sunday' => ['blog_posts' => 1, 'social_posts' => 1],    // Dimanche : 1 post chacun
            'monday' => ['blog_posts' => 7, 'social_posts' => 7],    // Lundi : 7 posts chacun  
            'tuesday' => ['blog_posts' => 6, 'social_posts' => 6],   // Mardi : 6 blog, 6 social
            'wednesday' => ['blog_posts' => 5, 'social_posts' => 5], // Mercredi : 5 posts chacun
            'thursday' => ['blog_posts' => 4, 'social_posts' => 4],  // Jeudi : 4 posts chacun
            'friday' => ['blog_posts' => 3, 'social_posts' => 3],    // Vendredi : 3 posts chacun
            'saturday' => ['blog_posts' => 2, 'social_posts' => 2],  // Samedi : 2 posts chacun
        ];

        return $rules[$dayOfWeek] ?? ['blog_posts' => 1, 'social_posts' => 1];
    }

    /**
     * ✅ CORRIGÉ : Générer les posts RESTANTS seulement (2ème, 3ème, etc.)
     */
    private function generateRemainingBlogPosts(int $postsToGenerate): array
    {
        $generatedPosts = [];
        $weeklyService = app(WeeklyPostGenerationService::class);
        $contentGenerationService = app(\App\Services\ContentGeneration\ContentGenerationService::class);
        $today = Carbon::now();

        // ✅ Compteur de posts générés (pas d'itérations)
        $generatedCount = 0;
        $iteration = 0;
        $maxIterations = $postsToGenerate + 10; // Sécurité pour éviter boucle infinie

        while ($generatedCount < $postsToGenerate && $iteration < $maxIterations) {
            try {
                Log::info("📝 [REMAINING-BLOG] Tentative génération post " . ($generatedCount + 1) . "/" . $postsToGenerate, [
                    'user_id' => $this->user->id,
                    'iteration' => $iteration,
                    'generated_count' => $generatedCount,
                    'note' => 'Posts restants seulement'
                ]);

                // ✅ CORRECTION : Posts restants = répartis sur les jours restants de la semaine
                $dayOfWeek = strtolower($today->format('l'));
                $daysRemaining = $this->getRemainingDaysOfWeek($dayOfWeek);

                if (count($daysRemaining) > 0) {
                    $dayIndex = $iteration % count($daysRemaining);
                    $targetDayName = $daysRemaining[$dayIndex];
                    $publishAt = $this->getDateForDay($targetDayName, $today);
                } else {
                    $publishAt = $today->copy()->addDays($iteration + 1);
                }

                // ✅ CORRECTION : Vérifier si on doit générer un post published pour aujourd'hui
                // On vérifie TOUS les posts du jour (peu importe l'access_id)
                $isToday = $publishAt->isToday();
                $hasPublishedToday = \App\Models\BlogPost::where('user_id', $this->user->id)
                    // ✅ SUPPRIMÉ : ->where('user_feature_access_id', $this->accessId)
                    ->where('status', 'published')
                    ->where('is_ai_generated', true)
                    ->whereDate('created_at', $today)
                    ->exists();

                // Si c'est aujourd'hui ET qu'il y a déjà un published → skip ce post et continuer
                if ($isToday && $hasPublishedToday) {
                    Log::info("⏭️ [SKIP] Post pour aujourd'hui existe déjà, passage au suivant", [
                        'user_id' => $this->user->id,
                        'date' => $publishAt->format('Y-m-d'),
                        'iteration' => $iteration
                    ]);
                    $iteration++; // Incrémenter itération mais PAS generated_count
                    continue; // Passer au post suivant
                }

                // Si c'est aujourd'hui ET pas de published → published, sinon scheduled
                $status = ($isToday && !$hasPublishedToday) ? 'published' : 'scheduled';

                $dayInfo = [
                    'date' => $publishAt,
                    'day_name' => strtolower($publishAt->format('l')),
                    'is_today' => $isToday,
                    'status' => $status
                ];

                // ✅ NIVEAU 2 : Utiliser les objectifs pour générer le contenu
                $result = $contentGenerationService->generateBlogContent($this->user);
                
                // ✅ Créer le BlogPost depuis les données
                if ($result['success']) {
                    $postData = $result['data'];

                    // ✅ Définir scheduled_at et scheduled_time pour les posts programmés
                    $scheduledAt = null;
                    $scheduledTime = null;

                    if ($status === 'scheduled') {
                        // ✅ Adapter l'heure selon le timezone de l'utilisateur
                        $userTimezone = $this->user->timezone ?? 'Indian/Antananarivo';

                        // Créer une date à 6h00 dans le timezone de l'utilisateur
                        $scheduledAt = $publishAt->copy()
                            ->setTimezone($userTimezone)
                            ->setTime(6, 0, 0)
                            ->setTimezone('UTC'); // Convertir en UTC pour stockage

                        $scheduledTime = '06:00:00'; // Toujours 6h locale

                        Log::info("📅 [SCHEDULED] Heure de publication définie", [
                            'user_id' => $this->user->id,
                            'user_timezone' => $userTimezone,
                            'local_time' => '06:00',
                            'scheduled_at_utc' => $scheduledAt->toISOString(),
                            'scheduled_time' => $scheduledTime
                        ]);
                    }

                    $post = \App\Models\BlogPost::create([
                        'user_id' => $this->user->id,
                        'user_feature_access_id' => $this->accessId,
                        'title' => $postData['title'],
                        'summary' => $postData['summary'] ?? '',
                        'content' => $postData['content'],
                        'tags' => $postData['tags'] ?? [],
                        'header_image' => $postData['header_image'] ?? null,
                        'status' => $status,
                        'published_at' => $status === 'published' ? now() : null,
                        'scheduled_time' => $scheduledTime
                    ]);

                    // ✅ Mettre à jour scheduled_at séparément (problème avec fillable)
                    if ($scheduledAt) {
                        $post->scheduled_at = $scheduledAt;
                        $post->save();
                    }

                    $result['data'] = $post;
                }

                if ($result['success']) {
                    $generatedPosts[] = $result['data'];
                    $generatedCount++; // ✅ Incrémenter seulement si post créé avec succès
                    Log::info("✅ [ACTIVATION-BLOG] Post généré avec succès", [
                        'user_id' => $this->user->id,
                        'post_id' => $result['data']->id,
                        'publish_at' => $publishAt->toISOString(),
                        'status' => $status,
                        'generated_count' => $generatedCount,
                        'iteration' => $iteration
                    ]);
                } else {
                    Log::error("❌ [ACTIVATION-BLOG] Échec génération post", [
                        'user_id' => $this->user->id,
                        'iteration' => $iteration,
                        'error' => $result['error'] ?? 'Erreur inconnue'
                    ]);
                }

            } catch (\Exception $e) {
                Log::error("💥 [ACTIVATION-BLOG] Exception génération post", [
                    'user_id' => $this->user->id,
                    'iteration' => $iteration,
                    'error' => $e->getMessage()
                ]);
            }

            // ✅ Incrémenter l'itération à la fin de chaque boucle
            $iteration++;
        }

        return $generatedPosts;
    }

    /**
     * ✅ CORRIGÉ : Générer les posts RESTANTS pour réseaux sociaux (2ème, 3ème, etc.)
     */
    private function generateRemainingSocialPosts(int $postsToGenerate, $socialRulesService): array
    {
        $generatedPosts = [];
        $weeklyService = app(WeeklyPostGenerationService::class);
        $contentGenerationService = app(\App\Services\ContentGeneration\ContentGenerationService::class);
        $today = Carbon::now();

        // ✅ CRITIQUE : Récupérer les plateformes activées depuis UserFeatureAccess
        $access = \App\Models\UserFeatureAccess::find($this->accessId);

        if (!$access || empty($access->enabled_platforms)) {
            Log::error("❌ [REMAINING-SOCIAL] Aucune plateforme activée - arrêt génération", [
                'user_id' => $this->user->id,
                'access_id' => $this->accessId,
                'has_access' => !!$access,
                'enabled_platforms' => $access->enabled_platforms ?? []
            ]);
            return [];
        }

        $enabledPlatforms = $access->enabled_platforms;

        Log::info("🔐 [REMAINING-SOCIAL] Plateformes autorisées récupérées", [
            'user_id' => $this->user->id,
            'enabled_platforms' => $enabledPlatforms,
            'access_id' => $this->accessId,
            'posts_to_generate' => $postsToGenerate
        ]);

        // ✅ NOUVEAU : Calculer nombre total de posts selon le jour (pas par plateforme)
        $dayOfWeek = strtolower($today->format('l'));
        $totalPostsForDay = [
            'sunday' => 1,
            'monday' => 7,
            'tuesday' => 6,
            'wednesday' => 5,
            'thursday' => 4,
            'friday' => 3,
            'saturday' => 2
        ][$dayOfWeek] ?? 1;

        Log::info("📱 [REMAINING-SOCIAL] Configuration génération", [
            'user_id' => $this->user->id,
            'enabled_platforms' => $enabledPlatforms,
            'day' => $dayOfWeek,
            'total_posts_for_day' => $totalPostsForDay,
            'posts_to_generate_per_platform' => $postsToGenerate,
            'note' => 'Génération indépendante pour CHAQUE plateforme'
        ]);

        // ✅ CORRECTION : Génération INDÉPENDANTE pour chaque plateforme
        // Mercredi avec Facebook + Instagram : 5 posts Facebook + 5 posts Instagram (pas rotation)
        $postsGenerated = 0;

        // ✅ Calculer semaine actuelle pour vérification posts existants
        $startOfWeek = $today->copy()->startOfWeek();
        $endOfWeek = $today->copy()->endOfWeek();

        // ✅ Pour CHAQUE plateforme activée
        foreach ($enabledPlatforms as $platform) {

            // ✅ NOUVEAU : Récupérer dates déjà utilisées pour cette plateforme cette semaine
            $existingPosts = \App\Models\SocialMediaPost::where('user_id', $this->user->id)
                ->where('platform', $platform)
                ->where('is_ai_generated', true)
                ->whereBetween('published_at', [$startOfWeek, $endOfWeek])
                ->pluck('published_at')
                ->map(function($date) {
                    return \Carbon\Carbon::parse($date)->format('Y-m-d');
                })
                ->unique()
                ->toArray();

            $existingPostsCount = count($existingPosts);
            $postsNeeded = max(0, $postsToGenerate - $existingPostsCount);

            Log::info("🎯 [PLATFORM-GENERATION] Début génération pour plateforme", [
                'user_id' => $this->user->id,
                'platform' => $platform,
                'posts_to_generate' => $postsToGenerate,
                'existing_posts' => $existingPostsCount,
                'existing_dates' => $existingPosts,
                'posts_needed' => $postsNeeded,
                'day' => $dayOfWeek
            ]);

            // ✅ Si tous les posts existent déjà, skip cette plateforme
            if ($postsNeeded === 0) {
                Log::info("⏭️ [PLATFORM-GENERATION] Tous les posts existent déjà", [
                    'user_id' => $this->user->id,
                    'platform' => $platform,
                    'existing_posts' => $existingPostsCount
                ]);
                continue;
            }

            // ✅ Calculer TOUTES les dates de la semaine à partir d'aujourd'hui jusqu'à dimanche
            $daysRemaining = $this->getRemainingDaysOfWeek($dayOfWeek);
            $allWeekDates = [];
            foreach ($daysRemaining as $dayName) {
                $date = $this->getDateForDay($dayName, $today);
                $allWeekDates[] = $date;
            }

            // ✅ Filtrer uniquement les dates disponibles (pas déjà utilisées)
            $availableDates = [];
            foreach ($allWeekDates as $date) {
                $dateStr = $date->format('Y-m-d');
                if (!in_array($dateStr, $existingPosts)) {
                    $availableDates[] = $date;
                }
            }

            Log::info("📅 [DATES-AVAILABLE] Dates disponibles", [
                'user_id' => $this->user->id,
                'platform' => $platform,
                'available_count' => count($availableDates),
                'available_dates' => array_map(fn($d) => $d->format('Y-m-d'), $availableDates)
            ]);

            // ✅ Générer UNIQUEMENT pour les dates manquantes
            $postsGeneratedForPlatform = 0;
            for ($i = 0; $i < min($postsNeeded, count($availableDates)); $i++) {

                try {
                    $publishAt = $availableDates[$i]->copy();

                    Log::info("📱 [REMAINING-SOCIAL] Génération post manquant", [
                        'user_id' => $this->user->id,
                        'platform' => $platform,
                        'post_number' => $i + 1,
                        'total_needed' => $postsNeeded,
                        'date' => $publishAt->format('Y-m-d'),
                        'day' => $dayOfWeek
                    ]);

                // ✅ Adapter l'heure selon le timezone de l'utilisateur
                $userTimezone = $this->user->timezone ?? 'Indian/Antananarivo';

                // Créer une date à 6h00 dans le timezone de l'utilisateur + secondes pour unicité
                $second = ($i * 10); // 0, 10, 20, 30... secondes pour unicité
                $publishAt = $publishAt->copy()
                    ->setTimezone($userTimezone)
                    ->setTime(6, 0, $second)
                    ->setTimezone('UTC'); // Convertir en UTC pour stockage

                $status = 'scheduled';
                $scheduledTime = '06:00:00'; // Toujours 6h locale

                $dayInfo = [
                    'date' => $publishAt,
                    'day_name' => strtolower($publishAt->format('l')),
                    'is_today' => false,
                    'status' => $status
                ];

                // ✅ NIVEAU 2 : Utiliser les objectifs pour générer le contenu
                $result = $contentGenerationService->generateSocialContent($this->user, $platform);

                // ✅ Créer le SocialMediaPost depuis les données
                if ($result['success']) {
                    $postData = $result['data'];

                    // ✅ CORRECTION : Mapper 'images' vers 'media_url' (prendre première image)
                    $mediaUrl = null;
                    if (isset($postData['images']) && is_array($postData['images']) && count($postData['images']) > 0) {
                        $mediaUrl = $postData['images'][0]; // Première image du array
                    } elseif (isset($postData['media_url'])) {
                        $mediaUrl = $postData['media_url'];
                    }

                    $post = \App\Models\SocialMediaPost::create([
                        'user_id' => $this->user->id,
                        'user_feature_access_id' => $this->accessId,
                        'platform' => $platform,
                        'content' => $postData['content'],
                        'images' => isset($postData['images']) && is_array($postData['images']) ? $postData['images'] : ($mediaUrl ? [$mediaUrl] : []),
                        'tags' => $postData['hashtags'] ?? [],
                        'status' => $status,
                        'published_at' => $publishAt,
                        'scheduled_time' => $scheduledTime,
                        'is_ai_generated' => true
                    ]);
                    $result['data'] = $post;

                    Log::info("✅ [SOCIAL-POST-CREATED] Post créé avec image", [
                        'post_id' => $post->id,
                        'platform' => $platform,
                        'has_media' => !is_null($mediaUrl),
                        'media_url_preview' => $mediaUrl ? substr($mediaUrl, 0, 60) . '...' : 'null',
                        'published_at' => $publishAt->toISOString()
                    ]);
                }

                if ($result['success']) {
                    $generatedPosts[] = $result['data'];
                    $postsGenerated++;
                    Log::info("✅ [ACTIVATION-SOCIAL] Post généré avec succès", [
                        'user_id' => $this->user->id,
                        'post_id' => $result['data']->id,
                        'platform' => $platform,
                        'publish_at' => $publishAt->toISOString(),
                        'status' => $status,
                        'posts_generated' => $postsGenerated
                    ]);
                } else {
                    Log::error("❌ [ACTIVATION-SOCIAL] Échec génération post", [
                        'user_id' => $this->user->id,
                        'platform' => $platform,
                        'post_index' => $i,
                        'error' => $result['error'] ?? 'Erreur inconnue'
                    ]);
                }

                } catch (\Exception $e) {
                    Log::error("💥 [ACTIVATION-SOCIAL] Exception génération post", [
                        'user_id' => $this->user->id,
                        'platform' => $platform,
                        'post_index' => $i,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            Log::info("✅ [PLATFORM-GENERATION] Plateforme terminée", [
                'user_id' => $this->user->id,
                'platform' => $platform,
                'posts_generated' => $postsGenerated
            ]);
        }

        return $generatedPosts;
    }

    /**
     * ✅ CORRECTION : Obtenir les jours de la semaine INCLUANT le jour actuel
     */
    private function getRemainingDaysOfWeek(string $currentDay): array
    {
        $allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $currentIndex = array_search($currentDay, $allDays);

        if ($currentIndex === false) {
            return [];
        }

        // Retourner tous les jours à partir d'AUJOURD'HUI jusqu'à dimanche
        return array_slice($allDays, $currentIndex);
    }

    /**
     * ✅ NOUVEAU : Calculer la date pour un jour spécifique de la semaine
     */
    private function getDateForDay(string $dayName, Carbon $baseDate): Carbon
    {
        $dayMap = [
            'monday' => 1, 'tuesday' => 2, 'wednesday' => 3, 'thursday' => 4,
            'friday' => 5, 'saturday' => 6, 'sunday' => 7
        ];

        $targetDayNumber = $dayMap[$dayName] ?? 1;
        $currentDayNumber = $baseDate->dayOfWeek === 0 ? 7 : $baseDate->dayOfWeek; // Dimanche = 7

        if ($targetDayNumber === $currentDayNumber) {
            // Même jour = aujourd'hui
            $daysToAdd = 0;
        } elseif ($targetDayNumber > $currentDayNumber) {
            // Jour dans la même semaine (futur proche)
            $daysToAdd = $targetDayNumber - $currentDayNumber;
        } else {
            // Jour dans la semaine suivante
            $daysToAdd = 7 - $currentDayNumber + $targetDayNumber;
        }

        return $baseDate->copy()->addDays($daysToAdd);
    }
}