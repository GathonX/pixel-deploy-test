<?php

namespace App\Http\Controllers\DashboardUser;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\DashboardUser\DashboardUserStatsService;

class DashboardUserStatsController extends Controller
{
    private DashboardUserStatsService $statsService;

    public function __construct(DashboardUserStatsService $statsService)
    {
        $this->statsService = $statsService;
    }

    /**
     * GET /api/dashboard-user/stats - Statistiques dashboard utilisateur
     */
    public function getUserStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur non authentifié'
                ], 401);
            }

            $siteId = $request->get('site_id') ?: null;
            $stats = $this->statsService->generateUserDashboardStats($user, $siteId);

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}