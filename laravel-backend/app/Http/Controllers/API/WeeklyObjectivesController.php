<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\WeeklyContentObjective;
use App\Services\ContentGeneration\WeeklyObjectivesService;
use App\Services\ContentGeneration\ContentGenerationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class WeeklyObjectivesController extends Controller
{
    private WeeklyObjectivesService $weeklyObjectivesService;
    private ContentGenerationService $contentGenerationService;

    public function __construct(
        WeeklyObjectivesService $weeklyObjectivesService,
        ContentGenerationService $contentGenerationService
    ) {
        $this->weeklyObjectivesService = $weeklyObjectivesService;
        $this->contentGenerationService = $contentGenerationService;
    }

    /**
     * ✅ Récupérer objectifs de la semaine courante
     */
    public function getCurrentWeekObjectives(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $contentType = $request->query('type', 'both'); // blog, social_media, both

            Log::info("📋 Récupération objectifs semaine courante", [
                'user_id' => $user->id,
                'content_type' => $contentType
            ]);

            $project = $user->projects()->where('is_active', true)->first();
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ], 404);
            }

            $weekIdentifier = Carbon::now()->format('Y-\WW');
            $objectives = [];

            if ($contentType === 'both' || $contentType === 'blog') {
                $blogObjectives = WeeklyContentObjective::where([
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier,
                    'content_type' => 'blog'
                ])->first();

                $objectives['blog'] = $blogObjectives ? [
                    'id' => $blogObjectives->id,
                    'week_identifier' => $blogObjectives->week_identifier,
                    'objectives' => $blogObjectives->objectives,
                    'is_generated' => $blogObjectives->is_generated,
                    'week_dates' => [
                        'start' => $blogObjectives->week_start_date,
                        'end' => $blogObjectives->week_end_date
                    ]
                ] : null;
            }

            if ($contentType === 'both' || $contentType === 'social_media') {
                $socialObjectives = WeeklyContentObjective::where([
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier,
                    'content_type' => 'social_media'
                ])->first();

                $objectives['social_media'] = $socialObjectives ? [
                    'id' => $socialObjectives->id,
                    'week_identifier' => $socialObjectives->week_identifier,
                    'objectives' => $socialObjectives->objectives,
                    'is_generated' => $socialObjectives->is_generated,
                    'week_dates' => [
                        'start' => $socialObjectives->week_start_date,
                        'end' => $socialObjectives->week_end_date
                    ]
                ] : null;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'week_identifier' => $weekIdentifier,
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'objectives' => $objectives,
                    'current_day' => Carbon::now()->dayOfWeek
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur récupération objectifs courante", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des objectifs'
            ], 500);
        }
    }

    /**
     * ✅ Générer objectifs pour une semaine spécifique
     */
    public function generateWeeklyObjectives(Request $request): JsonResponse
    {
        $request->validate([
            'week_identifier' => 'sometimes|string|regex:/^\d{4}-W\d{2}$/',
            'force_regenerate' => 'sometimes|boolean'
        ]);

        try {
            $user = Auth::user();
            $weekIdentifier = $request->input('week_identifier', Carbon::now()->format('Y-\WW'));
            $forceRegenerate = $request->input('force_regenerate', false);

            Log::info("🎯 Génération objectifs hebdomadaires", [
                'user_id' => $user->id,
                'week_identifier' => $weekIdentifier,
                'force_regenerate' => $forceRegenerate
            ]);

            $project = $user->projects()->where('is_active', true)->first();
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ], 404);
            }

            // Vérifier si objectifs existent déjà
            if (!$forceRegenerate) {
                $existingBlog = WeeklyContentObjective::where([
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier,
                    'content_type' => 'blog'
                ])->first();

                $existingSocial = WeeklyContentObjective::where([
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier,
                    'content_type' => 'social_media'
                ])->first();

                if ($existingBlog && $existingSocial) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Objectifs déjà générés pour cette semaine',
                        'data' => [
                            'blog_objectives' => $existingBlog,
                            'social_objectives' => $existingSocial,
                            'regenerated' => false
                        ]
                    ]);
                }
            } else {
                // Supprimer objectifs existants si force regenerate
                WeeklyContentObjective::where([
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier
                ])->delete();

                Log::info("🔄 Objectifs existants supprimés pour régénération", [
                    'project_id' => $project->id,
                    'week_identifier' => $weekIdentifier
                ]);
            }

            // Générer nouveaux objectifs
            $result = $this->weeklyObjectivesService->generateWeeklyObjectives($project, $weekIdentifier);

            if ($result['success']) {
                Log::info("✅ Objectifs générés avec succès", [
                    'user_id' => $user->id,
                    'week_identifier' => $weekIdentifier,
                    'blog_objectives_count' => count($result['blog_objectives']->objectives),
                    'social_objectives_count' => count($result['social_objectives']->objectives)
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Objectifs générés avec succès',
                    'data' => [
                        'blog_objectives' => $result['blog_objectives'],
                        'social_objectives' => $result['social_objectives'],
                        'regenerated' => $forceRegenerate
                    ]
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Échec de la génération des objectifs',
                    'error' => $result['error']
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération objectifs", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération des objectifs'
            ], 500);
        }
    }

    /**
     * ✅ Générer contenu basé sur objectifs
     */
    public function generateContentFromObjectives(Request $request): JsonResponse
    {
        $request->validate([
            'content_type' => 'required|in:blog,social_media',
            'platform' => 'required_if:content_type,social_media|in:facebook,instagram,twitter,linkedin'
        ]);

        try {
            $user = Auth::user();
            $contentType = $request->input('content_type');
            $platform = $request->input('platform');

            Log::info("🚀 Génération contenu depuis objectifs", [
                'user_id' => $user->id,
                'content_type' => $contentType,
                'platform' => $platform
            ]);

            if ($contentType === 'blog') {
                $result = $this->contentGenerationService->generateBlogContentFromObjectives($user);
            } else {
                $result = $this->contentGenerationService->generateSocialContentFromObjectives($user, $platform);
            }

            if ($result['success']) {
                Log::info("✅ Contenu généré depuis objectifs", [
                    'user_id' => $user->id,
                    'content_type' => $contentType,
                    'title' => isset($result['data']['title']) ? $result['data']['title'] : 'N/A',
                    'source' => $result['data']['generation_context']['source']
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Contenu généré avec succès',
                    'data' => $result['data']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Échec de la génération de contenu',
                    'error' => $result['error']
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération contenu depuis objectifs", [
                'user_id' => Auth::id(),
                'content_type' => $request->input('content_type'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de contenu'
            ], 500);
        }
    }

    /**
     * ✅ Historique des objectifs par semaine
     */
    public function getObjectivesHistory(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $limit = $request->input('limit', 5);

            Log::info("📚 Récupération historique objectifs", [
                'user_id' => $user->id,
                'limit' => $limit
            ]);

            $project = $user->projects()->where('is_active', true)->first();
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ], 404);
            }

            $history = WeeklyContentObjective::where('project_id', $project->id)
                ->orderBy('week_start_date', 'desc')
                ->take($limit * 2) // Blog + Social pour chaque semaine
                ->get()
                ->groupBy('week_identifier')
                ->map(function ($weekObjectives, $weekId) {
                    $objectives = $weekObjectives->keyBy('content_type');

                    return [
                        'week_identifier' => $weekId,
                        'week_dates' => [
                            'start' => $objectives->first()->week_start_date,
                            'end' => $objectives->first()->week_end_date
                        ],
                        'blog_objectives' => isset($objectives['blog']) ? [
                            'id' => $objectives['blog']->id,
                            'objectives' => $objectives['blog']->objectives,
                            'is_generated' => $objectives['blog']->is_generated
                        ] : null,
                        'social_objectives' => isset($objectives['social_media']) ? [
                            'id' => $objectives['social_media']->id,
                            'objectives' => $objectives['social_media']->objectives,
                            'is_generated' => $objectives['social_media']->is_generated
                        ] : null,
                        'created_at' => $objectives->first()->created_at
                    ];
                })
                ->take($limit)
                ->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'history' => $history,
                    'project_id' => $project->id,
                    'total_weeks' => $history->count()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur récupération historique objectifs", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique'
            ], 500);
        }
    }

    /**
     * ✅ Supprimer objectifs d'une semaine
     */
    public function deleteWeekObjectives(Request $request): JsonResponse
    {
        $request->validate([
            'week_identifier' => 'required|string|regex:/^\d{4}-W\d{2}$/'
        ]);

        try {
            $user = Auth::user();
            $weekIdentifier = $request->input('week_identifier');

            Log::info("🗑️ Suppression objectifs semaine", [
                'user_id' => $user->id,
                'week_identifier' => $weekIdentifier
            ]);

            $project = $user->projects()->where('is_active', true)->first();
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ], 404);
            }

            $deleted = WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier
            ])->delete();

            Log::info("✅ Objectifs supprimés", [
                'user_id' => $user->id,
                'week_identifier' => $weekIdentifier,
                'deleted_count' => $deleted
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Objectifs supprimés avec succès',
                'deleted_count' => $deleted
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur suppression objectifs", [
                'user_id' => Auth::id(),
                'week_identifier' => $request->input('week_identifier'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression des objectifs'
            ], 500);
        }
    }

    /**
     * ✅ Statistiques des objectifs
     */
    public function getObjectivesStats(): JsonResponse
    {
        try {
            $user = Auth::user();

            Log::info("📊 Récupération statistiques objectifs", [
                'user_id' => $user->id
            ]);

            $project = $user->projects()->where('is_active', true)->first();
            if (!$project) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun projet actif trouvé'
                ], 404);
            }

            $totalWeeks = WeeklyContentObjective::where('project_id', $project->id)
                ->distinct('week_identifier')
                ->count();

            $totalObjectives = WeeklyContentObjective::where('project_id', $project->id)
                ->count();

            $currentWeek = Carbon::now()->format('Y-\WW');
            $hasCurrentWeek = WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $currentWeek
            ])->exists();

            $lastGenerated = WeeklyContentObjective::where('project_id', $project->id)
                ->latest('created_at')
                ->first();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_weeks_generated' => $totalWeeks,
                    'total_objectives' => $totalObjectives,
                    'current_week_generated' => $hasCurrentWeek,
                    'current_week_identifier' => $currentWeek,
                    'last_generation' => $lastGenerated ? [
                        'week_identifier' => $lastGenerated->week_identifier,
                        'content_type' => $lastGenerated->content_type,
                        'created_at' => $lastGenerated->created_at
                    ] : null,
                    'project_name' => $project->name
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur récupération statistiques objectifs", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }
}
