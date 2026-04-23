<?php

namespace App\Services\AgentIntelligent;

use App\Models\User;
use App\Models\Project;
use App\Models\IntelligentAgent;
use App\Models\BookingReservation;
use App\Models\BookingProduct;
use App\Models\UserSite;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AgentContextService
{
    protected User $user;
    protected ?IntelligentAgent $agent;
    public function __construct(User $user)
    {
        $this->user = $user;
        $this->agent = $user->intelligentAgent;
    }

    /**
     * Obtenir le contexte global complet de l'utilisateur
     * ✅ ACCÈS COMPLET À TOUTES LES DONNÉES BUSINESS
     */
    public function getGlobalContext(): array
    {
        return Cache::remember("agent_context_{$this->user->id}", 900, function () {
            return [
                // ===== PROFIL UTILISATEUR =====
                'user_profile'         => $this->getUserProfile(),
                'preferences'          => $this->getUserPreferences(),

                // ===== WORKSPACE & PLANS =====
                'workspace_context'    => $this->getWorkspaceContext(),

                // 🏨 BOOKING & HÉBERGEMENT (cœur du produit)
                'booking_context'      => $this->getBookingContext(),

                // 🌐 SITE BUILDER
                'site_builder_context' => $this->getSiteBuilderContext(),

                // 🌍 DOMAINES (Studio Domaine)
                'domain_context'       => $this->getDomainContext(),

                // 🛒 MARKETPLACE
                'marketplace_context'  => $this->getMarketplaceContext(),

                // 💳 CRÉDITS & FACTURATION
                'credits_context'      => $this->getCreditsContext(),
                'billing_context'      => $this->getBillingContext(),

                // 🎫 SUPPORT / TICKETS
                'support_analytics'    => $this->getSupportAnalyticsContext(),

                // 🤖 AGENT INTELLIGENCE
                'agent_learning'       => $this->getAgentLearningContext(),
                'interaction_history'  => $this->getInteractionHistoryContext(),
            ];
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🏨  CONTEXTE BOOKING
    // ─────────────────────────────────────────────────────────────────────────

    public function getBookingContext(): array
    {
        try {
            // Sites appartenant à l'utilisateur via ses workspaces
            $workspaceIds = Workspace::where('owner_user_id', $this->user->id)->pluck('id');
            $siteIds = UserSite::whereIn('workspace_id', $workspaceIds)->pluck('id');

            if ($siteIds->isEmpty()) {
                return ['has_booking' => false];
            }

            $today    = Carbon::today()->toDateString();
            $tomorrow = Carbon::tomorrow()->toDateString();
            $in7days  = Carbon::today()->addDays(7)->toDateString();

            $all = BookingReservation::whereIn('site_id', $siteIds)->get();

            // Check-ins aujourd'hui
            $checkinsToday = $all->where('start_date', $today)
                ->whereIn('status', ['confirmed', 'pending'])
                ->values();

            // Check-outs aujourd'hui
            $checkoutsToday = $all->where('end_date', $today)
                ->where('status', 'checked_in')
                ->values();

            // En attente de confirmation (> 30 min)
            $pendingConfirmation = $all->where('status', 'pending')
                ->filter(fn($r) => Carbon::parse($r->created_at)->lt(now()->subMinutes(30)))
                ->values();

            // Séjours dépassés non clôturés
            $overdueCheckouts = $all->where('status', 'checked_in')
                ->filter(fn($r) => $r->end_date < $today)
                ->values();

            // Arrivées dans les 7 prochains jours
            $upcoming = $all->filter(fn($r) =>
                $r->start_date >= $today && $r->start_date <= $in7days
                && in_array($r->status, ['confirmed', 'pending'])
            )->values();

            // Taux d'occupation par site
            $activeReservations = $all->whereIn('status', ['confirmed', 'checked_in'])->count();
            $totalProducts = BookingProduct::whereIn('site_id', $siteIds)->count();

            // Revenus booking ce mois
            $monthRevenue = $all->where('status', '!=', 'cancelled')
                ->filter(fn($r) => Carbon::parse($r->created_at)->isCurrentMonth())
                ->sum(fn($r) => ($r->product?->price ?? 0) * $r->adults
                    * max(1, Carbon::parse($r->start_date)->diffInDays(Carbon::parse($r->end_date))));

            return [
                'has_booking'           => true,
                'total_sites'           => $siteIds->count(),
                'total_reservations'    => $all->count(),
                'active_reservations'   => $activeReservations,
                'total_products'        => $totalProducts,
                'monthly_revenue'       => round($monthRevenue),

                'checkins_today'        => $checkinsToday->count(),
                'checkins_today_list'   => $checkinsToday->map(fn($r) => [
                    'id'           => $r->id,
                    'client'       => $r->client_name,
                    'status'       => $r->status,
                    'product_id'   => $r->product_id,
                ])->toArray(),

                'checkouts_today'       => $checkoutsToday->count(),
                'checkouts_today_list'  => $checkoutsToday->map(fn($r) => [
                    'id'     => $r->id,
                    'client' => $r->client_name,
                ])->toArray(),

                'pending_confirmations' => $pendingConfirmation->count(),
                'pending_list'          => $pendingConfirmation->map(fn($r) => [
                    'id'         => $r->id,
                    'client'     => $r->client_name,
                    'since'      => $r->created_at,
                    'start_date' => $r->start_date,
                ])->toArray(),

                'overdue_checkouts'     => $overdueCheckouts->count(),
                'overdue_list'          => $overdueCheckouts->map(fn($r) => [
                    'id'       => $r->id,
                    'client'   => $r->client_name,
                    'end_date' => $r->end_date,
                ])->toArray(),

                'upcoming_7days'        => $upcoming->count(),
                'status_breakdown'      => $all->groupBy('status')
                    ->map->count()->toArray(),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getBookingContext failed: ' . $e->getMessage());
            return ['has_booking' => false, 'error' => $e->getMessage()];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🌐  CONTEXTE SITE BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    public function getSiteBuilderContext(): array
    {
        try {
            $workspaceIds = Workspace::where('owner_user_id', $this->user->id)->pluck('id');
            $sites = UserSite::whereIn('workspace_id', $workspaceIds)->get();

            if ($sites->isEmpty()) {
                return ['has_sites' => false];
            }

            return [
                'has_sites'     => true,
                'total_sites'   => $sites->count(),
                'published'     => $sites->where('status', 'published')->count(),
                'draft'         => $sites->where('status', 'draft')->count(),
                'sites_list'    => $sites->map(fn($s) => [
                    'id'         => $s->id,
                    'name'       => $s->name,
                    'status'     => $s->status,
                    'template'   => $s->template_id ?? 'luxios-hotel',
                    'plan'       => $s->effective_plan_key ?? 'draft',
                    'updated_at' => $s->updated_at,
                ])->toArray(),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getSiteBuilderContext failed: ' . $e->getMessage());
            return ['has_sites' => false];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🏢  CONTEXTE WORKSPACE
    // ─────────────────────────────────────────────────────────────────────────

    public function getWorkspaceContext(): array
    {
        try {
            $workspace = Workspace::where('owner_user_id', $this->user->id)
                ->whereNotIn('status', ['deleted', 'pending_deletion'])
                ->first();

            if (!$workspace) {
                return ['has_workspace' => false];
            }

            $members = \App\Models\WorkspaceUser::where('workspace_id', $workspace->id)->get();
            $subscription = \App\Models\WorkspaceSubscription::where('workspace_id', $workspace->id)
                ->where('status', 'active')
                ->first();

            return [
                'has_workspace'  => true,
                'workspace_id'   => $workspace->id,
                'workspace_name' => $workspace->name,
                'status'         => $workspace->status,
                'plan'           => $subscription?->plan_key ?? 'free',
                'members_count'  => $members->count(),
                'members'        => $members->map(fn($m) => [
                    'user_id' => $m->user_id,
                    'role'    => $m->role,
                ])->toArray(),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getWorkspaceContext failed: ' . $e->getMessage());
            return ['has_workspace' => false];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🌍  CONTEXTE DOMAINES (Studio Domaine)
    // ─────────────────────────────────────────────────────────────────────────

    public function getDomainContext(): array
    {
        try {
            $workspaceIds = Workspace::where('owner_user_id', $this->user->id)->pluck('id');
            $siteIds = UserSite::whereIn('workspace_id', $workspaceIds)->pluck('id');

            $domains = \App\Models\SiteDomain::whereIn('site_id', $siteIds)->get();
            $studioRequests = \App\Models\StudioRequest::where('user_id', $this->user->id)->get();

            return [
                'has_domains'      => $domains->isNotEmpty(),
                'total_domains'    => $domains->count(),
                'active_domains'   => $domains->where('status', 'active')->count(),
                'domains_list'     => $domains->map(fn($d) => [
                    'id'      => $d->id,
                    'domain'  => $d->domain,
                    'status'  => $d->status,
                    'site_id' => $d->site_id,
                ])->toArray(),
                'studio_requests'        => $studioRequests->count(),
                'pending_studio_requests' => $studioRequests->where('status', 'pending')->count(),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getDomainContext failed: ' . $e->getMessage());
            return ['has_domains' => false];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🛒  CONTEXTE MARKETPLACE
    // ─────────────────────────────────────────────────────────────────────────

    public function getMarketplaceContext(): array
    {
        try {
            $workspaceIds = Workspace::where('owner_user_id', $this->user->id)->pluck('id');
            $siteIds = UserSite::whereIn('workspace_id', $workspaceIds)->pluck('id');

            $products = \App\Models\MarketplaceProduct::whereIn('site_id', $siteIds)->get();
            $orders   = \App\Models\MarketplaceOrder::whereIn('site_id', $siteIds)->get();

            $monthRevenue = $orders
                ->filter(fn($o) => $o->status === 'completed' && Carbon::parse($o->created_at)->isCurrentMonth())
                ->sum('total_amount');

            return [
                'has_marketplace'     => $products->isNotEmpty(),
                'total_products'      => $products->count(),
                'active_products'     => $products->where('status', 'active')->count(),
                'total_orders'        => $orders->count(),
                'pending_orders'      => $orders->where('status', 'pending')->count(),
                'monthly_revenue'     => round($monthRevenue, 2),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getMarketplaceContext failed: ' . $e->getMessage());
            return ['has_marketplace' => false];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  💳  CONTEXTE CRÉDITS
    // ─────────────────────────────────────────────────────────────────────────

    public function getCreditsContext(): array
    {
        try {
            $balance = \App\Models\CreditTransaction::where('user_id', $this->user->id)
                ->sum('amount'); // positif = ajout, négatif = dépense

            $lastTransactions = \App\Models\CreditTransaction::where('user_id', $this->user->id)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return [
                'balance'          => $balance,
                'last_transactions' => $lastTransactions->map(fn($t) => [
                    'amount'      => $t->amount,
                    'type'        => $t->type,
                    'description' => $t->description,
                    'created_at'  => $t->created_at,
                ])->toArray(),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getCreditsContext failed: ' . $e->getMessage());
            return ['balance' => 0];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🧾  CONTEXTE FACTURATION
    // ─────────────────────────────────────────────────────────────────────────

    public function getBillingContext(): array
    {
        try {
            $invoices = \App\Models\BillingInvoice::where('user_id', $this->user->id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return [
                'total_invoices'   => $invoices->count(),
                'paid_invoices'    => $invoices->where('status', 'paid')->count(),
                'pending_invoices' => $invoices->where('status', 'pending')->count(),
                'total_paid'       => $invoices->where('status', 'paid')->sum('amount'),
            ];
        } catch (\Exception $e) {
            Log::warning('[AgentContext] getBillingContext failed: ' . $e->getMessage());
            return ['total_invoices' => 0];
        }
    }

    /**
     * Contexte spécifique à une page
     */
    public function getPageContext(string $page, array $params = []): array
    {
        // ✅ NE PAS recharger le contexte global (déjà chargé avant)
        $pageSpecific = match($page) {
            'dashboard'    => ['page' => 'dashboard',    'type' => 'overview'],
            'booking'      => ['page' => 'booking',      'type' => 'reservations'],
            'site-builder' => ['page' => 'site-builder', 'type' => 'editor'],
            'marketplace'  => ['page' => 'marketplace',  'type' => 'shop'],
            'domains'      => ['page' => 'domains',      'type' => 'domain-management'],
            'workspace'    => ['page' => 'workspace',    'type' => 'team'],
            'settings'     => ['page' => 'settings',     'type' => 'configuration'],
            'calendar'     => ['page' => 'calendar',     'type' => 'scheduling'],
            'tickets'      => ['page' => 'tickets',      'type' => 'support'],
            default        => ['page' => $page,          'type' => 'general']
        };

        return ['page_context' => $pageSpecific];
    }

    /**
     * Profil utilisateur détaillé
     */
    protected function getUserProfile(): array
    {
        return [
            'id' => $this->user->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'created_at' => $this->user->created_at,
            'timezone' => $this->user->timezone ?? 'UTC',
            'subscription' => $this->getUserSubscription(),
            'tier' => $this->getUserTier(),
            'last_active' => $this->user->last_login_at,
            'session_count' => $this->getSessionCount(),
            'engagement_score' => $this->calculateEngagementScore(),
        ];
    }

    /**
     * Contexte des projets
     */
    protected function getProjectsContext(): array
    {
        $projects = $this->user->projects()->get();

        return [
            'total_count' => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'completed_projects' => $projects->where('status', 'completed')->count(),
            'projects_by_category' => $projects->groupBy('category')->map->count(),
            'recent_activity' => $this->getRecentProjectActivity(),
            'completion_rate' => $this->calculateProjectCompletionRate(),
            'current_focus' => $this->getCurrentProjectFocus(),
            'upcoming_deadlines' => $this->getUpcomingDeadlines(),
        ];
    }

    /**
     * Contexte des fonctionnalités
     */
    protected function getFeaturesContext(): array
    {
        return [
            'active_features' => $this->getActiveFeatures(),
            'inactive_features' => $this->getInactiveFeatures(),
            'feature_usage' => $this->getFeatureUsageStats(),
            'untested_features' => $this->getUntestedFeatures(),
            'premium_features_available' => $this->getAvailablePremiumFeatures(),
            'usage_trends' => $this->getFeatureUsageTrends(),
        ];
    }

    /**
     * Contexte d'activité utilisateur
     */
    protected function getActivityContext(): array
    {
        return [
            'daily_activity' => $this->getDailyActivity(),
            'weekly_pattern' => $this->getWeeklyPattern(),
            'most_used_features' => $this->getMostUsedFeatures(),
            'session_duration_avg' => $this->getAverageSessionDuration(),
            'peak_usage_hours' => $this->getPeakUsageHours(),
            'recent_actions' => $this->getRecentActions(),
            'interaction_frequency' => $this->getInteractionFrequency(),
        ];
    }

    /**
     * Contexte de performance
     */
    protected function getPerformanceContext(): array
    {
        return [
            'goals_progress' => $this->getGoalsProgress(),
            'productivity_metrics' => $this->getProductivityMetrics(),
            'efficiency_score' => $this->calculateEfficiencyScore(),
            'improvement_areas' => $this->identifyImprovementAreas(),
            'success_patterns' => $this->identifySuccessPatterns(),
            'benchmarks' => $this->getBenchmarkComparisons(),
        ];
    }

    /**
     * Objectifs utilisateur
     */
    protected function getGoalsContext(): array
    {
        return [
            'short_term_goals' => $this->getShortTermGoals(),
            'long_term_goals' => $this->getLongTermGoals(),
            'goal_categories' => $this->getGoalCategories(),
            'achievement_rate' => $this->calculateAchievementRate(),
            'overdue_goals' => $this->getOverdueGoals(),
            'goal_dependencies' => $this->getGoalDependencies(),
        ];
    }

    /**
     * Préférences utilisateur
     */
    protected function getUserPreferences(): array
    {
        return [
            'communication_style' => $this->user->communication_preferences ?? 'professional',
            'notification_settings' => $this->getNotificationSettings(),
            'interface_preferences' => $this->getInterfacePreferences(),
            'working_hours' => $this->getWorkingHours(),
            'priorities' => $this->getUserPriorities(),
            'learning_style' => $this->identifyLearningStyle(),
        ];
    }

    /**
     * Contexte de navigation
     */
    protected function getNavigationContext(): array
    {
        return [
            'most_visited_pages' => $this->getMostVisitedPages(),
            'navigation_patterns' => $this->getNavigationPatterns(),
            'time_spent_per_section' => $this->getTimePerSection(),
            'bounce_pages' => $this->getBouncePages(),
            'workflow_sequences' => $this->identifyWorkflowSequences(),
        ];
    }

    /**
     * Patterns d'utilisation
     */
    protected function getUsagePatterns(): array
    {
        return [
            'peak_days' => $this->getPeakUsageDays(),
            'seasonal_trends' => $this->getSeasonalTrends(),
            'feature_adoption_rate' => $this->getFeatureAdoptionRate(),
            'user_journey_stage' => $this->identifyUserJourneyStage(),
            'engagement_trends' => $this->getEngagementTrends(),
            'churn_risk_indicators' => $this->getChurnRiskIndicators(),
        ];
    }

    /**
     * Identifier les opportunités
     */
    protected function identifyOpportunities(): array
    {
        return [
            'unused_features' => $this->identifyUnusedFeatures(),
            'optimization_opportunities' => $this->identifyOptimizationOpportunities(),
            'upgrade_opportunities' => $this->identifyUpgradeOpportunities(),
            'collaboration_opportunities' => $this->identifyCollaborationOpportunities(),
            'automation_opportunities' => $this->identifyAutomationOpportunities(),
            'learning_opportunities' => $this->identifyLearningOpportunities(),
        ];
    }

    /**
     * Contexte spécifique au dashboard
     */
    protected function getDashboardContext(): array
    {
        return [
            'widgets_configuration' => $this->getWidgetsConfiguration(),
            'key_metrics' => $this->getKeyMetrics(),
            'alerts' => $this->getActiveAlerts(),
            'quick_actions' => $this->getQuickActions(),
            'recent_notifications' => $this->getRecentNotifications(),
        ];
    }

    /**
     * Méthodes utilitaires pour calculer des métriques
     */
    protected function getUserSubscription(): ?array
    {
        // À implémenter selon le système d'abonnement
        return null;
    }

    protected function getUserTier(): string
    {
        return app(UserTierService::class)->determineUserTier($this->user);
    }

    protected function getSessionCount(): int
    {
        return DB::table('sessions')
            ->where('user_id', $this->user->id)
            ->count();
    }

    protected function calculateEngagementScore(): float
    {
        // Algorithme de calcul d'engagement basé sur l'activité
        $factors = [
            'login_frequency' => $this->getLoginFrequency() * 0.3,
            'feature_usage' => $this->getFeatureUsageScore() * 0.4,
            'goal_completion' => $this->getGoalCompletionScore() * 0.3,
        ];

        return array_sum($factors);
    }

    protected function getRecentProjectActivity(): array
    {
        // Utiliser les projects récemment modifiés comme proxy pour l'activité
        return DB::table('projects')
            ->where('user_id', $this->user->id)
            ->where('updated_at', '>=', Carbon::now()->subDays(7))
            ->orderBy('updated_at', 'desc')
            ->limit(10)
            ->get()
            ->toArray();
    }

    protected function getActiveFeatures(): array
    {
        // Retourner les fonctionnalités actives selon le tier et l'abonnement
        $tierService = app(UserTierService::class);
        return $tierService->getTierCapabilities($this->getUserTier());
    }

    protected function getInactiveFeatures(): array
    {
        $activeFeatures = $this->getActiveFeatures();
        $allFeatures = [
            'booking', 'site_builder', 'marketplace', 'domains',
            'workspace', 'calendar', 'tickets', 'credits',
        ];

        return array_diff($allFeatures, array_keys($activeFeatures));
    }

    protected function getLoginFrequency(): float
    {
        // Utiliser les sessions comme proxy pour les connexions
        $lastMonth = Carbon::now()->subMonth()->timestamp;
        $sessionCount = DB::table('sessions')
            ->where('user_id', $this->user->id)
            ->where('last_activity', '>=', $lastMonth)
            ->count();

        return min($sessionCount / 30, 1.0); // Normaliser sur 30 jours
    }

    protected function getFeatureUsageScore(): float
    {
        // Calculer le score d'utilisation des fonctionnalités
        return 0.7; // Placeholder
    }

    protected function getGoalCompletionScore(): float
    {
        // Calculer le taux de completion des objectifs
        return 0.8; // Placeholder
    }

    // Placeholder methods - à implémenter selon les besoins spécifiques
    protected function calculateProjectCompletionRate(): float { return 0.75; }
    protected function getCurrentProjectFocus(): ?string { return 'booking_management'; }
    protected function getUpcomingDeadlines(): array { return []; }
    protected function getFeatureUsageStats(): array { return []; }
    protected function getUntestedFeatures(): array { return []; }
    protected function getAvailablePremiumFeatures(): array { return []; }
    protected function getFeatureUsageTrends(): array { return []; }
    protected function getDailyActivity(): array { return []; }
    protected function getWeeklyPattern(): array { return []; }
    protected function getMostUsedFeatures(): array { return ['dashboard', 'booking', 'site_builder']; }
    protected function getAverageSessionDuration(): int { return 1800; }
    protected function getPeakUsageHours(): array { return ['09:00', '14:00', '16:00']; }
    protected function getRecentActions(): array { return []; }
    protected function getInteractionFrequency(): array { return []; }
    protected function getGoalsProgress(): array { return []; }
    protected function getProductivityMetrics(): array { return []; }
    protected function calculateEfficiencyScore(): float { return 0.8; }
    protected function identifyImprovementAreas(): array { return []; }
    protected function identifySuccessPatterns(): array { return []; }
    protected function getBenchmarkComparisons(): array { return []; }
    protected function getShortTermGoals(): array { return []; }
    protected function getLongTermGoals(): array { return []; }
    protected function getGoalCategories(): array { return []; }
    protected function calculateAchievementRate(): float { return 0.7; }
    protected function getOverdueGoals(): array { return []; }
    protected function getGoalDependencies(): array { return []; }
    protected function getNotificationSettings(): array { return []; }
    protected function getInterfacePreferences(): array { return []; }
    protected function getWorkingHours(): array { return ['start' => '09:00', 'end' => '17:00']; }
    protected function getUserPriorities(): array { return []; }
    protected function identifyLearningStyle(): string { return 'visual'; }
    protected function getMostVisitedPages(): array { return ['dashboard', 'booking', 'site-builder']; }
    protected function getNavigationPatterns(): array { return []; }
    protected function getTimePerSection(): array { return []; }
    protected function getBouncePages(): array { return []; }
    protected function identifyWorkflowSequences(): array { return []; }
    protected function getPeakUsageDays(): array { return ['monday', 'tuesday', 'wednesday']; }
    protected function getSeasonalTrends(): array { return []; }
    protected function getFeatureAdoptionRate(): float { return 0.6; }
    protected function identifyUserJourneyStage(): string { return 'active_user'; }
    protected function getEngagementTrends(): array { return []; }
    protected function getChurnRiskIndicators(): array { return []; }
    protected function identifyUnusedFeatures(): array { return ['hr', 'inventory']; }
    protected function identifyOptimizationOpportunities(): array { return []; }
    protected function identifyUpgradeOpportunities(): array { return []; }
    protected function identifyCollaborationOpportunities(): array { return []; }
    protected function identifyAutomationOpportunities(): array { return []; }
    protected function identifyLearningOpportunities(): array { return []; }
    protected function getWidgetsConfiguration(): array { return []; }
    protected function getKeyMetrics(): array { return []; }
    protected function getActiveAlerts(): array { return []; }
    protected function getQuickActions(): array { return []; }
    protected function getRecentNotifications(): array { return []; }
    protected function getBusinessPlanCompletion($project): float { return 0.65; }
    protected function getMarketAnalysisStatus($project): array { return []; }
    protected function getFinancialProjections($project): array { return []; }
    protected function getCompetitorAnalysis($project): array { return []; }
    protected function getSwotAnalysis($project): array { return []; }
    protected function getBusinessPlanRecommendations($project): array { return []; }
    protected function getSocialMediaContext(): array { return []; }
    protected function getAnalyticsContext(): array { return []; }
    protected function getSettingsContext(): array { return []; }
    protected function getCalendarContext(): array { return []; }
    protected function getTasksContext(): array { return []; }
    protected function getProjectsPageContext(): array { return []; }

    // ===== NOUVELLES MÉTHODES D'ACCÈS COMPLET AUX DONNÉES =====

    /**
     * ✅ ANALYTICS DES SESSIONS UTILISATEUR
     */
    protected function getSessionAnalytics(): array
    {
        $sessions = DB::table('sessions')
            ->where('user_id', $this->user->id)
            ->orderBy('last_activity', 'desc')
            ->limit(50)
            ->get();

        return [
            'total_sessions' => $sessions->count(),
            'recent_sessions' => $sessions->take(10)->toArray(),
            'average_session_duration' => $this->calculateAverageSessionDuration($sessions),
            'device_diversity' => $this->analyzeDeviceDiversity($sessions),
            'activity_patterns' => $this->analyzeActivityPatterns($sessions),
        ];
    }

    /**
     * ✅ CONTEXTE DE SÉCURITÉ
     */
    protected function getSecurityContext(): array
    {
        return [
            'login_attempts' => $this->getRecentLoginAttempts(),
            'token_usage' => $this->getTokenUsageStats(),
            'password_changes' => $this->getPasswordChangeHistory(),
            'security_events' => $this->getSecurityEvents(),
        ];
    }

    /**
     * ✅ CONTEXTE FINANCIER COMPLET
     */
    protected function getFinancialContext(): array
    {
        $financialPlans = DB::table('financial_plans')
            ->join('projects', 'financial_plans.project_id', '=', 'projects.id')
            ->where('projects.user_id', $this->user->id)
            ->get();

        $orders = DB::table('orders')
            ->where('user_id', $this->user->id)
            ->get();

        return [
            'financial_plans' => $financialPlans->toArray(),
            'revenue_data' => $this->analyzeRevenueData($orders),
            'payment_patterns' => $this->analyzePaymentPatterns($orders),
            'financial_health_score' => $this->calculateFinancialHealthScore($orders, $financialPlans),
            'growth_metrics' => $this->calculateGrowthMetrics($orders),
        ];
    }

    /**
     * ✅ CONTEXTE MARKETING COMPLET
     */
    protected function getMarketingContext(): array
    {
        $marketingPlans = DB::table('marketing_plans')
            ->join('projects', 'marketing_plans.project_id', '=', 'projects.id')
            ->where('projects.user_id', $this->user->id)
            ->get();

        $keywords = DB::table('business_key_words')
            ->join('projects', 'business_key_words.project_id', '=', 'projects.id')
            ->where('projects.user_id', $this->user->id)
            ->get();

        return [
            'marketing_plans' => $marketingPlans->toArray(),
            'keyword_strategy' => $this->analyzeKeywordStrategy($keywords),
            'campaign_performance' => $this->analyzeCampaignPerformance(),
            'marketing_roi' => $this->calculateMarketingROI(),
        ];
    }

    /**
     * ✅ ANALYSE COMPÉTITIVE
     */
    protected function getCompetitiveAnalysisContext(): array
    {
        $swotAnalyses = DB::table('swot_analyses')
            ->join('projects', 'swot_analyses.project_id', '=', 'projects.id')
            ->where('projects.user_id', $this->user->id)
            ->get();

        $blueOceanStrategies = DB::table('blue_ocean_strategies')
            ->join('projects', 'blue_ocean_strategies.project_id', '=', 'projects.id')
            ->where('projects.user_id', $this->user->id)
            ->get();

        return [
            'swot_analyses' => $swotAnalyses->toArray(),
            'blue_ocean_strategies' => $blueOceanStrategies->toArray(),
            'competitive_positioning' => $this->analyzeCompetitivePositioning($swotAnalyses),
            'market_opportunities' => $this->identifyMarketOpportunities($blueOceanStrategies),
        ];
    }

    /**
     * ✅ PERFORMANCE CONTENU COMPLET
     */
    protected function getContentPerformanceContext(): array
    {
        $blogPosts = DB::table('blog_posts')
            ->where('user_id', $this->user->id)
            ->get();

        $socialPosts = DB::table('social_media_posts')
            ->where('user_id', $this->user->id)
            ->get();

        return [
            'total_blog_posts' => $blogPosts->count(),
            'total_social_posts' => $socialPosts->count(),
            'content_performance_score' => $this->calculateContentPerformanceScore($blogPosts, $socialPosts),
            'ai_vs_human_content' => $this->compareAIvsHumanContent($blogPosts, $socialPosts),
            'content_trends' => $this->analyzeContentTrends($blogPosts, $socialPosts),
        ];
    }

    /**
     * ✅ ANALYTICS BLOG DÉTAILLÉES
     */
    protected function getBlogAnalyticsContext(): array
    {
        $blogPosts = DB::table('blog_posts')
            ->where('user_id', $this->user->id)
            ->get();

        $comments = DB::table('comments')
            ->where('commentable_type', 'App\\Models\\BlogPost')
            ->whereIn('commentable_id', $blogPosts->pluck('id'))
            ->get();

        return [
            'posts_data' => $blogPosts->toArray(),
            'engagement_analytics' => $this->analyzeBlogEngagement($blogPosts, $comments),
            'publishing_optimization' => $this->analyzeBlogPublishingPatterns($blogPosts),
            'content_categories' => $this->analyzeBlogCategories($blogPosts),
            'viral_content' => $this->identifyViralBlogContent($blogPosts),
        ];
    }

    /**
     * ✅ ANALYTICS SOCIAL MEDIA DÉTAILLÉES
     */
    protected function getSocialMediaAnalyticsContext(): array
    {
        $socialPosts = DB::table('social_media_posts')
            ->where('user_id', $this->user->id)
            ->get();

        return [
            'posts_data' => $socialPosts->toArray(),
            'platform_performance' => $this->analyzePlatformPerformance($socialPosts),
            'optimal_posting_times' => $this->findOptimalPostingTimes($socialPosts),
            'content_type_performance' => $this->analyzeContentTypePerformance($socialPosts),
            'hashtag_effectiveness' => $this->analyzeHashtagEffectiveness($socialPosts),
        ];
    }

    /**
     * ✅ ANALYTICS SUPPORT CLIENT
     */
    protected function getSupportAnalyticsContext(): array
    {
        $tickets = DB::table('tickets')->where('user_id', $this->user->id)->get();
        $ticketMessages = DB::table('ticket_messages')
            ->whereIn('ticket_id', $tickets->pluck('id'))
            ->get();

        return [
            'tickets_data' => $tickets->toArray(),
            'resolution_times' => $this->analyzeResolutionTimes($tickets, $ticketMessages),
            'support_categories' => $this->analyzeSupportCategories($tickets),
            'satisfaction_trends' => $this->analyzeSupportSatisfaction($tickets),
            'escalation_patterns' => $this->analyzeEscalationPatterns($tickets),
        ];
    }

    /**
     * ✅ PATTERNS DE COMMUNICATION
     */
    protected function getCommunicationPatternsContext(): array
    {
        // 🚀 UTILISER LE NOUVEAU SYSTÈME ADAPTATIF !
        $ticketMessages = $this->safeTableQuery('ticket_messages', function() {
            return $this->getAdaptiveQuery('ticket_messages', $this->user->id);
        });

        $notifications = $this->safeTableQuery('notifications', function() {
            return $this->getAdaptiveQuery('notifications', $this->user->id);
        });

        return [
            'chat_patterns' => $this->analyzeChatPatterns($ticketMessages),
            'notification_effectiveness' => $this->analyzeNotificationEffectiveness($notifications),
            'response_times' => $this->analyzeResponseTimes($ticketMessages),
            'communication_preferences' => $this->identifyCommunicationPreferences($notifications),
        ];
    }

    /**
     * ✅ SENTIMENT UTILISATEUR
     */
    protected function getUserSentimentContext(): array
    {
        $reactions = DB::table('reactions')
            ->where('user_id', $this->user->id)
            ->get();

        $comments = DB::table('comments')
            ->where('user_id', $this->user->id)
            ->get();

        return [
            'sentiment_analysis' => $this->analyzeSentiment($reactions, $comments),
            'engagement_mood' => $this->analyzeEngagementMood($reactions),
            'content_reception' => $this->analyzeContentReception($reactions, $comments),
        ];
    }

    /**
     * ✅ APPRENTISSAGE AGENT
     */
    protected function getAgentLearningContext(): array
    {
        if (!$this->agent) return [];

        $learningData = DB::table('agent_learning_data')
            ->where('intelligent_agent_id', $this->agent->id)
            ->get();

        return [
            'learning_patterns' => $learningData->toArray(),
            'learning_effectiveness' => $this->analyzeLearningEffectiveness($learningData),
            'knowledge_gaps' => $this->identifyKnowledgeGaps($learningData),
            'pattern_recognition' => $this->analyzePatternRecognition($learningData),
        ];
    }

    /**
     * ✅ HISTORIQUE INTERACTIONS AGENT
     */
    protected function getInteractionHistoryContext(): array
    {
        if (!$this->agent) return [];

        $interactions = DB::table('agent_interactions')
            ->where('intelligent_agent_id', $this->agent->id)
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return [
            'interactions_data' => $interactions->toArray(),
            'interaction_quality' => $this->analyzeInteractionQuality($interactions),
            'user_satisfaction' => $this->analyzeUserSatisfaction($interactions),
            'response_optimization' => $this->analyzeResponseOptimization($interactions),
        ];
    }

    /**
     * ✅ INSIGHTS PRÉDICTIFS
     */
    protected function getPredictiveInsightsContext(): array
    {
        return [
            'churn_prediction' => $this->predictChurnRisk(),
            'revenue_forecast' => $this->forecastRevenue(),
            'content_opportunities' => $this->predictContentOpportunities(),
            'lead_conversion_probability' => $this->predictLeadConversion(),
            'optimal_actions' => $this->suggestOptimalActions(),
        ];
    }

    // ===== MÉTHODES UTILITAIRES POUR CALCULS AVANCÉS =====

    protected function calculateAverageSessionDuration($sessions): float
    {
        if ($sessions->isEmpty()) return 0;
        // Logique de calcul basée sur last_activity
        return 1800; // 30 minutes par défaut
    }

    protected function analyzeDeviceDiversity($sessions): array
    {
        return $sessions->groupBy('user_agent')->map->count()->toArray();
    }

    protected function analyzeActivityPatterns($sessions): array
    {
        return []; // À implémenter selon les besoins
    }

    // Placeholder methods pour toutes les nouvelles méthodes d'analyse
    protected function getRecentLoginAttempts(): array { return []; }
    protected function getTokenUsageStats(): array { return []; }
    protected function getPasswordChangeHistory(): array { return []; }
    protected function getSecurityEvents(): array { return []; }
    protected function analyzeRevenueData($orders): array { return []; }
    protected function analyzePaymentPatterns($orders): array { return []; }
    protected function calculateFinancialHealthScore($orders, $plans): float { return 0.75; }
    protected function calculateGrowthMetrics($orders): array { return []; }
    protected function analyzeKeywordStrategy($keywords): array { return []; }
    protected function analyzeCampaignPerformance(): array { return []; }
    protected function calculateMarketingROI(): float { return 2.5; }
    protected function analyzeCompetitivePositioning($swot): array { return []; }
    protected function identifyMarketOpportunities($strategies): array { return []; }
    protected function calculateContentPerformanceScore($blog, $social): float { return 0.7; }
    protected function compareAIvsHumanContent($blog, $social): array { return []; }
    protected function analyzeContentTrends($blog, $social): array { return []; }
    protected function analyzeBlogEngagement($posts, $comments): array { return []; }
    protected function analyzeBlogPublishingPatterns($posts): array { return []; }
    protected function analyzeBlogCategories($posts): array { return []; }
    protected function identifyViralBlogContent($posts): array { return []; }
    protected function analyzePlatformPerformance($posts): array { return []; }
    protected function findOptimalPostingTimes($posts): array { return []; }
    protected function analyzeContentTypePerformance($posts): array { return []; }
    protected function analyzeHashtagEffectiveness($posts): array { return []; }
    protected function analyzeResolutionTimes($tickets, $messages): array { return []; }
    protected function analyzeSupportCategories($tickets): array { return []; }
    protected function analyzeSupportSatisfaction($tickets): array { return []; }
    protected function analyzeEscalationPatterns($tickets): array { return []; }
    protected function analyzeChatPatterns($messages): array { return []; }
    protected function analyzeNotificationEffectiveness($notifications): array { return []; }
    protected function analyzeResponseTimes($messages): array { return []; }
    protected function identifyCommunicationPreferences($notifications): array { return []; }
    protected function analyzeSentiment($reactions, $comments): array { return []; }
    protected function analyzeEngagementMood($reactions): array { return []; }
    protected function analyzeContentReception($reactions, $comments): array { return []; }
    protected function analyzeLearningEffectiveness($data): array { return []; }
    protected function identifyKnowledgeGaps($data): array { return []; }
    protected function analyzePatternRecognition($data): array { return []; }
    protected function analyzeInteractionQuality($interactions): array { return []; }
    protected function analyzeUserSatisfaction($interactions): array { return []; }
    protected function analyzeResponseOptimization($interactions): array { return []; }
    protected function predictChurnRisk(): float { return 0.15; }
    protected function forecastRevenue(): array { return []; }
    protected function predictContentOpportunities(): array { return []; }
    protected function predictLeadConversion(): array { return []; }
    protected function suggestOptimalActions(): array { return []; }

    // ===== NOUVELLES MÉTHODES POUR CONTEXTES MANQUANTS =====

    protected function getPublishingPatternsContext(): array
    {
        $blogPosts = DB::table('blog_posts')->where('user_id', $this->user->id)->get();
        $socialPosts = DB::table('social_media_posts')->where('user_id', $this->user->id)->get();

        return [
            'blog_publishing_patterns' => $this->analyzeBlogPublishingPatterns($blogPosts),
            'social_publishing_patterns' => $this->analyzeSocialPublishingPatterns($socialPosts),
            'optimal_times' => $this->findOptimalPublishingTimes($blogPosts, $socialPosts),
            'content_frequency' => $this->analyzeContentFrequency($blogPosts, $socialPosts),
        ];
    }

    protected function getEngagementMetricsContext(): array
    {
        $reactions = DB::table('reactions')->where('user_id', $this->user->id)->get();
        $comments = DB::table('comments')->where('user_id', $this->user->id)->get();

        return [
            'reaction_patterns' => $this->analyzeReactionPatterns($reactions),
            'comment_engagement' => $this->analyzeCommentEngagement($comments),
            'engagement_trends' => $this->analyzeEngagementTrends($reactions, $comments),
            'viral_content_indicators' => $this->identifyViralIndicators($reactions, $comments),
        ];
    }

    protected function getFeatureUsageContext(): array { return []; }
    protected function getSubscriptionAnalyticsContext(): array { return []; }
    protected function getProductivityMetricsContext(): array { return []; }
    protected function getTaskManagementContext(): array { return []; }
    protected function getSprintAnalyticsContext(): array { return []; }
    protected function getSystemPerformanceContext(): array { return []; }
    protected function getUsageAnalyticsContext(): array { return []; }
    protected function getTemporalPatternsContext(): array { return []; }
    protected function getSeasonalTrendsContext(): array { return []; }
    protected function getForecastingDataContext(): array { return []; }

    // Méthodes utilitaires pour les nouveaux contextes
    protected function analyzeSocialPublishingPatterns($posts): array { return []; }
    protected function findOptimalPublishingTimes($blog, $social): array { return []; }
    protected function analyzeContentFrequency($blog, $social): array { return []; }
    protected function analyzeReactionPatterns($reactions): array { return []; }
    protected function analyzeCommentEngagement($comments): array { return []; }
    protected function analyzeEngagementTrends($reactions, $comments): array { return []; }
    protected function identifyViralIndicators($reactions, $comments): array { return []; }

    /**
     * ✅ OPPORTUNITÉS D'OPTIMISATION
     */
    protected function getOptimizationOpportunities(): array
    {
        return [
            'feature_optimization' => $this->identifyFeatureOptimizations(),
            'performance_improvements' => $this->identifyPerformanceImprovements(),
            'workflow_optimizations' => $this->identifyWorkflowOptimizations(),
            'automation_opportunities' => $this->identifyAutomationOpportunities(),
            'user_experience_enhancements' => $this->identifyUXEnhancements(),
            'conversion_optimizations' => $this->identifyConversionOptimizations(),
        ];
    }

    // Méthodes utilitaires pour les opportunités d'optimisation
    protected function identifyFeatureOptimizations(): array { return []; }
    protected function identifyPerformanceImprovements(): array { return []; }
    protected function identifyWorkflowOptimizations(): array { return []; }
    protected function identifyUXEnhancements(): array { return []; }
    protected function identifyConversionOptimizations(): array { return []; }

    /**
     * Invalider le cache du contexte
     */
    public function invalidateCache(): void
    {
        Cache::forget("agent_context_{$this->user->id}");
    }

    /**
     * Mettre à jour le contexte avec de nouvelles données
     */
    public function updateContext(string $section, array $data): void
    {
        $this->invalidateCache();

        // Enregistrer l'activité pour l'apprentissage de l'agent
        if ($this->agent) {
            DB::table('agent_learning_data')->insert([
                'intelligent_agent_id' => $this->agent->id,
                'user_id' => $this->user->id,
                'learning_type' => 'context_update',
                'pattern_key' => $section,
                'pattern_data' => json_encode($data),
                'description' => "Context update for section: {$section}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * ✅ UTILITAIRE : Requête sécurisée pour éviter les erreurs de tables manquantes
     */
    protected function safeTableQuery(string $tableName, callable $queryCallback, $default = null)
    {
        try {
            return $queryCallback();
        } catch (\Exception $e) {
            // Log de debug pour tracking des tables manquantes
            Log::debug("Table manquante: {$tableName} - " . $e->getMessage());
            return $default ?? collect();
        }
    }

    /**
     * 🧠 ANALYSEUR DE STRUCTURE : Analyse automatique des colonnes d'une table
     */
    protected function analyzeTableStructure(string $tableName): array
    {
        try {
            $columns = DB::select("DESCRIBE {$tableName}");
            $columnNames = array_map(fn($col) => $col->Field, $columns);

            return [
                'exists' => true,
                'columns' => $columnNames,
                'has_user_id' => in_array('user_id', $columnNames),
                'has_ticket_id' => in_array('ticket_id', $columnNames),
                'has_author_id' => in_array('author_id', $columnNames),
                'has_author_type' => in_array('author_type', $columnNames),
                'has_created_by' => in_array('created_by', $columnNames),
                'user_relation_type' => $this->detectUserRelationType($columnNames),
            ];
        } catch (\Exception $e) {
            return [
                'exists' => false,
                'columns' => [],
                'has_user_id' => false,
                'user_relation_type' => 'none',
            ];
        }
    }

    /**
     * 🔍 DÉTECTEUR DE RELATION : Détermine comment cette table se lie à l'utilisateur
     */
    protected function detectUserRelationType(array $columns): string
    {
        if (in_array('user_id', $columns)) {
            return 'direct'; // user_id direct
        }

        if (in_array('ticket_id', $columns)) {
            return 'via_ticket'; // via tickets.user_id
        }

        if (in_array('author_id', $columns) && in_array('author_type', $columns)) {
            return 'polymorphic'; // relation polymorphe
        }

        if (in_array('created_by', $columns)) {
            return 'created_by'; // créé par user
        }

        if (in_array('project_id', $columns)) {
            return 'via_project'; // via projects.user_id
        }

        return 'none'; // pas de relation détectée
    }

    /**
     * 🚀 REQUÊTE ADAPTATIVE : Génère la requête appropriée selon la structure
     */
    protected function getAdaptiveQuery(string $tableName, int $userId)
    {
        $structure = $this->analyzeTableStructure($tableName);

        if (!$structure['exists']) {
            return collect();
        }

        switch ($structure['user_relation_type']) {
            case 'direct':
                return DB::table($tableName)->where('user_id', $userId)->get();

            case 'via_ticket':
                return DB::table($tableName)
                    ->join('tickets', "{$tableName}.ticket_id", '=', 'tickets.id')
                    ->where('tickets.user_id', $userId)
                    ->select("{$tableName}.*")
                    ->get();

            case 'polymorphic':
                return DB::table($tableName)
                    ->where('author_id', $userId)
                    ->where('author_type', 'App\\Models\\User')
                    ->get();

            case 'created_by':
                return DB::table($tableName)->where('created_by', $userId)->get();

            case 'via_project':
                return DB::table($tableName)
                    ->join('projects', "{$tableName}.project_id", '=', 'projects.id')
                    ->where('projects.user_id', $userId)
                    ->select("{$tableName}.*")
                    ->get();

            default:
                // Table système ou pas de relation - prendre un échantillon
                return DB::table($tableName)->limit(10)->get();
        }
    }

    /**
     * 🚀 ACCÈS UNIVERSEL ADAPTATIF : S'adapte automatiquement à toutes les structures de tables
     * Conforme au plan roadmap - Agent omniscient et intelligent
     */
    public function getAllDatabaseContext(): array
    {
        // ✅ CACHE SÉPARÉ - 20 minutes pour données lourdes (32 tables)
        return Cache::remember("agent_db_context_{$this->user->id}", 1200, function () {
            // Liste des tables importantes à analyser
            $importantTables = [
            // 🏨 BOOKING
            'booking_reservations',
            'booking_products',
            'booking_expenses',
            'booking_email_templates',
            'booking_settings',
            'booking_suppliers',

            // 🌐 SITE BUILDER
            'user_sites',
            'site_pages',
            'site_sections',
            'site_domains',

            // 🛒 MARKETPLACE
            'marketplace_products',
            'marketplace_orders',
            'marketplace_order_items',

            // 🏢 WORKSPACE
            'workspaces',
            'workspace_users',
            'workspace_subscriptions',

            // 🌍 DOMAINES
            'studio_requests',

            // 💳 CRÉDITS & FACTURATION
            'credit_transactions',
            'billing_invoices',
            'purchase_orders',

            // 🎫 SUPPORT
            'tickets',
            'ticket_messages',
            'ticket_histories',
            'notifications',

            // 🤖 AGENT & IA
            'agent_interactions',
            'agent_learning_data',
            'intelligent_agents',
            'user_agent_preferences',
        ];

        $results = [];

        foreach ($importantTables as $tableName) {
            $results[$tableName] = $this->safeTableQuery($tableName, fn() =>
                $this->getAdaptiveQuery($tableName, $this->user->id)
            );

            // Log du type de relation détectée (pour debug)
            if (!empty($results[$tableName]) && count($results[$tableName]) > 0) {
                $structure = $this->analyzeTableStructure($tableName);
                Log::debug("Table {$tableName}: {$structure['user_relation_type']} - " . count($results[$tableName]) . " entrées");
            }
        }

            // ===== DONNÉES CALCULÉES =====
            $results['total_data_summary'] = [
                'user_id' => $this->user->id,
                'user_name' => $this->user->name,
                'account_created' => $this->user->created_at ?? 'unknown',
                'last_activity' => now()->toDateTimeString(),
                'adaptive_system' => 'active',
                'analyzed_tables' => count($importantTables),
            ];

            return $results;
        });
    }

}