<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\UserFeatureAccess;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use App\Services\ContentGeneration\ContentGenerationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;

class PostGuardianCommand extends Command
{
    /**
     * ✅ RÈGLES D'ACTIVATION PAR JOUR DE LA SEMAINE
     */
    private array $blogRulesByDay = [
        0 => 1, // Dimanche : 1 post 
        1 => 7, // Lundi : 7 posts 
        2 => 6, // Mardi : 6 posts 
        3 => 5, // Mercredi : 5 posts 
        4 => 4, // Jeudi : 4 posts 
        5 => 3, // Vendredi : 3 posts 
        6 => 2, // Samedi : 2 posts 
    ];

    private array $socialRulesByDay = [
        0 => ['facebook'], // Dimanche : 1 post (facebook seulement)
        1 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook', 'instagram', 'twitter'], // Lundi : 7 posts
        2 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook', 'instagram'], // Mardi : 6 posts
        3 => ['facebook', 'instagram', 'twitter', 'linkedin', 'facebook'], // Mercredi : 5 posts
        4 => ['facebook', 'instagram', 'twitter', 'linkedin'], // Jeudi : 4 posts
        5 => ['facebook', 'instagram', 'twitter'], // Vendredi : 3 posts
        6 => ['facebook', 'instagram'], // Samedi : 2 posts
    ];

    /**
     * ✅ POST GUARDIAN : Système de surveillance et rattrapage automatique
     */
    protected $signature = 'posts:guardian
                            {--force : Forcer la génération même si pas nécessaire}
                            {--user= : Vérifier seulement un utilisateur spécifique}
                            {--days= : Nombre de jours à vérifier en arrière (défaut: 7)}
                            {--dry-run : Simulation sans modifications réelles}';

    protected $description = 'Système de surveillance intelligent qui vérifie et génère automatiquement tous les posts manqués (activation, régénération, pannes)';

    public function handle()
    {
        $this->info("🛡️ POST GUARDIAN - Surveillance et rattrapage automatique");
        $this->line("═══════════════════════════════════════════════════════════");

        $startTime = now();
        $stats = [
            'users_checked' => 0,
            'missing_posts_found' => 0,
            'posts_generated' => 0,
            'activation_posts' => 0,
            'weekly_posts' => 0,
            'catchup_posts' => 0,
            'errors' => 0
        ];

        try {
            $isDryRun = $this->option('dry-run');
            $userFilter = $this->option('user');
            $daysBack = $this->option('days') ?? 7;
            $force = $this->option('force');

            if ($isDryRun) {
                $this->warn("🔍 MODE SIMULATION - Analyse seulement");
            }

            $this->info("📊 Paramètres de surveillance :");
            $this->line("   • Période : {$daysBack} derniers jours");
            $this->line("   • Utilisateur : " . ($userFilter ? "ID {$userFilter}" : "Tous"));
            $this->line("   • Mode forcé : " . ($force ? "Oui" : "Non"));
            $this->line("");

            // ✅ 1. RÉCUPÉRER LES UTILISATEURS ACTIFS
            $activeUsers = $this->getActiveUsers($userFilter);
            $stats['users_checked'] = $activeUsers->count();
            
            $this->info("👥 {$stats['users_checked']} utilisateurs actifs à vérifier");
            $this->line("");

            // ✅ 2. VÉRIFICATION POUR CHAQUE UTILISATEUR
            foreach ($activeUsers as $user) {
                $this->line("🔍 Vérification utilisateur ID {$user->id} ({$user->name})");
                
                $userStats = $this->checkUserPosts($user, $daysBack, $isDryRun, $force);
                
                $stats['missing_posts_found'] += $userStats['missing_posts'];
                $stats['posts_generated'] += $userStats['generated'];
                $stats['activation_posts'] += $userStats['activation_posts'];
                $stats['weekly_posts'] += $userStats['weekly_posts'];
                $stats['catchup_posts'] += $userStats['catchup_posts'];
                $stats['errors'] += $userStats['errors'];
            }

            // ✅ 3. RAPPORT FINAL
            $duration = $startTime->diffInSeconds(now());
            $this->displayFinalReport($stats, $duration, $isDryRun);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ ERREUR POST GUARDIAN: {$e->getMessage()}");
            Log::error("💥 Post Guardian Exception", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * ✅ RÉCUPÉRER LES UTILISATEURS ACTIFS AVEC FONCTIONNALITÉS
     */
    private function getActiveUsers($userFilter = null): \Illuminate\Support\Collection
    {
        $query = User::whereHas('featureAccess', function ($q) {
            $q->whereHas('feature', function ($subQuery) {
                $subQuery->whereIn('key', ['blog', 'social_media']);
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->where(function($expQuery) {
                $expQuery->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
        });

        if ($userFilter) {
            $query->where('id', $userFilter);
        }

        return $query->get();
    }

    /**
     * ✅ VÉRIFIER LES POSTS D'UN UTILISATEUR ET RATTRAPER CE QUI MANQUE
     */
    private function checkUserPosts(User $user, int $daysBack, bool $isDryRun, bool $force): array
    {
        $stats = [
            'missing_posts' => 0,
            'generated' => 0,
            'activation_posts' => 0,
            'weekly_posts' => 0,
            'catchup_posts' => 0,
            'errors' => 0
        ];

        try {
            // ✅ 1. VÉRIFIER POSTS D'ACTIVATION MANQUÉS
            $activationStats = $this->checkActivationPosts($user, $daysBack, $isDryRun, $force);
            $stats['activation_posts'] += $activationStats['generated'];
            $stats['missing_posts'] += $activationStats['missing'];

            // ✅ 2. VÉRIFIER RÉGÉNÉRATION HEBDOMADAIRE MANQUÉE
            $weeklyStats = $this->checkWeeklyRegeneration($user, $isDryRun, $force);
            $stats['weekly_posts'] += $weeklyStats['generated'];
            $stats['missing_posts'] += $weeklyStats['missing'];

            // ✅ 3. VÉRIFIER POSTS QUOTIDIENS MANQUÉS (GÉNÉRAL)
            $dailyStats = $this->checkDailyPosts($user, $daysBack, $isDryRun, $force);
            $stats['catchup_posts'] += $dailyStats['generated'];
            $stats['missing_posts'] += $dailyStats['missing'];

            $stats['generated'] = $stats['activation_posts'] + $stats['weekly_posts'] + $stats['catchup_posts'];

            if ($stats['generated'] > 0) {
                $this->info("   ✅ {$stats['generated']} posts générés pour {$user->name}");
            } else {
                $this->line("   ✅ Aucun post manqué pour {$user->name}");
            }

        } catch (\Exception $e) {
            $stats['errors']++;
            $this->error("   ❌ Erreur pour utilisateur {$user->id}: {$e->getMessage()}");
        }

        return $stats;
    }

    /**
     * ✅ VÉRIFIER ET RATTRAPER LES POSTS D'ACTIVATION MANQUÉS
     */
    private function checkActivationPosts(User $user, int $daysBack, bool $isDryRun, bool $force): array
    {
        $stats = ['missing' => 0, 'generated' => 0];

        try {
            // Récupérer les activations récentes
            $recentActivations = UserFeatureAccess::where('user_id', $user->id)
                ->whereIn('feature_id', function($query) {
                    $query->select('id')
                        ->from('features')
                        ->whereIn('key', ['blog', 'social_media']);
                })
                ->where('user_activated', true)
                ->where('status', 'active')
                ->whereBetween('user_activated_at', [now()->subDays($daysBack), now()])
                ->get();

            foreach ($recentActivations as $activation) {
                $feature = $activation->feature;
                $activationDate = Carbon::parse($activation->user_activated_at);

                if ($feature->key === 'blog') {
                    // Vérifier si le post d'activation blog existe
                    $hasActivationPost = BlogPost::where('user_id', $user->id)
                        ->where('is_ai_generated', true)
                        ->whereBetween('created_at', [
                            $activationDate->subHours(2),
                            $activationDate->addDays(1)
                        ])
                        ->exists();

                    if (!$hasActivationPost || $force) {
                        $stats['missing']++;
                        $this->warn("   📝 Post d'activation blog manqué le {$activationDate->format('d/m/Y H:i')}");
                        
                        if (!$isDryRun) {
                            if ($this->generateActivationBlogPost($user, $activationDate)) {
                                $stats['generated']++;
                            }
                        }
                    }
                }

                if ($feature->key === 'social_media') {
                    // Vérifier si le post d'activation social existe
                    $hasActivationPost = SocialMediaPost::where('user_id', $user->id)
                        ->where('is_ai_generated', true)
                        ->whereBetween('created_at', [
                            $activationDate->subHours(2),
                            $activationDate->addDays(1)
                        ])
                        ->exists();

                    if (!$hasActivationPost || $force) {
                        $stats['missing']++;
                        $this->warn("   📱 Post d'activation social manqué le {$activationDate->format('d/m/Y H:i')}");
                        
                        if (!$isDryRun) {
                            if ($this->generateActivationSocialPost($user, $activationDate)) {
                                $stats['generated']++;
                            }
                        }
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification posts d'activation", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }

        return $stats;
    }

    /**
     * ✅ VÉRIFIER ET RATTRAPER LA RÉGÉNÉRATION HEBDOMADAIRE
     */
    private function checkWeeklyRegeneration(User $user, bool $isDryRun, bool $force): array
    {
        $stats = ['missing' => 0, 'generated' => 0];

        try {
            // Vérifier les posts de cette semaine
            $startOfWeek = now()->startOfWeek(); // Lundi
            $endOfWeek = now()->endOfWeek();

            $blogFeature = $user->featureAccess()
                ->whereHas('feature', fn($q) => $q->where('key', 'blog'))
                ->where('status', 'active')
                ->first();

            $socialFeature = $user->featureAccess()
                ->whereHas('feature', fn($q) => $q->where('key', 'social_media'))
                ->where('status', 'active')
                ->first();

            // Vérifier blog posts hebdomadaires
            if ($blogFeature) {
                $weeklyBlogPosts = BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                if ($weeklyBlogPosts < 7 || $force) {
                    $missing = 7 - $weeklyBlogPosts;
                    $stats['missing'] += $missing;
                    $this->warn("   📝 {$missing} blog posts hebdomadaires manqués");
                    
                    if (!$isDryRun) {
                        $generated = $this->generateMissingWeeklyPosts($user, 'blog', $missing);
                        $stats['generated'] += $generated;
                    }
                }
            }

            // Vérifier social posts hebdomadaires  
            if ($socialFeature) {
                $weeklySocialPosts = SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                if ($weeklySocialPosts < 7 || $force) {
                    $missing = 7 - $weeklySocialPosts;
                    $stats['missing'] += $missing;
                    $this->warn("   📱 {$missing} social posts hebdomadaires manqués");
                    
                    if (!$isDryRun) {
                        $generated = $this->generateMissingWeeklyPosts($user, 'social', $missing);
                        $stats['generated'] += $generated;
                    }
                }
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification régénération hebdomadaire", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }

        return $stats;
    }

    /**
     * ✅ VÉRIFIER POSTS QUOTIDIENS MANQUÉS (RATTRAPAGE GÉNÉRAL)
     */
    private function checkDailyPosts(User $user, int $daysBack, bool $isDryRun, bool $force): array
    {
        $stats = ['missing' => 0, 'generated' => 0];

        try {
            // Vérifier chaque jour des X derniers jours
            for ($i = 1; $i <= $daysBack; $i++) {
                $checkDate = now()->subDays($i);
                
                // Ignorer les jours où l'utilisateur n'était pas actif
                if (!$this->wasUserActiveOnDate($user, $checkDate)) {
                    continue;
                }

                $dailyStats = $this->checkSpecificDate($user, $checkDate, $isDryRun, $force);
                $stats['missing'] += $dailyStats['missing'];
                $stats['generated'] += $dailyStats['generated'];
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification posts quotidiens", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }

        return $stats;
    }

    /**
     * ✅ VÉRIFIER UN DATE SPÉCIFIQUE
     */
    private function checkSpecificDate(User $user, Carbon $date, bool $isDryRun, bool $force): array
    {
        $stats = ['missing' => 0, 'generated' => 0];

        $startOfDay = $date->copy()->startOfDay();
        $endOfDay = $date->copy()->endOfDay();

        // Vérifier blog posts pour cette date
        $blogFeature = $user->featureAccess()
            ->whereHas('feature', fn($q) => $q->where('key', 'blog'))
            ->where('status', 'active')
            ->first();

        if ($blogFeature) {
            $dailyBlogPosts = BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfDay, $endOfDay])
                ->count();

            if ($dailyBlogPosts === 0 || $force) {
                $stats['missing']++;
                $this->warn("   📝 Blog post manqué le {$date->format('d/m/Y')}");
                
                if (!$isDryRun) {
                    if ($this->generateCatchupBlogPost($user, $date)) {
                        $stats['generated']++;
                    }
                }
            }
        }

        // Vérifier social posts pour cette date
        $socialFeature = $user->featureAccess()
            ->whereHas('feature', fn($q) => $q->where('key', 'social_media'))
            ->where('status', 'active')
            ->first();

        if ($socialFeature) {
            $dailySocialPosts = SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfDay, $endOfDay])
                ->count();

            if ($dailySocialPosts === 0 || $force) {
                $stats['missing']++;
                $this->warn("   📱 Social post manqué le {$date->format('d/m/Y')}");
                
                if (!$isDryRun) {
                    if ($this->generateCatchupSocialPost($user, $date)) {
                        $stats['generated']++;
                    }
                }
            }
        }

        return $stats;
    }

    /**
     * ✅ VÉRIFIER SI L'UTILISATEUR ÉTAIT ACTIF À UNE DATE
     */
    private function wasUserActiveOnDate(User $user, Carbon $date): bool
    {
        return UserFeatureAccess::where('user_id', $user->id)
            ->whereHas('feature', function($q) {
                $q->whereIn('key', ['blog', 'social_media']);
            })
            ->where('user_activated', true)
            ->where('status', 'active')
            ->where('user_activated_at', '<=', $date)
            ->where(function($q) use ($date) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', $date);
            })
            ->exists();
    }

    /**
     * ✅ GÉNÉRER POSTS D'ACTIVATION BLOG SELON LES RÈGLES DU JOUR
     */
    private function generateActivationBlogPost(User $user, Carbon $activationDate): bool
    {
        try {
            $dayOfWeek = $activationDate->dayOfWeek;
            $postsNeeded = $this->blogRulesByDay[$dayOfWeek];
            
            $this->info("     🎯 Génération de {$postsNeeded} posts blog selon règles " . $activationDate->format('l'));
            
            $contentService = app(ContentGenerationService::class);
            $postsCreated = 0;
            
            for ($i = 0; $i < $postsNeeded; $i++) {
                $result = $contentService->generateBlogContent($user, [
                    'topic_category' => 'activation',
                    'activation_date' => $activationDate->toISOString(),
                    'post_index' => $i + 1,
                    'total_posts' => $postsNeeded
                ]);

                if ($result['success']) {
                    // ✅ CORRECTION : Premier post published aujourd'hui, autres scheduled
                    $status = ($i === 0) ? 'published' : 'scheduled';
                    $publishDate = ($i === 0) ? now() : now()->addDays($i);
                    
                    BlogPost::create([
                        'user_id' => $user->id,
                        'title' => $result['data']['title'] . " (#" . ($i + 1) . ")",
                        'slug' => Str::slug($result['data']['title'] . "-" . ($i + 1)),
                        'content' => $result['data']['content'],
                        'excerpt' => $result['data']['excerpt'] ?? null,
                        'summary' => $result['data']['excerpt'] ?? Str::limit(strip_tags($result['data']['content']), 150),
                        'featured_image_url' => $result['data']['featured_image_url'] ?? null,
                        'status' => $status,
                        'is_ai_generated' => true,
                        'topic_category' => 'activation',
                        'created_at' => now(), // ✅ CORRECTION : Toujours date actuelle
                        'published_at' => $status === 'published' ? now() : $publishDate,
                        'updated_at' => now()
                    ]);

                    $postsCreated++;
                    $this->info("       ✅ Blog #{$postsCreated} créé ({$status})");
                } else {
                    $this->error("       ❌ Échec blog #" . ($i + 1) . ": " . ($result['error'] ?? 'Erreur inconnue'));
                }
            }

            if ($postsCreated > 0) {
                $this->info("     ✅ {$postsCreated}/{$postsNeeded} posts blog d'activation générés");
                return true;
            }

        } catch (\Exception $e) {
            $this->error("     ❌ Erreur génération blogs d'activation: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * ✅ GÉNÉRER POSTS D'ACTIVATION RÉSEAUX SOCIAUX SELON LES RÈGLES DU JOUR
     */
    private function generateActivationSocialPost(User $user, Carbon $activationDate): bool
    {
        try {
            $dayOfWeek = $activationDate->dayOfWeek;
            $platforms = $this->socialRulesByDay[$dayOfWeek];
            $postsNeeded = count($platforms);
            
            $this->info("     🎯 Génération de {$postsNeeded} posts sociaux selon règles " . $activationDate->format('l'));
            $this->info("     📱 Plateformes: " . implode(', ', array_unique($platforms)));
            
            $contentService = app(ContentGenerationService::class);
            $postsCreated = 0;
            
            foreach ($platforms as $index => $platform) {
                $result = $contentService->generateSocialContent($user, $platform, [
                    'topic_category' => 'activation',
                    'activation_date' => $activationDate->toISOString(),
                    'post_index' => $index + 1,
                    'total_posts' => $postsNeeded,
                    'platform' => $platform
                ]);

                if ($result['success']) {
                    // ✅ CORRECTION : Premier post published aujourd'hui, autres scheduled
                    $status = ($index === 0) ? 'published' : 'scheduled';
                    $publishDate = ($index === 0) ? now() : now()->addDays($index);
                    
                    SocialMediaPost::create([
                        'user_id' => $user->id,
                        'platform' => $platform,
                        'content' => $result['data']['content'] . "\n\n#activation #pixelrise",
                        'hashtags' => $result['data']['hashtags'] ?? null,
                        'media_url' => $result['data']['media_url'] ?? null,
                        'status' => $status,
                        'is_ai_generated' => true,
                        'topic_category' => 'activation',
                        'created_at' => now(), // ✅ CORRECTION : Toujours date actuelle
                        'published_at' => $status === 'published' ? now() : $publishDate,
                        'updated_at' => now()
                    ]);

                    $postsCreated++;
                    $this->info("       ✅ {$platform} #{$postsCreated} créé ({$status})");
                } else {
                    $this->error("       ❌ Échec {$platform} #" . ($index + 1) . ": " . ($result['error'] ?? 'Erreur inconnue'));
                }
            }

            if ($postsCreated > 0) {
                $this->info("     ✅ {$postsCreated}/{$postsNeeded} posts sociaux d'activation générés");
                return true;
            }

        } catch (\Exception $e) {
            $this->error("     ❌ Erreur génération posts sociaux d'activation: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * ✅ GÉNÉRER POSTS HEBDOMADAIRES MANQUÉS
     */
    private function generateMissingWeeklyPosts(User $user, string $type, int $missing): int
    {
        $generated = 0;

        try {
            $weeklyService = app(WeeklyPostGenerationService::class);

            // Récupérer l'accessId actif
            $featureKey = $type === 'blog' ? 'blog' : 'social_media';
            $access = \App\Models\UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                    $query->where('key', $featureKey);
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->first();

            $accessId = $access ? $access->id : null;

            for ($i = 0; $i < $missing; $i++) {
                $dayOfWeek = (now()->dayOfWeek + $i) % 7;
                $targetDate = now()->startOfWeek()->addDays($dayOfWeek);

                if ($type === 'blog') {
                    $result = $weeklyService->generateSingleBlogPost($user, [
                        'date' => $targetDate,
                        'day_of_week' => $dayOfWeek,
                        'is_catchup' => true
                    ], $accessId);
                } else {
                    $platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
                    $platform = $platforms[$i % count($platforms)];

                    $result = $weeklyService->generateSingleSocialPost($user, $platform, [
                        'date' => $targetDate,
                        'day_of_week' => $dayOfWeek,
                        'is_catchup' => true
                    ], $accessId);
                }

                if ($result['success']) {
                    $generated++;
                }

                // Délai pour éviter surcharge
                sleep(1);
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération posts hebdomadaires manqués", [
                'user_id' => $user->id,
                'type' => $type,
                'error' => $e->getMessage()
            ]);
        }

        return $generated;
    }

    /**
     * ✅ GÉNÉRER POST BLOG DE RATTRAPAGE
     */
    private function generateCatchupBlogPost(User $user, Carbon $targetDate): bool
    {
        try {
            $weeklyService = app(WeeklyPostGenerationService::class);

            // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW)
            $access = \App\Models\UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'blog');
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at', 'desc')
                ->first();

            $accessId = $access ? $access->id : null;

            $result = $weeklyService->generateSingleBlogPost($user, [
                'date' => $targetDate,
                'day_of_week' => $targetDate->dayOfWeek,
                'is_catchup' => true
            ], $accessId);

            if ($result['success']) {
                $this->info("     ✅ Blog de rattrapage généré pour {$targetDate->format('d/m/Y')}");
                return true;
            }

        } catch (\Exception $e) {
            $this->error("     ❌ Erreur blog rattrapage: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * ✅ GÉNÉRER POST SOCIAL DE RATTRAPAGE
     */
    private function generateCatchupSocialPost(User $user, Carbon $targetDate): bool
    {
        try {
            $weeklyService = app(WeeklyPostGenerationService::class);

            // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW)
            $access = \App\Models\UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'social_media');
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at', 'desc')
                ->first();

            $accessId = $access ? $access->id : null;

            $platforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
            $platform = $platforms[$targetDate->day % count($platforms)];

            $result = $weeklyService->generateSingleSocialPost($user, $platform, [
                'date' => $targetDate,
                'day_of_week' => $targetDate->dayOfWeek,
                'is_catchup' => true
            ], $accessId);

            if ($result['success']) {
                $this->info("     ✅ Social de rattrapage généré pour {$targetDate->format('d/m/Y')}");
                return true;
            }

        } catch (\Exception $e) {
            $this->error("     ❌ Erreur social rattrapage: {$e->getMessage()}");
        }

        return false;
    }

    /**
     * ✅ AFFICHER RAPPORT FINAL
     */
    private function displayFinalReport(array $stats, int $duration, bool $isDryRun): void
    {
        $this->line("═══════════════════════════════════════════════════════════");
        $this->info("🛡️ RAPPORT POST GUARDIAN");

        $this->table([
            'Métrique', 'Valeur'
        ], [
            ['👥 Utilisateurs vérifiés', $stats['users_checked']],
            ['🔍 Posts manqués détectés', $stats['missing_posts_found']],
            ['🚀 Posts générés au total', $stats['posts_generated']],
            ['📝 Posts d\'activation', $stats['activation_posts']],
            ['📅 Posts hebdomadaires', $stats['weekly_posts']],
            ['🔄 Posts de rattrapage', $stats['catchup_posts']],
            ['❌ Erreurs', $stats['errors']],
            ['⏱️ Durée', "{$duration}s"],
            ['🔍 Mode simulation', $isDryRun ? 'Oui' : 'Non'],
        ]);

        if ($stats['posts_generated'] > 0) {
            if ($isDryRun) {
                $this->warn("🔍 {$stats['posts_generated']} posts seraient générés en mode réel");
            } else {
                $this->info("✅ {$stats['posts_generated']} posts manqués ont été générés avec succès");
            }
        } else {
            $this->info("✅ Aucun post manqué détecté - Système en parfait état");
        }

        Log::info("🛡️ Post Guardian terminé", array_merge($stats, [
            'duration_seconds' => $duration,
            'dry_run' => $isDryRun
        ]));
    }
}