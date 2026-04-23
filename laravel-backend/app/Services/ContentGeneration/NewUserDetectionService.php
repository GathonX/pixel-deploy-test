<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\UserFeatureAccess;
use App\Models\Feature;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class NewUserDetectionService
{
    private WeeklyPostGenerationService $weeklyPostGenerationService;

    public function __construct(WeeklyPostGenerationService $weeklyPostGenerationService)
    {
        $this->weeklyPostGenerationService = $weeklyPostGenerationService;
    }

    /**
     * ✅ BULLETPROOF : Calculer posts nécessaires avec VRAIES colonnes DB
     */
    public function calculateRequiredPosts(User $user): array
    {
        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek(); // Lundi
        $endOfWeek = $now->copy()->endOfWeek();     // Dimanche

        Log::info("🔍 Calcul posts basé sur fonctionnalités ACTIVÉES", [
            'user_id' => $user->id,
            'current_date' => $now->format('Y-m-d H:i:s'),
            'week_start' => $startOfWeek->format('Y-m-d'),
            'week_end' => $endOfWeek->format('Y-m-d')
        ]);

        // ✅ VÉRIFICATION AVEC VRAIES COLONNES (user_activated, PAS user_enabled)
        $blogFeatureActive = $this->isFeatureActiveForUser($user, 'blog');
        $socialFeatureActive = $this->isFeatureActiveForUser($user, 'social_media');

        Log::info("🔍 Statut fonctionnalités", [
            'user_id' => $user->id,
            'blog_feature_active' => $blogFeatureActive,
            'social_feature_active' => $socialFeatureActive
        ]);

        $blogPostsNeeded = 0;
        $socialPostsNeeded = 0;

        if ($blogFeatureActive) {
            $existingBlogPosts = BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            $blogPostsNeeded = max(0, 7 - $existingBlogPosts);

            Log::info("📝 Blog posts cette semaine", [
                'user_id' => $user->id,
                'existing_posts' => $existingBlogPosts,
                'posts_needed' => $blogPostsNeeded
            ]);
        }

        if ($socialFeatureActive) {
            $existingSocialPosts = SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            $socialPostsNeeded = max(0, 28 - $existingSocialPosts);

            Log::info("📱 Social posts cette semaine", [
                'user_id' => $user->id,
                'existing_posts' => $existingSocialPosts,
                'posts_needed' => $socialPostsNeeded
            ]);
        }

        $totalPostsNeeded = $blogPostsNeeded + $socialPostsNeeded;

        Log::info("✅ Calcul posts terminé", [
            'user_id' => $user->id,
            'blog_posts_needed' => $blogPostsNeeded,
            'social_posts_needed' => $socialPostsNeeded,
            'total_posts_needed' => $totalPostsNeeded,
            'calculation_method' => 'feature_activation_based'
        ]);

        return [
            'current_date' => $now->format('Y-m-d'),
            'blog_feature_active' => $blogFeatureActive,
            'social_feature_active' => $socialFeatureActive,
            'blog_posts_needed' => $blogPostsNeeded,
            'social_posts_needed' => $socialPostsNeeded,
            'total_posts_needed' => $totalPostsNeeded,
            'today_post_published' => true,
            'future_posts_scheduled' => max(0, $totalPostsNeeded - 1),
            'calculation_method' => 'feature_activation_based',
            'week_start' => $startOfWeek->format('Y-m-d'),
            'week_end' => $endOfWeek->format('Y-m-d')
        ];
    }

    /**
     * ✅ BULLETPROOF : Vérifier fonctionnalité activée avec VRAIES colonnes
     */
    private function isFeatureActiveForUser(User $user, string $featureKey): bool
    {
        try {
            $isActive = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                    $query->where('key', $featureKey);
                })
                ->where('user_id', $user->id)
                ->where('admin_enabled', true)      // ✅ Colonne existante
                ->where('user_activated', true)     // ✅ Colonne existante (PAS user_enabled)
                ->where('status', 'active')
                ->exists();

            Log::info("🔍 Vérification fonctionnalité", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'is_active' => $isActive
            ]);

            return $isActive;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification fonctionnalité", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'error' => $e->getMessage()
            ]);

            return false; // En cas d'erreur, considérer comme inactive
        }
    }

    /**
     * ✅ BULLETPROOF : Vérifier besoins génération
     */
    public function needsInitialGeneration(User $user): bool
    {
        try {
            $blogFeatureActive = $this->isFeatureActiveForUser($user, 'blog');
            $socialFeatureActive = $this->isFeatureActiveForUser($user, 'social_media');

            // Si aucune fonctionnalité activée = pas de génération
            if (!$blogFeatureActive && !$socialFeatureActive) {
                Log::info("ℹ️ Aucune fonctionnalité activée", [
                    'user_id' => $user->id
                ]);
                return false;
            }

            $startOfWeek = Carbon::now()->startOfWeek();
            $endOfWeek = Carbon::now()->endOfWeek();

            $needsBlogPosts = false;
            $needsSocialPosts = false;

            if ($blogFeatureActive) {
                $existingBlogPosts = BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                $needsBlogPosts = $existingBlogPosts < 7;
            }

            if ($socialFeatureActive) {
                $existingSocialPosts = SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();

                $needsSocialPosts = $existingSocialPosts < 28;
            }

            $needsGeneration = $needsBlogPosts || $needsSocialPosts;

            Log::info("🔍 Vérification besoins génération", [
                'user_id' => $user->id,
                'blog_active' => $blogFeatureActive,
                'social_active' => $socialFeatureActive,
                'needs_blog_posts' => $needsBlogPosts,
                'needs_social_posts' => $needsSocialPosts,
                'needs_generation' => $needsGeneration
            ]);

            return $needsGeneration;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification besoins génération", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return false; // En cas d'erreur, pas de génération
        }
    }

    /**
     * ✅ BULLETPROOF : Vérifier fonctionnalité pour type de page
     */
    private function isFeatureActiveForPageType(User $user, string $pageType): bool
    {
        switch ($pageType) {
            case 'blog':
                return $this->isFeatureActiveForUser($user, 'blog');

            case 'social_media':
                return $this->isFeatureActiveForUser($user, 'social_media');

            case 'both':
                return $this->isFeatureActiveForUser($user, 'blog') ||
                       $this->isFeatureActiveForUser($user, 'social_media');

            default:
                return false;
        }
    }

    /**
     * ✅ BULLETPROOF : Détecter première visite
     */
    public function detectFirstVisitAndGenerate(User $user, string $pageType): array
    {
        try {
            Log::info("👤 Détection première visite", [
                'user_id' => $user->id,
                'page_type' => $pageType
            ]);

            // Vérifier si fonctionnalité activée
            $isFeatureActive = $this->isFeatureActiveForPageType($user, $pageType);

            if (!$isFeatureActive) {
                Log::info("⚠️ Fonctionnalité non activée", [
                    'user_id' => $user->id,
                    'page_type' => $pageType
                ]);

                return [
                    'success' => true,
                    'message' => 'Fonctionnalité non activée - aucune génération nécessaire',
                    'generated' => false,
                    'feature_active' => false
                ];
            }

            if (!$this->isFirstVisit($user, $pageType)) {
                return [
                    'success' => true,
                    'message' => 'Visite déjà enregistrée',
                    'generated' => false,
                    'feature_active' => true
                ];
            }

            $this->markPageVisit($user, $pageType);

            if (!$this->needsInitialGeneration($user)) {
                return [
                    'success' => true,
                    'message' => 'Posts déjà suffisants pour cette semaine',
                    'generated' => false,
                    'feature_active' => true
                ];
            }

            // Génération
            $generationResult = $this->weeklyPostGenerationService->generateInitialPosts($user);

            if ($generationResult['success']) {
                Log::info("✅ Génération première visite réussie", [
                    'user_id' => $user->id,
                    'page_type' => $pageType,
                    'blog_posts' => count($generationResult['data']['blog_posts'] ?? []),
                    'social_posts' => count($generationResult['data']['social_posts'] ?? [])
                ]);
            }

            return [
                'success' => true,
                'message' => 'Génération initiale déclenchée via première visite',
                'generated' => true,
                'feature_active' => true,
                'data' => $generationResult['data'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur détection première visite", [
                'user_id' => $user->id,
                'page_type' => $pageType,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la détection de première visite'
            ];
        }
    }

    // ✅ CONSERVÉ : Méthodes utilitaires (inchangées)
    public function isFirstVisit(User $user, string $pageType): bool
    {
        $cacheKey = "first_visit_{$user->id}_{$pageType}";

        if (Cache::has($cacheKey)) {
            return false;
        }

        $hasExistingContent = $this->hasExistingContent($user, $pageType);

        if ($hasExistingContent) {
            $this->markPageVisit($user, $pageType);
            return false;
        }

        return true;
    }

    private function hasExistingContent(User $user, string $pageType): bool
    {
        switch ($pageType) {
            case 'blog':
                if (!$this->isFeatureActiveForUser($user, 'blog')) {
                    return false;
                }
                return BlogPost::where('user_id', $user->id)->exists();

            case 'social_media':
                if (!$this->isFeatureActiveForUser($user, 'social_media')) {
                    return false;
                }
                return SocialMediaPost::where('user_id', $user->id)->exists();

            case 'both':
                $blogActive = $this->isFeatureActiveForUser($user, 'blog');
                $socialActive = $this->isFeatureActiveForUser($user, 'social_media');

                $hasBlog = $blogActive ? BlogPost::where('user_id', $user->id)->exists() : true;
                $hasSocial = $socialActive ? SocialMediaPost::where('user_id', $user->id)->exists() : true;

                return $hasBlog && $hasSocial;

            default:
                return false;
        }
    }

    private function markPageVisit(User $user, string $pageType): void
    {
        $cacheKey = "first_visit_{$user->id}_{$pageType}";
        Cache::put($cacheKey, true, Carbon::now()->addMonths(6));

        Log::info("📝 Visite marquée", [
            'user_id' => $user->id,
            'page_type' => $pageType
        ]);
    }

    public function isOptimalGenerationTime(User $user): bool
    {
        $lastGenerationKey = "last_generation_{$user->id}";
        $lastGeneration = Cache::get($lastGenerationKey);

        if ($lastGeneration && Carbon::parse($lastGeneration)->diffInHours(Carbon::now()) < 1) {
            Log::info("⏳ Génération trop récente", [
                'user_id' => $user->id,
                'last_generation' => $lastGeneration
            ]);
            return false;
        }

        return true;
    }

    public function markGenerationCompleted(User $user): void
    {
        $lastGenerationKey = "last_generation_{$user->id}";
        Cache::put($lastGenerationKey, Carbon::now()->toISOString(), Carbon::now()->addHours(2));

        Log::info("✅ Génération marquée comme effectuée", [
            'user_id' => $user->id,
            'timestamp' => Carbon::now()->toISOString()
        ]);
    }

    /**
     * ✅ BULLETPROOF : Détecter utilisateurs avec fonctionnalités activées
     */
    public function detectUsersNeedingGeneration(): array
    {
        try {
            Log::info("🔍 Détection utilisateurs nécessitant génération - Basé sur fonctionnalités");

            $usersNeedingGeneration = [];

            // ✅ Utilisateurs avec fonctionnalités activées mais posts insuffisants
            $usersWithActiveFeatures = User::whereHas('featureAccess', function($query) {
                    $query->whereHas('feature', function($subQuery) {
                        $subQuery->whereIn('key', ['blog', 'social_media']);
                    })
                    ->where('admin_enabled', true)
                    ->where('user_activated', true)    // ✅ Bonne colonne
                    ->where('status', 'active');
                })
                ->where('email_verified_at', '!=', null)
                ->get();

            foreach ($usersWithActiveFeatures as $user) {
                if ($this->needsInitialGeneration($user) && $this->isOptimalGenerationTime($user)) {
                    $usersNeedingGeneration[] = [
                        'user' => $user,
                        'reason' => 'active_features_insufficient_content',
                        'priority' => 'high',
                        'posts_needed' => $this->calculateRequiredPosts($user)
                    ];
                }
            }

            Log::info("📊 Détection terminée - Basé sur fonctionnalités", [
                'users_with_active_features' => $usersWithActiveFeatures->count(),
                'users_needing_generation' => count($usersNeedingGeneration)
            ]);

            return $usersNeedingGeneration;

        } catch (\Exception $e) {
            Log::error("❌ Erreur détection utilisateurs", [
                'error' => $e->getMessage()
            ]);

            return [];
        }
    }

    /**
     * ✅ BULLETPROOF : Statistiques basées sur fonctionnalités
     */
    public function getDetectionStats(): array
    {
        try {
            $stats = [
                'users_with_blog_feature' => User::whereHas('featureAccess', function($query) {
                    $query->whereHas('feature', function($subQuery) {
                        $subQuery->where('key', 'blog');
                    })
                    ->where('admin_enabled', true)
                    ->where('user_activated', true)    // ✅ Bonne colonne
                    ->where('status', 'active');
                })->count(),

                'users_with_social_feature' => User::whereHas('featureAccess', function($query) {
                    $query->whereHas('feature', function($subQuery) {
                        $subQuery->where('key', 'social_media');
                    })
                    ->where('admin_enabled', true)
                    ->where('user_activated', true)    // ✅ Bonne colonne
                    ->where('status', 'active');
                })->count(),

                'users_without_blog_posts' => User::whereDoesntHave('blogPosts')->count(),
                'users_without_social_posts' => User::whereDoesntHave('socialMediaPosts')->count(),
                'users_needing_generation' => count($this->detectUsersNeedingGeneration()),
                'total_users' => User::count()
            ];

            return $stats;

        } catch (\Exception $e) {
            Log::error("❌ Erreur statistiques détection", [
                'error' => $e->getMessage()
            ]);

            return [
                'users_with_blog_feature' => 0,
                'users_with_social_feature' => 0,
                'users_without_blog_posts' => 0,
                'users_without_social_posts' => 0,
                'users_needing_generation' => 0,
                'total_users' => 0
            ];
        }
    }

    /**
     * ✅ BULLETPROOF : Déclencher génération pour liste d'utilisateurs
     */
    public function triggerGenerationForUsers(array $usersData): array
    {
        $results = [];

        foreach ($usersData as $userData) {
            $user = $userData['user'];
            $reason = $userData['reason'];

            Log::info("🎯 Déclenchement génération utilisateur", [
                'user_id' => $user->id,
                'reason' => $reason
            ]);

            try {
                $result = $this->weeklyPostGenerationService->generateWeeklyPosts($user);

                if ($result['success']) {
                    $this->markGenerationCompleted($user);
                }

                $results[] = [
                    'user_id' => $user->id,
                    'success' => $result['success'],
                    'reason' => $reason,
                    'data' => $result['data'] ?? null,
                    'error' => $result['error'] ?? null
                ];

            } catch (\Exception $e) {
                Log::error("❌ Erreur génération utilisateur", [
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);

                $results[] = [
                    'user_id' => $user->id,
                    'success' => false,
                    'reason' => $reason,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    /**
     * ✅ MÉTHODE SIMPLIFIÉE : Vérifier si utilisateur a des posts
     */
    private function hasAnyPosts(User $user): bool
    {
        $hasBlog = BlogPost::where('user_id', $user->id)->exists();
        $hasSocial = SocialMediaPost::where('user_id', $user->id)->exists();

        return $hasBlog || $hasSocial;
    }

    /**
     * ✅ MÉTHODE SIMPLIFIÉE : Trouver utilisateurs inactifs
     */
    private function findInactiveUsersNeedingContent(): array
    {
        $inactiveUsers = [];

        try {
            $startOfWeek = Carbon::now()->startOfWeek();

            // Utilisateurs sans posts cette semaine mais avec fonctionnalités activées
            $usersWithoutWeeklyContent = User::whereHas('featureAccess', function($query) {
                    $query->whereHas('feature', function($subQuery) {
                        $subQuery->whereIn('key', ['blog', 'social_media']);
                    })
                    ->where('admin_enabled', true)
                    ->where('user_activated', true)    // ✅ Bonne colonne
                    ->where('status', 'active');
                })
                ->whereDoesntHave('blogPosts', function ($query) use ($startOfWeek) {
                    $query->where('created_at', '>=', $startOfWeek);
                })
                ->whereDoesntHave('socialMediaPosts', function ($query) use ($startOfWeek) {
                    $query->where('created_at', '>=', $startOfWeek);
                })
                ->where('created_at', '<=', Carbon::now()->subWeek())
                ->limit(10)
                ->get();

            foreach ($usersWithoutWeeklyContent as $user) {
                if ($this->isOptimalGenerationTime($user)) {
                    $inactiveUsers[] = [
                        'user' => $user,
                        'reason' => 'inactive_user_weekly_generation',
                        'priority' => 'medium',
                        'posts_needed' => $this->calculateRequiredPosts($user)
                    ];
                }
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur recherche utilisateurs inactifs", [
                'error' => $e->getMessage()
            ]);
        }

        return $inactiveUsers;
    }
    }
