<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use App\Services\ContentGeneration\NewUserDetectionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class WeeklyPostGenerationController extends Controller
{
    private WeeklyPostGenerationService $weeklyPostGenerationService;
    private NewUserDetectionService $newUserDetectionService;

    public function __construct(
        WeeklyPostGenerationService $weeklyPostGenerationService,
        NewUserDetectionService $newUserDetectionService
    ) {
        $this->middleware('auth:sanctum');
        $this->weeklyPostGenerationService = $weeklyPostGenerationService;
        $this->newUserDetectionService = $newUserDetectionService;
    }

    /**
     * POST /api/posts/generate-weekly - Générer posts hebdomadaires
     */
    public function generateWeeklyPosts(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            Log::info("🚀 Demande génération hebdomadaire", [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            $result = $this->weeklyPostGenerationService->generateWeeklyPosts($user);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Posts hebdomadaires générés avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération hebdomadaire API", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération des posts'
            ], 500);
        }
    }

    /**
     * POST /api/posts/generate-initial - Générer posts initiaux (nouveaux utilisateurs)
     */
    public function generateInitialPosts(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            Log::info("🎯 Demande génération initiale", [
                'user_id' => $user->id,
                'email' => $user->email
            ]);

            $result = $this->weeklyPostGenerationService->generateInitialPosts($user);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Posts initiaux générés avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération initiale API", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération des posts initiaux'
            ], 500);
        }
    }

    /**
     * POST /api/posts/check-first-visit - Vérifier première visite et déclencher génération
     */
    public function checkFirstVisit(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $request->validate([
                'page_type' => 'required|in:blog,social_media'
            ]);

            Log::info("👤 Vérification première visite", [
                'user_id' => $user->id,
                'page_type' => $request->page_type
            ]);

            $result = $this->newUserDetectionService->handleFirstVisit($user, $request->page_type);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Vérification première visite effectuée'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification première visite", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification'
            ], 500);
        }
    }

    // ✅ MÉTHODE SUPPRIMÉE : Duplication avec GenerateWeeklyPostsCommand automatique

    /**
     * GET /api/posts/generation-status - Statut génération utilisateur
     */
    public function getGenerationStatus(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $status = $this->newUserDetectionService->getUserStatus($user);
            $needsGeneration = $this->weeklyPostGenerationService->needsGeneration($user);

            return response()->json([
                'success' => true,
                'data' => [
                    'user_status' => $status,
                    'needs_generation' => $needsGeneration,
                    'can_generate' => true
                ],
                'message' => 'Statut récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur statut génération", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du statut'
            ], 500);
        }
    }

    /**
     * GET /api/posts/posts-needed - Calculer posts nécessaires selon inscription
     */
    public function getPostsNeeded(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            
            $postsNeeded = $this->newUserDetectionService->calculatePostsNeeded($user);
            $registrationAge = $this->newUserDetectionService->getRegistrationAge($user);

            return response()->json([
                'success' => true,
                'data' => [
                    'posts_needed' => $postsNeeded,
                    'registration_age' => $registrationAge,
                    'is_new_user' => $this->newUserDetectionService->isNewUser($user)
                ],
                'message' => 'Calcul posts nécessaires effectué'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur calcul posts nécessaires", [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul'
            ], 500);
        }
    }
}