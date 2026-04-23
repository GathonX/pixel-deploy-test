<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\AdminProjectInfo;
use App\Models\AdminWeeklyObjective;
use App\Models\BlogPost;
use App\Services\ContentGeneration\BlogContentGenerator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AdminPostGenerationService
{
    private BlogContentGenerator $blogGenerator;
    private AdminObjectiveGenerationService $objectiveService;

    public function __construct(
        BlogContentGenerator $blogGenerator,
        AdminObjectiveGenerationService $objectiveService
    ) {
        $this->blogGenerator = $blogGenerator;
        $this->objectiveService = $objectiveService;
    }

    /**
     * 🎯 Générer UNIQUEMENT le premier post admin (synchrone, immédiat)
     */
    public function generateFirstAdminPost(User $admin): array
    {
        try {
            Log::info("⚡ [ADMIN POSTS] Génération IMMÉDIATE du premier post", [
                'admin_id' => $admin->id
            ]);

            // 1. Récupérer les informations projet admin
            $adminInfo = AdminProjectInfo::where('user_id', $admin->id)
                ->where('auto_generation_enabled', true)
                ->first();

            if (!$adminInfo) {
                return [
                    'success' => false,
                    'error' => 'Aucune information projet admin configurée'
                ];
            }

            // 2. Générer ou récupérer l'objectif de la semaine
            $objectiveResult = $this->objectiveService->generateWeeklyObjective($adminInfo);

            if (!$objectiveResult['success']) {
                return [
                    'success' => false,
                    'error' => 'Impossible de générer l\'objectif hebdomadaire'
                ];
            }

            $objective = $objectiveResult['data'];
            $today = Carbon::now()->startOfDay();
            $startOfWeek = Carbon::now()->startOfWeek();

            // 🎯 RÈGLE : Générer pour AUJOURD'HUI (pas pour lundi)
            $postDate = $today->copy();
            $postDate->setTime(6, 0, 0);

            // Calculer le dayOffset pour aujourd'hui (jours depuis lundi)
            $dayOffset = $startOfWeek->diffInDays($postDate, false);
            if ($dayOffset < 0) $dayOffset = 0;

            // Le premier post est toujours published (c'est aujourd'hui)
            $status = 'published';

            Log::info("⚡ [ADMIN POSTS] Génération premier post AUJOURD'HUI", [
                'date' => $postDate->format('Y-m-d l'),
                'day_offset' => $dayOffset,
                'status' => $status
            ]);

            // 🛡️ SÉCURITÉ RENFORCÉE: Vérifier si post existe déjà pour cette date (prévention doublons)
            $dateOnly = $postDate->format('Y-m-d');

            $existing = BlogPost::where('user_id', $admin->id)
                ->whereDate('published_at', $dateOnly)
                ->first();

            if ($existing) {
                Log::info("ℹ️ [ADMIN POSTS] Premier post déjà existant - DUPLICATION ÉVITÉE", [
                    'post_id' => $existing->id,
                    'existing_published_at' => $existing->published_at->format('Y-m-d H:i:s'),
                    'target_published_at' => $postDate->format('Y-m-d H:i:s')
                ]);
                return [
                    'success' => true,
                    'data' => $existing
                ];
            }

            // Générer le post pour aujourd'hui
            $postResult = $this->generateDailyPost($admin, $objective, $adminInfo, $postDate, $dayOffset, $status);

            if (!$postResult['success']) {
                return [
                    'success' => false,
                    'error' => $postResult['error']
                ];
            }

            Log::info("✅ [ADMIN POSTS] Premier post généré avec succès", [
                'post_id' => $postResult['data']->id,
                'title' => substr($postResult['data']->title, 0, 50)
            ]);

            return [
                'success' => true,
                'data' => $postResult['data']
            ];

        } catch (\Exception $e) {
            Log::error("💥 [ADMIN POSTS] Erreur génération premier post", [
                'admin_id' => $admin->id ?? null,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Générer les posts hebdomadaires pour l'admin
     */
    public function generateWeeklyPostsForAdmin(User $admin, bool $skipFirstDay = false): array
    {
        try {
            Log::info("🚀 [ADMIN POSTS] Démarrage génération hebdomadaire", [
                'admin_id' => $admin->id,
                'week' => now()->format('Y-W')
            ]);

            // 1. Récupérer les informations projet admin
            $adminInfo = AdminProjectInfo::where('user_id', $admin->id)
                ->where('auto_generation_enabled', true)
                ->first();

            if (!$adminInfo) {
                Log::warning("⚠️ [ADMIN POSTS] Aucune info projet admin trouvée", [
                    'admin_id' => $admin->id
                ]);

                return [
                    'success' => false,
                    'error' => 'Aucune information projet admin configurée ou génération désactivée'
                ];
            }

            // 2. Générer ou récupérer l'objectif de la semaine
            $objectiveResult = $this->objectiveService->generateWeeklyObjective($adminInfo);

            if (!$objectiveResult['success']) {
                Log::error("❌ [ADMIN POSTS] Échec génération objectif", [
                    'admin_id' => $admin->id,
                    'error' => $objectiveResult['error']
                ]);

                return [
                    'success' => false,
                    'error' => 'Impossible de générer l\'objectif hebdomadaire'
                ];
            }

            $objective = $objectiveResult['data'];

            Log::info("✅ [ADMIN POSTS] Objectif prêt", [
                'objective_id' => $objective->id,
                'is_new' => $objectiveResult['is_new']
            ]);

            // 3. Générer UNIQUEMENT les posts pour aujourd'hui et les jours futurs
            $postsGenerated = [];
            $today = now()->startOfDay(); // Aujourd'hui à 00:00:00
            $startOfWeek = now()->startOfWeek(); // Lundi de cette semaine
            $currentDayOfWeek = $today->dayOfWeek; // 0=Dimanche, 1=Lundi, ..., 6=Samedi

            // 🎯 RÈGLE : Ne générer QUE les jours >= aujourd'hui (pas de dates passées)
            // Calculer combien de jours se sont écoulés depuis lundi
            $daysPassedSinceMonday = $startOfWeek->diffInDays($today, false);
            if ($daysPassedSinceMonday < 0) $daysPassedSinceMonday = 0;

            Log::info("📅 [ADMIN POSTS] Planification publication FUTURE uniquement", [
                'today' => $today->format('Y-m-d l'),
                'current_day_of_week' => $currentDayOfWeek,
                'start_of_week' => $startOfWeek->format('Y-m-d'),
                'days_passed_since_monday' => $daysPassedSinceMonday,
                'skip_first_day' => $skipFirstDay,
                'posts_to_generate' => $adminInfo->posts_per_week - $daysPassedSinceMonday
            ]);

            // Commencer à partir d'aujourd'hui (ne pas générer de dates passées)
            $startOffset = $skipFirstDay ? $daysPassedSinceMonday + 1 : $daysPassedSinceMonday;

            for ($dayOffset = $startOffset; $dayOffset < $adminInfo->posts_per_week; $dayOffset++) {
                $postDate = $startOfWeek->copy()->addDays($dayOffset);
                
                // Publier à 06h00 pour début de journée
                $postDate->setTime(6, 0, 0);
                
                // Déterminer le statut : published si <= aujourd'hui, scheduled si futur
                $status = $postDate->lte($today) ? 'published' : 'scheduled';

                // 🛡️ SÉCURITÉ RENFORCÉE: Vérifier si un post existe déjà pour cette date EXACTE (prévention doublons stricts)
                // Cette vérification empêche la création de plusieurs posts avec la même date de publication
                $dateOnly = $postDate->format('Y-m-d');

                $existing = BlogPost::where('user_id', $admin->id)
                    ->whereDate('published_at', $dateOnly)
                    ->first();

                if ($existing) {
                    Log::warning("⚠️ [ADMIN POSTS] Post déjà existant pour cette date - DUPLICATION ÉVITÉE", [
                        'day' => $postDate->format('l'),
                        'post_id' => $existing->id,
                        'existing_published_at' => $existing->published_at->format('Y-m-d H:i:s'),
                        'target_published_at' => $postDate->format('Y-m-d H:i:s'),
                        'day_offset' => $dayOffset
                    ]);
                    $postsGenerated[] = $existing; // Compter comme généré
                    continue;
                }

                Log::info("📅 [ADMIN POSTS] Préparation post", [
                    'day_offset' => $dayOffset,
                    'post_date' => $postDate->format('Y-m-d H:i:s'),
                    'day_name' => $postDate->locale('fr')->dayName
                ]);

                // Générer le post pour ce jour
                $postResult = $this->generateDailyPost($admin, $objective, $adminInfo, $postDate, $dayOffset, $status);

                if ($postResult['success']) {
                    $postsGenerated[] = $postResult['data'];
                    $objective->incrementPostsCount();

                    Log::info("✅ [ADMIN POSTS] Post généré", [
                        'day' => $postDate->format('l'),
                        'post_id' => $postResult['data']->id
                    ]);
                } else {
                    Log::error("❌ [ADMIN POSTS] Échec génération post", [
                        'day' => $postDate->format('l'),
                        'error' => $postResult['error']
                    ]);
                }

                // Délai pour éviter rate limit OpenAI
                if ($dayOffset < 6) {
                    sleep(2);
                }
            }

            Log::info("🎉 [ADMIN POSTS] Génération hebdomadaire terminée", [
                'admin_id' => $admin->id,
                'posts_generated' => count($postsGenerated),
                'objective_id' => $objective->id
            ]);

            return [
                'success' => true,
                'data' => [
                    'posts' => $postsGenerated,
                    'objective' => $objective,
                    'posts_count' => count($postsGenerated)
                ]
            ];

        } catch (\Exception $e) {
            Log::error("💥 [ADMIN POSTS] Erreur génération hebdomadaire", [
                'admin_id' => $admin->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Générer un post quotidien pour l'admin
     */
    private function generateDailyPost(
        User $admin,
        AdminWeeklyObjective $objective,
        AdminProjectInfo $adminInfo,
        Carbon $postDate,
        int $dayOffset,
        string $status
    ): array {
        try {
            Log::info("📝 [ADMIN POSTS] Génération post quotidien", [
                'admin_id' => $admin->id,
                'date' => $postDate->format('Y-m-d'),
                'day' => $postDate->format('l')
            ]);

            // Préparer le contexte pour la génération
            $dailyTopics = $objective->daily_topics ?? [];
            $todayTopic = $dailyTopics[$dayOffset] ?? 'Sujet du jour';
            
            // Jours de la semaine en français
            $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
            $dayName = $daysOfWeek[$dayOffset] ?? $postDate->locale('fr')->dayName;

            $objectiveContext = [
                'title' => $todayTopic,
                'keywords' => $objective->keywords_focus ?? [],
                'objective_text' => $objective->objective_text,
                'business_name' => $adminInfo->business_name,
                'tone_of_voice' => $adminInfo->tone_of_voice,
                'day_name' => $dayName,
                'day_index' => $dayOffset + 1,
                'variation_seed' => uniqid('admin_post_' . $dayOffset . '_', true),
                'content_angle' => $todayTopic
            ];

            $additionalContext = [
                'domain' => $adminInfo->industry ?? 'business',
                'target_audience' => $adminInfo->target_audience ?? [],
                'project_context' => $adminInfo->business_description ?? ''
            ];

            // Générer le contenu avec l'IA
            $contentResult = $this->blogGenerator->generateContentFromObjective(
                $objectiveContext,
                $additionalContext
            );

            if (!$contentResult['success']) {
                return [
                    'success' => false,
                    'error' => $contentResult['error']
                ];
            }

            $content = $contentResult['data'];

            // Créer le post en base avec statut approprié
            $post = BlogPost::create([
                'user_id' => $admin->id,
                'admin_weekly_objective_id' => $objective->id,
                'title' => $content['title'],
                'summary' => $content['summary'],
                'content' => $content['content'],
                'header_image' => $content['header_image'],
                'tags' => $content['tags'] ?? [],
                'status' => $status,
                'published_at' => $postDate,
                'is_ai_generated' => true,
                'generation_context' => [
                    'type' => 'admin_weekly',
                    'objective_id' => $objective->id,
                    'day_offset' => $dayOffset,
                    'week' => now()->format('Y-W'),
                    'scheduled_status' => $status
                ]
            ]);

            Log::info("✅ [ADMIN POSTS] Post créé en base", [
                'post_id' => $post->id,
                'title' => substr($post->title, 0, 50),
                'status' => $status,
                'published_at' => $postDate->format('Y-m-d H:i:s')
            ]);

            return [
                'success' => true,
                'data' => $post
            ];

        } catch (\Exception $e) {
            Log::error("💥 [ADMIN POSTS] Erreur génération post quotidien", [
                'admin_id' => $admin->id,
                'date' => $postDate->format('Y-m-d'),
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Vérifier si génération nécessaire pour l'admin cette semaine
     */
    public function needsGenerationThisWeek(User $admin): bool
    {
        // Vérifier si config admin existe et est activée
        $adminInfo = AdminProjectInfo::where('user_id', $admin->id)
            ->where('auto_generation_enabled', true)
            ->first();

        if (!$adminInfo) {
            return false;
        }

        // Vérifier si posts déjà générés cette semaine
        $weekIdentifier = now()->format('Y-W');

        $objective = AdminWeeklyObjective::where('admin_project_info_id', $adminInfo->id)
            ->where('week_identifier', $weekIdentifier)
            ->first();

        if (!$objective) {
            return true; // Pas d'objectif = génération nécessaire
        }

        // Vérifier si les posts sont complets
        return !$objective->isComplete();
    }
}
