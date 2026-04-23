<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

/**
 * ✅ CONTROLLER DE MONITORING UNIQUEMENT
 * Toutes les fonctionnalités de génération sont dans WeeklyObjectivesController
 * Ce contrôleur conserve uniquement le monitoring et les statistiques
 */
class ContentGenerationController extends Controller
{
    // ===== STATUT ET MONITORING =====

    /**
     * Obtenir statut génération en cours pour l'utilisateur
     */
    public function getGenerationStatus(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Vérifier génération en cours via cache features
            $blogGeneration = Cache::get("remaining_posts_{$user->id}_blog");
            $socialGeneration = Cache::get("remaining_posts_{$user->id}_social_media");

            // Dernière génération
            $lastGeneration = $this->getLastGenerationTime($user);

            // Posts cette semaine
            $weeklyPosts = $this->getWeeklyPostsCount($user);

            return response()->json([
                'active_posts_generation' => [
                    'blog' => $blogGeneration ? $blogGeneration['posts_remaining'] : 0,
                    'social_media' => $socialGeneration ? $socialGeneration['posts_remaining'] : 0
                ],
                'last_generation' => $lastGeneration,
                'next_scheduled' => $this->getNextScheduledGeneration($user),
                'generation_enabled' => true,
                'weekly_posts_completed' => $weeklyPosts,
                'system_type' => 'weekly_objectives' // Nouveau système
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur statut génération", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'active_posts_generation' => ['blog' => 0, 'social_media' => 0],
                'last_generation' => null,
                'next_scheduled' => null,
                'error' => 'Erreur lors de la récupération du statut'
            ], 500);
        }
    }

    /**
     * Vérifier si utilisateur a posts cette semaine
     */
    public function getPostsThisWeek(): JsonResponse
    {
        try {
            $user = Auth::user();
            $startOfWeek = Carbon::now()->startOfWeek();
            $endOfWeek = Carbon::now()->endOfWeek();

            // Compter blog posts cette semaine
            $blogPostsCount = BlogPost::where('user_id', $user->id)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            // Compter social media posts cette semaine
            $socialPostsCount = SocialMediaPost::where('user_id', $user->id)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();

            $totalCount = $blogPostsCount + $socialPostsCount;
            $hasPosts = $totalCount > 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'has_posts' => $hasPosts,
                    'count' => $totalCount,
                    'blog_posts' => $blogPostsCount,
                    'social_posts' => $socialPostsCount,
                    'week_period' => [
                        'start' => $startOfWeek->format('Y-m-d'),
                        'end' => $endOfWeek->format('Y-m-d')
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur posts semaine", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors de la vérification des posts',
                'data' => [
                    'has_posts' => false,
                    'count' => 0
                ]
            ], 500);
        }
    }

    /**
     * Historique des générations pour l'utilisateur
     */
    public function getGenerationHistory(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $perPage = $request->input('per_page', 10);
            $type = $request->input('type', 'all');

            // Récupérer historique depuis les posts AI générés
            $query = collect();

            if ($type === 'all' || $type === 'blog') {
                $blogPosts = BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->select('id', 'title', 'created_at', 'status')
                    ->get()
                    ->map(function ($post) {
                        return [
                            'id' => $post->id,
                            'type' => 'blog',
                            'title' => $post->title,
                            'status' => $post->status,
                            'created_at' => $post->created_at,
                            'success' => true,
                            'generation_method' => 'weekly_objectives'
                        ];
                    });

                $query = $query->merge($blogPosts);
            }

            if ($type === 'all' || $type === 'social_media') {
                $socialPosts = SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->select('id', 'platform', 'content', 'created_at', 'status')
                    ->get()
                    ->map(function ($post) {
                        return [
                            'id' => $post->id,
                            'type' => 'social_media',
                            'title' => substr($post->content, 0, 50) . '...',
                            'platform' => $post->platform,
                            'status' => $post->status,
                            'created_at' => $post->created_at,
                            'success' => true,
                            'generation_method' => 'weekly_objectives'
                        ];
                    });

                $query = $query->merge($socialPosts);
            }

            // Trier par date décroissante
            $history = $query->sortByDesc('created_at')->take($perPage)->values();

            return response()->json([
                'success' => true,
                'data' => $history,
                'pagination' => [
                    'total' => $query->count(),
                    'per_page' => $perPage,
                    'current_page' => 1
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur historique génération", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors de la récupération de l\'historique'
            ], 500);
        }
    }

    // ===== CONFIGURATION UTILISATEUR =====

    /**
     * Récupérer paramètres génération de l'utilisateur
     */
    public function getSettings(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Paramètres par défaut pour le nouveau système
            $settings = [
                'auto_generation_enabled' => true,
                'preferred_times' => ['08:00', '12:00', '18:00'],
                'platforms' => ['facebook', 'linkedin', 'instagram', 'twitter'],
                'generation_method' => 'weekly_objectives', // Nouveau système
                'objectives_auto_generation' => true,
                'weekly_planning_enabled' => true
            ];

            return response()->json([
                'success' => true,
                'settings' => $settings
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur récupération settings", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors de la récupération des paramètres'
            ], 500);
        }
    }

    /**
     * Modifier paramètres génération de l'utilisateur
     */
    public function updateSettings(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            // Validation basique
            $validated = $request->validate([
                'auto_generation_enabled' => 'sometimes|boolean',
                'preferred_times' => 'sometimes|array',
                'platforms' => 'sometimes|array',
                'platforms.*' => 'in:facebook,instagram,twitter,linkedin',
                'objectives_auto_generation' => 'sometimes|boolean',
                'weekly_planning_enabled' => 'sometimes|boolean'
            ]);

            // Stocker en cache
            $cacheKey = "user_generation_settings_{$user->id}";
            $currentSettings = Cache::get($cacheKey, []);

            $newSettings = array_merge($currentSettings, $validated);
            Cache::put($cacheKey, $newSettings, Carbon::now()->addMonths(1));

            Log::info("[ContentGeneration] Settings mis à jour", [
                'user_id' => $user->id,
                'settings' => $validated
            ]);

            return response()->json([
                'success' => true,
                'settings' => $newSettings
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur mise à jour settings", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors de la mise à jour des paramètres'
            ], 500);
        }
    }

    // ===== ROUTES ADMIN =====

    /**
     * Statut global du système de génération
     */
    public function getGlobalStatus(): JsonResponse
    {
        try {
            // Compter utilisateurs avec au moins un projet (plan OFFER.md)
            $activeUsers = \App\Models\UserSite::distinct('user_id')->count('user_id');

            // Compter posts générés cette semaine
            $startOfWeek = Carbon::now()->startOfWeek();
            $totalPosts = BlogPost::where('is_ai_generated', true)
                ->where('created_at', '>=', $startOfWeek)
                ->count();

            $totalPosts += SocialMediaPost::where('is_ai_generated', true)
                ->where('created_at', '>=', $startOfWeek)
                ->count();

            // Vérifier cache actif
            $usersWithCache = 0;
            $users = \App\Models\User::all();
            foreach ($users as $user) {
                if (Cache::has("remaining_posts_{$user->id}_blog") ||
                    Cache::has("remaining_posts_{$user->id}_social_media")) {
                    $usersWithCache++;
                }
            }

            // Compter objectifs hebdomadaires générés
            $weeklyObjectives = \App\Models\WeeklyContentObjective::where('week_identifier', Carbon::now()->format('Y-\WW'))
                ->count();

            return response()->json([
                'active_users' => $activeUsers,
                'total_posts_this_week' => $totalPosts,
                'users_with_pending_generation' => $usersWithCache,
                'weekly_objectives_generated' => $weeklyObjectives,
                'system_health' => $usersWithCache > 0 ? 'active' : 'idle',
                'generation_method' => 'weekly_objectives',
                'last_updated' => Carbon::now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur statut global", [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'active_users' => 0,
                'total_posts_this_week' => 0,
                'system_health' => 'error',
                'error' => 'Erreur lors de la récupération du statut global'
            ], 500);
        }
    }

    /**
     * Utilisateurs avec fonctionnalités actives
     */
    public function getUsersWithFeatures(): JsonResponse
    {
        try {
            // Utilisateurs avec au moins un projet (plan OFFER.md)
            $userIds = \App\Models\UserSite::distinct()->pluck('user_id');
            $users = \App\Models\User::whereIn('id', $userIds)->get()->map(function($user) {

                // Vérifier cache génération
                $blogCache = Cache::get("remaining_posts_{$user->id}_blog");
                $socialCache = Cache::get("remaining_posts_{$user->id}_social_media");

                // Vérifier objectifs hebdomadaires
                $hasWeeklyObjectives = \App\Models\WeeklyContentObjective::whereHas('project', function($q) use ($user) {
                    $q->where('user_id', $user->id);
                })->where('week_identifier', Carbon::now()->format('Y-\WW'))->exists();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'created_at' => $user->created_at,
                    'features' => ['blog', 'social_media'], // Basé sur le plan OFFER.md
                    'pending_generation' => [
                        'blog' => $blogCache ? $blogCache['posts_remaining'] : 0,
                        'social_media' => $socialCache ? $socialCache['posts_remaining'] : 0
                    ],
                    'has_weekly_objectives' => $hasWeeklyObjectives
                ];
            });

            return response()->json([
                'users' => $users,
                'total' => $users->count(),
                'features' => ['blog', 'social_media']
            ]);

        } catch (\Exception $e) {
            Log::error("[ContentGeneration] Erreur utilisateurs features", [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'users' => [],
                'total' => 0,
                'error' => 'Erreur lors de la récupération des utilisateurs'
            ], 500);
        }
    }

    // ===== MÉTHODES PRIVÉES UTILITAIRES =====

    /**
     * Obtenir heure de dernière génération
     */
    private function getLastGenerationTime(User $user): ?string
    {
        $lastBlog = BlogPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->latest('created_at')
            ->first();

        $lastSocial = SocialMediaPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->latest('created_at')
            ->first();

        $lastTime = null;

        if ($lastBlog && $lastSocial) {
            $lastTime = $lastBlog->created_at->gt($lastSocial->created_at)
                ? $lastBlog->created_at
                : $lastSocial->created_at;
        } elseif ($lastBlog) {
            $lastTime = $lastBlog->created_at;
        } elseif ($lastSocial) {
            $lastTime = $lastSocial->created_at;
        }

        return $lastTime ? $lastTime->toISOString() : null;
    }

    /**
     * Obtenir prochaine génération programmée
     */
    private function getNextScheduledGeneration(User $user): ?string
    {
        // Dans le système d'objectifs, la prochaine génération dépend du cache
        $blogCache = Cache::get("remaining_posts_{$user->id}_blog");
        $socialCache = Cache::get("remaining_posts_{$user->id}_social_media");

        if ($blogCache || $socialCache) {
            $blogLastGen = Cache::get("last_generation_{$user->id}_blog");
            $socialLastGen = Cache::get("last_generation_{$user->id}_social_media");

            $lastGen = null;
            if ($blogLastGen && $socialLastGen) {
                $lastGen = Carbon::parse($blogLastGen)->gt(Carbon::parse($socialLastGen))
                    ? $blogLastGen : $socialLastGen;
            } elseif ($blogLastGen) {
                $lastGen = $blogLastGen;
            } elseif ($socialLastGen) {
                $lastGen = $socialLastGen;
            }

            if ($lastGen) {
                return Carbon::parse($lastGen)->addMinutes(10)->toISOString();
            }
        }

        // Sinon, prochaine génération au prochain lundi
        $nextMonday = Carbon::now()->next(Carbon::MONDAY)->setTime(9, 0);
        return $nextMonday->toISOString();
    }

    /**
     * Compter posts hebdomadaires
     */
    private function getWeeklyPostsCount(User $user): array
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        $blogCount = BlogPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        $socialCount = SocialMediaPost::where('user_id', $user->id)
            ->where('is_ai_generated', true)
            ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
            ->count();

        return [
            'blog_posts' => $blogCount,
            'social_posts' => $socialCount,
            'total' => $blogCount + $socialCount,
            'target' => 14 // 7 blog + 7 social
        ];
    }
}
