<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\FollowService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class FollowController extends Controller
{
    protected FollowService $followService;

    public function __construct(FollowService $followService)
    {
        $this->followService = $followService;
        $this->middleware('auth:sanctum');
    }

    /**
     * Suivre/Ne plus suivre un utilisateur
     */
    public function toggle(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id'
        ]);

        $currentUserId = Auth::id();
        $targetUserId = $request->user_id;

        try {
            $result = $this->followService->toggleFollow($currentUserId, $targetUserId);

            return response()->json([
                'success' => true,
                'message' => $result['action'] === 'followed' 
                    ? 'Utilisateur suivi avec succès' 
                    : 'Utilisateur retiré de vos abonnements',
                'data' => $result
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'action'
            ], 500);
        }
    }

    /**
     * Vérifier si l'utilisateur connecté suit un autre utilisateur
     */
    public function checkStatus(int $userId): JsonResponse
    {
        $currentUserId = Auth::id();

        try {
            $status = $this->followService->getFollowStatus($currentUserId, $userId);

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification'
            ], 500);
        }
    }

    /**
     * Obtenir la liste des utilisateurs suivis par l'utilisateur connecté
     */
    public function following(Request $request): JsonResponse
    {
        $currentUserId = Auth::id();
        $limit = $request->get('limit', 50);

        try {
            $following = $this->followService->getFollowingWithMutualStatus($currentUserId);

            return response()->json([
                'success' => true,
                'data' => [
                    'following' => $following,
                    'total' => count($following)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération'
            ], 500);
        }
    }

    /**
     * Obtenir la liste des followers de l'utilisateur connecté
     */
    public function followers(Request $request): JsonResponse
    {
        $currentUserId = Auth::id();
        $limit = $request->get('limit', 50);

        try {
            $followers = $this->followService->getFollowers($currentUserId, $limit);

            return response()->json([
                'success' => true,
                'data' => [
                    'followers' => $followers,
                    'total' => count($followers)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération'
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques de follow de l'utilisateur connecté
     */
    public function stats(): JsonResponse
    {
        $currentUserId = Auth::id();

        try {
            $stats = $this->followService->getUserFollowStats($currentUserId);

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
     * Obtenir les utilisateurs suggérés à suivre
     */
    public function suggestions(Request $request): JsonResponse
    {
        $currentUserId = Auth::id();
        $limit = $request->get('limit', 10);

        try {
            $suggestions = $this->followService->getSuggestedUsers($currentUserId, $limit);

            return response()->json([
                'success' => true,
                'data' => [
                    'suggestions' => $suggestions,
                    'total' => count($suggestions)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des suggestions'
            ], 500);
        }
    }

    /**
     * Obtenir les informations de follow pour plusieurs utilisateurs
     */
    public function batchStatus(Request $request): JsonResponse
    {
        $request->validate([
            'user_ids' => 'required|array|max:100',
            'user_ids.*' => 'integer|exists:users,id'
        ]);

        $currentUserId = Auth::id();
        $userIds = $request->user_ids;

        try {
            $statuses = [];
            
            foreach ($userIds as $userId) {
                $statuses[$userId] = $this->followService->getFollowStatus($currentUserId, $userId);
            }

            return response()->json([
                'success' => true,
                'data' => $statuses
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la vérification'
            ], 500);
        }
    }
}