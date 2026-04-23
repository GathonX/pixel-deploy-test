<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AdminProjectInfo;
use App\Models\AdminWeeklyObjective;
use App\Models\BlogPost;
use App\Services\ContentGeneration\AdminObjectiveGenerationService;
use App\Services\ContentGeneration\AdminPostGenerationService;
use App\Jobs\GenerateAdminWeeklyPostsJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class AdminContentGenerationController extends Controller
{
    private AdminObjectiveGenerationService $objectiveService;
    private AdminPostGenerationService $postService;

    public function __construct(
        AdminObjectiveGenerationService $objectiveService,
        AdminPostGenerationService $postService
    ) {
        $this->objectiveService = $objectiveService;
        $this->postService = $postService;
    }

    /**
     * ✅ Récupérer les informations projet admin
     */
    public function getProjectInfo(Request $request)
    {
        try {
            $user = Auth::user();

            $projectInfo = AdminProjectInfo::where('user_id', $user->id)->first();

            return response()->json([
                'success' => true,
                'data' => $projectInfo
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération project info admin', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations'
            ], 500);
        }
    }

    /**
     * ✅ Créer ou mettre à jour les informations projet admin
     */
    public function saveProjectInfo(Request $request)
    {
        try {
            $user = Auth::user();

            $validated = $request->validate([
                'business_name' => 'nullable|string|max:255',
                'business_description' => 'nullable|string',
                'business_ideas' => 'nullable|array',
                'target_audience' => 'nullable|array',
                'keywords' => 'nullable|array',
                'industry' => 'nullable|string|max:100',
                'content_goals' => 'nullable|string',
                'tone_of_voice' => 'nullable|string|max:50',
                'content_themes' => 'nullable|array',
                'auto_generation_enabled' => 'nullable|boolean',
                'posts_per_week' => 'nullable|integer|min:1|max:7'
            ]);

            $projectInfo = AdminProjectInfo::updateOrCreate(
                ['user_id' => $user->id],
                $validated
            );

            Log::info('✅ Admin project info sauvegardé', [
                'admin_id' => $user->id,
                'project_info_id' => $projectInfo->id
            ]);

            return response()->json([
                'success' => true,
                'data' => $projectInfo,
                'message' => 'Informations sauvegardées avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur sauvegarde project info admin', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la sauvegarde'
            ], 500);
        }
    }

    /**
     * ✅ Récupérer l'objectif de la semaine courante
     */
    public function getCurrentWeekObjective(Request $request)
    {
        try {
            $user = Auth::user();

            $projectInfo = AdminProjectInfo::where('user_id', $user->id)->first();

            if (!$projectInfo) {
                return response()->json([
                    'success' => true,
                    'data' => null
                ]);
            }

            $objective = $projectInfo->getCurrentWeekObjective();

            return response()->json([
                'success' => true,
                'data' => $objective
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération objectif courant', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'objectif'
            ], 500);
        }
    }

    /**
     * ✅ Générer l'objectif hebdomadaire
     */
    public function generateWeeklyObjective(Request $request)
    {
        try {
            $user = Auth::user();

            $projectInfo = AdminProjectInfo::where('user_id', $user->id)->first();

            if (!$projectInfo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous devez d\'abord configurer vos informations projet'
                ], 400);
            }

            $result = $this->objectiveService->generateWeeklyObjective($projectInfo);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Erreur lors de la génération'
                ], 500);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Objectif généré avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur génération objectif hebdomadaire', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de l\'objectif'
            ], 500);
        }
    }

    /**
     * ✅ Générer les posts hebdomadaires admin (PROGRESSIF: 1er post immédiat + reste en arrière-plan)
     */
    public function generateWeeklyPosts(Request $request)
    {
        try {
            $user = Auth::user();

            // Vérifier si une génération est déjà en cours
            $currentStatus = Cache::get("admin_generation_status_{$user->id}");
            if ($currentStatus && $currentStatus['status'] === 'processing') {
                return response()->json([
                    'success' => false,
                    'message' => 'Une génération est déjà en cours',
                    'status' => $currentStatus
                ], 409);
            }

            // Générer un job_id unique pour le polling
            $jobId = uniqid('admin_gen_', true);

            // Marquer comme en cours
            Cache::put("admin_generation_status_{$user->id}", [
                'status' => 'processing',
                'progress' => 0,
                'current_step' => 'Préparation de la génération...',
                'message' => 'Génération en cours...',
                'started_at' => now()->toIso8601String(),
                'job_id' => $jobId
            ], 600);

            // Stocker le statut du job également
            Cache::put("admin_job_status_{$jobId}", [
                'status' => 'processing',
                'progress' => 0,
                'current_step' => 'Génération du premier post...',
            ], 600);

            Log::info('🚀 [ADMIN POSTS] Démarrage génération progressive', [
                'user_id' => $user->id,
                'job_id' => $jobId
            ]);

            // 🎯 GÉNÉRER LE PREMIER POST IMMÉDIATEMENT (synchrone)
            $firstPostResult = $this->postService->generateFirstAdminPost($user);

            if (!$firstPostResult['success']) {
                // Échec du premier post
                Cache::put("admin_generation_status_{$user->id}", [
                    'status' => 'failed',
                    'progress' => 0,
                    'message' => 'Échec génération du premier post',
                    'error' => $firstPostResult['error']
                ], 600);

                Cache::put("admin_job_status_{$jobId}", [
                    'status' => 'failed',
                    'progress' => 0,
                    'error' => $firstPostResult['error']
                ], 600);

                return response()->json([
                    'success' => false,
                    'message' => $firstPostResult['error']
                ], 500);
            }

            // ✅ Premier post créé avec succès
            $firstPost = $firstPostResult['data'];

            // Mettre à jour la progression
            Cache::put("admin_generation_status_{$user->id}", [
                'status' => 'processing',
                'progress' => 15, // 1/7 posts ≈ 14%
                'current_step' => 'Lancement génération des 6 posts restants...',
                'first_post_id' => $firstPost->id,
                'message' => 'Premier post créé avec succès'
            ], 600);

            Cache::put("admin_job_status_{$jobId}", [
                'status' => 'processing',
                'progress' => 15,
                'current_step' => 'Génération des posts restants en arrière-plan...',
                'first_post' => [
                    'id' => $firstPost->id,
                    'title' => $firstPost->title,
                    'status' => $firstPost->status
                ]
            ], 600);

            // 🚀 LANCER LES 6 POSTS RESTANTS EN ARRIÈRE-PLAN
            try {
                // Tenter de dispatcher le job pour les posts restants
                GenerateAdminWeeklyPostsJob::dispatch($user->id, true); // true = skip first day

                Log::info('✅ [ADMIN POSTS] Job async lancé pour posts restants', [
                    'user_id' => $user->id,
                    'first_post_id' => $firstPost->id
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Premier post créé, génération des suivants en cours',
                    'status' => 'processing',
                    'job_id' => $jobId,
                    'data' => [
                        'first_post' => [
                            'id' => $firstPost->id,
                            'title' => $firstPost->title,
                            'summary' => $firstPost->summary,
                            'status' => $firstPost->status,
                            'published_at' => $firstPost->published_at
                        ]
                    ]
                ]);

            } catch (\Exception $queueError) {
                // Si le queue ne fonctionne pas, exécution synchrone
                Log::warning('⚠️ [ADMIN POSTS] Queue indisponible, exécution synchrone', [
                    'user_id' => $user->id,
                    'queue_error' => $queueError->getMessage()
                ]);

                // Exécution synchrone
                $result = $this->postService->generateWeeklyPostsForAdmin($user);

                if ($result['success']) {
                    Cache::put("admin_generation_status_{$user->id}", [
                        'status' => 'completed',
                        'progress' => 100,
                        'message' => "{$result['data']['posts_count']} post(s) généré(s) avec succès",
                        'posts_count' => $result['data']['posts_count'],
                        'completed_at' => now()->toIso8601String()
                    ], 600);

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'posts_count' => $result['data']['posts_count'],
                            'objective' => $result['data']['objective']
                        ],
                        'message' => "{$result['data']['posts_count']} post(s) généré(s) avec succès"
                    ]);
                } else {
                    Cache::put("admin_generation_status_{$user->id}", [
                        'status' => 'failed',
                        'progress' => 0,
                        'message' => $result['error'] ?? 'Erreur lors de la génération',
                        'failed_at' => now()->toIso8601String()
                    ], 600);

                    return response()->json([
                        'success' => false,
                        'message' => $result['error'] ?? 'Erreur lors de la génération'
                    ], 500);
                }
            }

        } catch (\Exception $e) {
            Cache::put("admin_generation_status_{$user->id}", [
                'status' => 'failed',
                'progress' => 0,
                'message' => 'Erreur: ' . $e->getMessage(),
                'failed_at' => now()->toIso8601String()
            ], 600);

            Log::error('Erreur génération posts admin', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération'
            ], 500);
        }
    }

    /**
     * 🎯 Endpoint de polling pour suivre la progression (format compatible avec ProgressiveLoadingModal)
     */
    public function getJobStatus(Request $request)
    {
        try {
            $jobId = $request->query('job_id');

            if (!$jobId) {
                return response()->json([
                    'success' => false,
                    'message' => 'job_id manquant'
                ], 400);
            }

            // Récupérer le statut du job
            $jobStatus = Cache::get("admin_job_status_{$jobId}");

            if (!$jobStatus) {
                return response()->json([
                    'success' => false,
                    'message' => 'Job introuvable',
                    'status' => 'not_found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'status' => $jobStatus['status'],
                'progress' => $jobStatus['progress'] ?? 0,
                'current_step' => $jobStatus['current_step'] ?? null,
                'result' => $jobStatus['result'] ?? null,
                'error' => $jobStatus['error'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération statut job admin', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du statut'
            ], 500);
        }
    }

    /**
     * ✅ Vérifier le statut de la génération asynchrone
     */
    public function checkGenerationProgress(Request $request)
    {
        try {
            $user = Auth::user();

            $status = Cache::get("admin_generation_status_{$user->id}");

            if (!$status) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'status' => 'idle',
                        'progress' => 0,
                        'message' => 'Aucune génération en cours'
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur vérification progression génération', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification'
            ], 500);
        }
    }

    /**
     * ✅ Vérifier l'état de génération
     */
    public function getGenerationStatus(Request $request)
    {
        try {
            $user = Auth::user();

            $projectInfo = AdminProjectInfo::where('user_id', $user->id)->first();
            $hasProjectInfo = $projectInfo !== null;

            $hasObjectiveThisWeek = false;
            $postsGeneratedThisWeek = 0;

            if ($projectInfo) {
                $hasObjectiveThisWeek = $projectInfo->hasObjectiveThisWeek();

                // Compter les posts générés cette semaine
                $weekIdentifier = now()->format('Y-W');
                $objective = AdminWeeklyObjective::where('admin_project_info_id', $projectInfo->id)
                    ->where('week_identifier', $weekIdentifier)
                    ->first();

                if ($objective) {
                    $postsGeneratedThisWeek = $objective->posts_generated_count;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'has_project_info' => $hasProjectInfo,
                    'has_objective_this_week' => $hasObjectiveThisWeek,
                    'posts_generated_this_week' => $postsGeneratedThisWeek,
                    'can_generate' => $hasProjectInfo && $hasObjectiveThisWeek
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur vérification état génération', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification'
            ], 500);
        }
    }
}
