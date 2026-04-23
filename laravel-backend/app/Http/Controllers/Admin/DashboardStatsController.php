<?php
// laravel-backend/app/Http/Controllers/Admin/DashboardStatsController.php
// ✅ VERSION CORRIGÉE - Utilise les vraies données du système actuel

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Ticket;
use App\Models\FeatureActivationRequest;
use App\Models\UserFeatureAccess;
use App\Models\Feature;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardStatsController extends Controller
{
    /**
     * ✅ CORRIGÉ : Retourne les statistiques avec les vraies données financières
     */
    public function index(): JsonResponse
    {
        try {
            Log::info('📊 [DashboardStats] Calcul des statistiques admin avec vraies données...');

            // ===== UTILISATEURS =====
            $totalUsers = User::count();
            $currentMonth = Carbon::now()->startOfMonth();
            $lastMonth = Carbon::now()->subMonth()->startOfMonth();

            $newUsersThisMonth = User::where('created_at', '>=', $currentMonth)->count();
            $newUsersLastMonth = User::whereBetween('created_at', [$lastMonth, $currentMonth])->count();
            $growthUsers = $this->calculateGrowthPercentage($newUsersThisMonth, $newUsersLastMonth);

            // ===== REVENUS RÉELS =====
            // Calcul basé sur les demandes d'activation approuvées
            $totalRevenue = $this->calculateTotalRevenue();
            $monthlyRevenue = $this->calculateMonthlyRevenue($currentMonth);
            $lastMonthRevenue = $this->calculateMonthlyRevenue($lastMonth);
            $growthRevenue = $this->calculateGrowthPercentage($monthlyRevenue, $lastMonthRevenue);

            // ===== SITES/FONCTIONNALITÉS CRÉÉS =====
            // Compter les fonctionnalités activées (représente les "sites créés")
            $sitesCreated = UserFeatureAccess::where('admin_enabled', true)->count();
            $sitesThisMonth = UserFeatureAccess::where('admin_enabled', true)
                ->where('admin_enabled_at', '>=', $currentMonth)
                ->count();
            $sitesLastMonth = UserFeatureAccess::where('admin_enabled', true)
                ->whereBetween('admin_enabled_at', [$lastMonth, $currentMonth])
                ->count();
            $growthSites = $this->calculateGrowthPercentage($sitesThisMonth, $sitesLastMonth);

            // ===== TICKETS SUPPORT =====
            $supportTickets = Ticket::count();
            $ticketsThisMonth = Ticket::where('created_at', '>=', $currentMonth)->count();
            $ticketsLastMonth = Ticket::whereBetween('created_at', [$lastMonth, $currentMonth])->count();
            $growthTickets = $this->calculateGrowthPercentage($ticketsThisMonth, $ticketsLastMonth);

            $stats = [
                // Données de base
                'totalUsers' => $totalUsers,
                'revenue' => round($totalRevenue, 2), // ✅ VRAIES DONNÉES
                'sitesCreated' => $sitesCreated, // ✅ VRAIES DONNÉES
                'supportTickets' => $supportTickets,

                // Croissances calculées
                'growthUsers' => round($growthUsers, 1),
                'growthRevenue' => round($growthRevenue, 1), // ✅ VRAIE CROISSANCE
                'growthSites' => round($growthSites, 1), // ✅ VRAIE CROISSANCE
                'growthTickets' => round($growthTickets, 1),

                // ✅ NOUVELLES DONNÉES DÉTAILLÉES
                'revenue_breakdown' => $this->getRevenueBreakdown(),
                'feature_stats' => $this->getFeatureStats(),
                'user_activity' => $this->getUserActivityStats(),
                'content_stats' => $this->getContentStats(),
            ];

            Log::info('📊 [DashboardStats] Statistiques calculées:', [
                'total_users' => $totalUsers,
                'total_revenue' => $totalRevenue,
                'monthly_revenue' => $monthlyRevenue,
                'sites_created' => $sitesCreated,
                'revenue_growth' => $growthRevenue
            ]);

            return response()->json($stats);

        } catch (\Exception $e) {
            Log::error('❌ [DashboardStats] Erreur calcul statistiques:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Retourner des données par défaut en cas d'erreur
            return response()->json([
                'totalUsers' => User::count(),
                'revenue' => 0,
                'sitesCreated' => 0,
                'supportTickets' => Ticket::count(),
                'growthUsers' => 0,
                'growthRevenue' => 0,
                'growthSites' => 0,
                'growthTickets' => 0,
                'revenue_breakdown' => [],
                'feature_stats' => [],
                'user_activity' => [],
                'content_stats' => []
            ]);
        }
    }

    // ===== MÉTHODES PRIVÉES POUR CALCULS =====

    /**
     * ✅ Calculer le revenu total basé sur les demandes approuvées
     */
    private function calculateTotalRevenue(): float
    {
        return FeatureActivationRequest::where('status', 'approved')
            ->sum('amount_claimed') ?? 0.0;
    }

    /**
     * ✅ Calculer le revenu mensuel
     */
    private function calculateMonthlyRevenue(Carbon $month): float
    {
        $nextMonth = $month->copy()->addMonth();

        return FeatureActivationRequest::where('status', 'approved')
            ->whereBetween('processed_at', [$month, $nextMonth])
            ->sum('amount_claimed') ?? 0.0;
    }

    /**
     * ✅ Calculer le pourcentage de croissance
     */
    private function calculateGrowthPercentage(float $current, float $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return (($current - $previous) / $previous) * 100;
    }

    /**
     * ✅ Détail des revenus par méthode de paiement
     */
    private function getRevenueBreakdown(): array
    {
        try {
            $breakdown = FeatureActivationRequest::where('status', 'approved')
                ->select('payment_method', DB::raw('SUM(amount_claimed) as total'), DB::raw('COUNT(*) as count'))
                ->groupBy('payment_method')
                ->get()
                ->map(function ($item) {
                    return [
                        'method' => $item->payment_method,
                        'total' => round($item->total, 2),
                        'count' => $item->count,
                        'average' => round($item->total / $item->count, 2)
                    ];
                })
                ->toArray();

            return $breakdown;

        } catch (\Exception $e) {
            Log::error('❌ Erreur calcul breakdown revenus:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ Statistiques des fonctionnalités
     */
    private function getFeatureStats(): array
    {
        try {
            $totalFeatures = Feature::where('is_active', true)->count();
            $activatedFeatures = UserFeatureAccess::where('admin_enabled', true)
                ->where('status', 'active')
                ->count();
            $expiredFeatures = UserFeatureAccess::where('status', 'expired')->count();
            $pendingRequests = FeatureActivationRequest::where('status', 'pending')->count();

            // Top fonctionnalités les plus demandées
            $topFeatures = FeatureActivationRequest::select('feature_id', DB::raw('COUNT(*) as requests'))
                ->with('feature:id,name')
                ->groupBy('feature_id')
                ->orderBy('requests', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'name' => $item->feature->name ?? 'Fonctionnalité supprimée',
                        'requests' => $item->requests
                    ];
                })
                ->toArray();

            return [
                'total_features' => $totalFeatures,
                'activated_features' => $activatedFeatures,
                'expired_features' => $expiredFeatures,
                'pending_requests' => $pendingRequests,
                'activation_rate' => $totalFeatures > 0 ? round(($activatedFeatures / $totalFeatures) * 100, 1) : 0,
                'top_requested' => $topFeatures
            ];

        } catch (\Exception $e) {
            Log::error('❌ Erreur stats fonctionnalités:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ Statistiques d'activité utilisateur
     */
    private function getUserActivityStats(): array
    {
        try {
            $activeUsers = User::where('updated_at', '>=', Carbon::now()->subDays(7))->count();
            $payingUsers = FeatureActivationRequest::where('status', 'approved')
                ->distinct('user_id')
                ->count();
            $totalUsers = User::count();

            $conversionRate = $totalUsers > 0 ? round(($payingUsers / $totalUsers) * 100, 1) : 0;

            return [
                'total_users' => $totalUsers,
                'active_users_week' => $activeUsers,
                'paying_users' => $payingUsers,
                'conversion_rate' => $conversionRate,
                'activity_rate' => $totalUsers > 0 ? round(($activeUsers / $totalUsers) * 100, 1) : 0
            ];

        } catch (\Exception $e) {
            Log::error('❌ Erreur stats activité:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ Statistiques de contenu généré
     */
    private function getContentStats(): array
    {
        try {
            $totalBlogPosts = BlogPost::count();
            $totalSocialPosts = SocialMediaPost::count();
            $aiGeneratedBlog = BlogPost::where('is_ai_generated', true)->count();
            $aiGeneratedSocial = SocialMediaPost::where('is_ai_generated', true)->count();

            $totalContent = $totalBlogPosts + $totalSocialPosts;
            $totalAI = $aiGeneratedBlog + $aiGeneratedSocial;
            $aiPercentage = $totalContent > 0 ? round(($totalAI / $totalContent) * 100, 1) : 0;

            // Contenu ce mois
            $currentMonth = Carbon::now()->startOfMonth();
            $blogThisMonth = BlogPost::where('created_at', '>=', $currentMonth)->count();
            $socialThisMonth = SocialMediaPost::where('created_at', '>=', $currentMonth)->count();

            return [
                'total_blog_posts' => $totalBlogPosts,
                'total_social_posts' => $totalSocialPosts,
                'total_content' => $totalContent,
                'ai_generated_percentage' => $aiPercentage,
                'content_this_month' => $blogThisMonth + $socialThisMonth,
                'blog_this_month' => $blogThisMonth,
                'social_this_month' => $socialThisMonth
            ];

        } catch (\Exception $e) {
            Log::error('❌ Erreur stats contenu:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ NOUVEAU : Endpoint pour les statistiques financières détaillées
     * GET /api/admin/dashboard/finance-stats
     */
    public function getFinanceStats(): JsonResponse
    {
        try {
            Log::info('💰 [DashboardStats] Récupération stats financières détaillées...');

            $currentMonth = Carbon::now()->startOfMonth();
            $lastMonth = Carbon::now()->subMonth()->startOfMonth();
            $currentYear = Carbon::now()->startOfYear();

            // Revenus par période
            $totalRevenue = $this->calculateTotalRevenue();
            $monthlyRevenue = $this->calculateMonthlyRevenue($currentMonth);
            $yearlyRevenue = $this->calculateYearlyRevenue($currentYear);
            $lastMonthRevenue = $this->calculateMonthlyRevenue($lastMonth);

            // Statistiques des demandes
            $totalRequests = FeatureActivationRequest::count();
            $approvedRequests = FeatureActivationRequest::where('status', 'approved')->count();
            $pendingRequests = FeatureActivationRequest::where('status', 'pending')->count();
            $rejectedRequests = FeatureActivationRequest::where('status', 'rejected')->count();

            // Moyennes
            $averageAmount = $approvedRequests > 0 ? $totalRevenue / $approvedRequests : 0;
            $approvalRate = $totalRequests > 0 ? ($approvedRequests / $totalRequests) * 100 : 0;

            // Évolution mensuelle (12 derniers mois)
            $monthlyEvolution = $this->getMonthlyRevenueEvolution();

            $financeStats = [
                'total_revenue' => round($totalRevenue, 2),
                'monthly_revenue' => round($monthlyRevenue, 2),
                'yearly_revenue' => round($yearlyRevenue, 2),
                'last_month_revenue' => round($lastMonthRevenue, 2),
                'revenue_growth' => $this->calculateGrowthPercentage($monthlyRevenue, $lastMonthRevenue),

                'total_requests' => $totalRequests,
                'approved_requests' => $approvedRequests,
                'pending_requests' => $pendingRequests,
                'rejected_requests' => $rejectedRequests,
                'approval_rate' => round($approvalRate, 1),

                'average_amount' => round($averageAmount, 2),
                'payment_methods' => $this->getRevenueBreakdown(),
                'monthly_evolution' => $monthlyEvolution,

                'top_features' => $this->getTopFeaturesByRevenue()
            ];

            return response()->json([
                'success' => true,
                'data' => $financeStats,
                'message' => 'Statistiques financières récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('❌ [DashboardStats] Erreur stats financières:', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des statistiques financières'
            ], 500);
        }
    }

    /**
     * ✅ Calculer le revenu annuel
     */
    private function calculateYearlyRevenue(Carbon $year): float
    {
        $nextYear = $year->copy()->addYear();

        return FeatureActivationRequest::where('status', 'approved')
            ->whereBetween('processed_at', [$year, $nextYear])
            ->sum('amount_claimed') ?? 0.0;
    }

    /**
     * ✅ Évolution mensuelle des revenus (12 derniers mois)
     */
    private function getMonthlyRevenueEvolution(): array
    {
        try {
            $evolution = [];

            for ($i = 11; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i)->startOfMonth();
                $revenue = $this->calculateMonthlyRevenue($month);
                $requestsCount = FeatureActivationRequest::where('status', 'approved')
                    ->whereBetween('processed_at', [$month, $month->copy()->addMonth()])
                    ->count();

                $evolution[] = [
                    'month' => $month->format('Y-m'),
                    'month_name' => $month->format('M Y'),
                    'revenue' => round($revenue, 2),
                    'requests' => $requestsCount
                ];
            }

            return $evolution;

        } catch (\Exception $e) {
            Log::error('❌ Erreur évolution mensuelle:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ Top fonctionnalités par revenu généré
     */
    private function getTopFeaturesByRevenue(): array
    {
        try {
            return FeatureActivationRequest::select('feature_id', DB::raw('SUM(amount_claimed) as total_revenue'), DB::raw('COUNT(*) as requests'))
                ->with('feature:id,name,price')
                ->where('status', 'approved')
                ->groupBy('feature_id')
                ->orderBy('total_revenue', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($item) {
                    return [
                        'feature_name' => $item->feature->name ?? 'Fonctionnalité supprimée',
                        'feature_price' => $item->feature->price ?? 0,
                        'total_revenue' => round($item->total_revenue, 2),
                        'requests' => $item->requests,
                        'average_amount' => round($item->total_revenue / $item->requests, 2)
                    ];
                })
                ->toArray();

        } catch (\Exception $e) {
            Log::error('❌ Erreur top features:', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * ✅ NOUVEAU : Récupérer toutes les transactions
     * GET /api/admin/finance/transactions
     */
    public function getTransactions(): JsonResponse
    {
        try {
            Log::info('💳 [DashboardStats] Récupération des transactions...');

            $transactions = FeatureActivationRequest::with(['user:id,name', 'feature:id,name'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($request) {
                    return [
                        'id' => $request->id,
                        'user_id' => $request->user_id,
                        'user_name' => $request->user->name ?? 'Utilisateur inconnu',
                        'feature_name' => $request->feature->name ?? 'Fonctionnalité supprimée',
                        'amount_claimed' => round($request->amount_claimed, 2),
                        'payment_method' => $request->payment_method,
                        'status' => $request->status,
                        'payment_proof' => $request->payment_proof,
                        'processed_at' => $request->processed_at ? $request->processed_at->toISOString() : null,
                        'created_at' => $request->created_at->toISOString(),
                    ];
                });

            Log::info('💳 [DashboardStats] Transactions récupérées:', [
                'count' => $transactions->count()
            ]);

            return response()->json([
                'success' => true,
                'data' => $transactions,
                'message' => 'Transactions récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('❌ [DashboardStats] Erreur récupération transactions:', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des transactions'
            ], 500);
        }
    }
}
