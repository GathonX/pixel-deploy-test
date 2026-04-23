<?php

namespace App\Services\AgentIntelligent;

use App\Models\User;
use App\Models\IntelligentAgent;
use App\Models\UserFeatureAccess;

class UserTierService
{
    /**
     * Déterminer le tier d'un utilisateur basé sur ses fonctionnalités payantes
     */
    public function determineUserTier(User $user): string
    {
        $activeFeatures = $this->getActiveFeatures($user);

        if (empty($activeFeatures)) {
            return IntelligentAgent::TIER_FREE;
        }

        $featureCount = count($activeFeatures);
        $hasHighValueFeatures = $this->hasHighValueFeatures($activeFeatures);

        if ($featureCount >= 5 || $hasHighValueFeatures) {
            return IntelligentAgent::TIER_ENTERPRISE;
        } elseif ($featureCount >= 1) {
            return IntelligentAgent::TIER_PREMIUM;
        }

        return IntelligentAgent::TIER_FREE;
    }

    /**
     * Obtenir les fonctionnalités actives d'un utilisateur
     */
    public function getActiveFeatures(User $user): array
    {
        return $user->featureAccess()
            ->whereHas('feature', function ($query) {
                $query->where('is_active', true);
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->with('feature')
            ->get()
            ->pluck('feature.key')
            ->toArray();
    }

    /**
     * Vérifier si l'utilisateur a des fonctionnalités de haute valeur
     */
    private function hasHighValueFeatures(array $features): bool
    {
        $highValueFeatures = [
            'advanced_analytics',
            'api_access',
            'white_label',
            'custom_integrations',
            'dedicated_support',
        ];

        return !empty(array_intersect($features, $highValueFeatures));
    }

    /**
     * Vérifier si un utilisateur peut accéder aux fonctionnalités premium
     */
    public function canAccessPremiumFeatures(User $user): bool
    {
        return $this->determineUserTier($user) !== IntelligentAgent::TIER_FREE;
    }

    /**
     * Vérifier si un utilisateur peut accéder aux fonctionnalités enterprise
     */
    public function canAccessEnterpriseFeatures(User $user): bool
    {
        return $this->determineUserTier($user) === IntelligentAgent::TIER_ENTERPRISE;
    }

    /**
     * Obtenir les capacités disponibles selon le tier
     */
    public function getTierCapabilities(string $tier): array
    {
        return match($tier) {
            IntelligentAgent::TIER_FREE => [
                'max_questions_per_day' => 10,
                'advanced_analysis' => false,
                'realtime_data' => false,
                'custom_reports' => false,
                'priority_support' => false,
                'ai_model_tier' => 'basic',
                'proactive_suggestions' => false,
                'multi_agent_communication' => false,
                'competitor_monitoring' => false,
                'market_trends' => false,
                'export_capabilities' => ['basic'],
                'response_time_priority' => 'standard',
            ],
            IntelligentAgent::TIER_PREMIUM => [
                'max_questions_per_day' => -1, // Illimité
                'advanced_analysis' => true,
                'realtime_data' => true,
                'custom_reports' => true,
                'priority_support' => true,
                'ai_model_tier' => 'advanced',
                'proactive_suggestions' => true,
                'multi_agent_communication' => true,
                'competitor_monitoring' => true,
                'market_trends' => true,
                'export_capabilities' => ['pdf', 'excel', 'json'],
                'response_time_priority' => 'high',
                'predictive_analytics' => true,
                'custom_integrations' => true,
            ],
            IntelligentAgent::TIER_ENTERPRISE => [
                'max_questions_per_day' => -1,
                'advanced_analysis' => true,
                'realtime_data' => true,
                'custom_reports' => true,
                'priority_support' => true,
                'ai_model_tier' => 'premium',
                'proactive_suggestions' => true,
                'multi_agent_communication' => true,
                'competitor_monitoring' => true,
                'market_trends' => true,
                'export_capabilities' => ['pdf', 'excel', 'json', 'api'],
                'response_time_priority' => 'enterprise',
                'predictive_analytics' => true,
                'custom_integrations' => true,
                'dedicated_support' => true,
                'white_label' => true,
                'advanced_ai_models' => true,
                'custom_workflows' => true,
            ],
            default => []
        };
    }

    /**
     * Obtenir les limitations selon le tier
     */
    public function getTierLimitations(string $tier): array
    {
        return match($tier) {
            IntelligentAgent::TIER_FREE => [
                'daily_quota' => 10,
                'response_delay_seconds' => 3,
                'max_file_uploads_mb' => 5,
                'max_concurrent_tasks' => 1,
                'data_retention_days' => 30,
                'api_rate_limit_per_hour' => 100,
            ],
            IntelligentAgent::TIER_PREMIUM => [
                'daily_quota' => -1, // Illimité
                'response_delay_seconds' => 1,
                'max_file_uploads_mb' => 50,
                'max_concurrent_tasks' => 5,
                'data_retention_days' => 365,
                'api_rate_limit_per_hour' => 1000,
            ],
            IntelligentAgent::TIER_ENTERPRISE => [
                'daily_quota' => -1,
                'response_delay_seconds' => 0,
                'max_file_uploads_mb' => 500,
                'max_concurrent_tasks' => 20,
                'data_retention_days' => -1, // Illimité
                'api_rate_limit_per_hour' => 10000,
            ],
            default => []
        };
    }

    /**
     * Obtenir les bénéfices de l'upgrade pour un tier spécifique
     */
    public function getUpgradeBenefits(string $currentTier, string $targetTier): array
    {
        $currentCapabilities = $this->getTierCapabilities($currentTier);
        $targetCapabilities = $this->getTierCapabilities($targetTier);

        $benefits = [];

        foreach ($targetCapabilities as $key => $value) {
            $currentValue = $currentCapabilities[$key] ?? false;

            if ($currentValue !== $value) {
                switch ($key) {
                    case 'max_questions_per_day':
                        if ($value === -1) {
                            $benefits[] = 'Questions illimitées par jour';
                        } else {
                            $benefits[] = "Jusqu'à {$value} questions par jour";
                        }
                        break;
                    case 'advanced_analysis':
                        if ($value) $benefits[] = 'Analyses avancées et détaillées';
                        break;
                    case 'realtime_data':
                        if ($value) $benefits[] = 'Données en temps réel';
                        break;
                    case 'proactive_suggestions':
                        if ($value) $benefits[] = 'Suggestions proactives intelligentes';
                        break;
                    case 'multi_agent_communication':
                        if ($value) $benefits[] = 'Communication multi-agents';
                        break;
                    case 'competitor_monitoring':
                        if ($value) $benefits[] = 'Surveillance concurrentielle';
                        break;
                    case 'priority_support':
                        if ($value) $benefits[] = 'Support client prioritaire';
                        break;
                    case 'custom_reports':
                        if ($value) $benefits[] = 'Rapports personnalisés';
                        break;
                    case 'predictive_analytics':
                        if ($value) $benefits[] = 'Analytics prédictive';
                        break;
                    case 'white_label':
                        if ($value) $benefits[] = 'Solution en marque blanche';
                        break;
                }
            }
        }

        return array_unique($benefits);
    }

    /**
     * Calculer le score de valeur d'un utilisateur
     */
    public function calculateUserValueScore(User $user): int
    {
        $score = 0;
        $activeFeatures = $this->getActiveFeatures($user);

        // Points de base selon le nombre de fonctionnalités
        $score += count($activeFeatures) * 10;

        // Points bonus pour les fonctionnalités premium
        $premiumFeatures = array_intersect($activeFeatures, [
            'advanced_analytics', 'api_access', 'custom_integrations'
        ]);
        $score += count($premiumFeatures) * 20;

        // Points bonus pour les fonctionnalités enterprise
        $enterpriseFeatures = array_intersect($activeFeatures, [
            'white_label', 'dedicated_support', 'custom_workflows'
        ]);
        $score += count($enterpriseFeatures) * 50;

        // Bonus pour l'ancienneté
        $daysSinceRegistration = $user->created_at->diffInDays(now());
        if ($daysSinceRegistration > 30) {
            $score += 25;
        }
        if ($daysSinceRegistration > 365) {
            $score += 50;
        }

        return $score;
    }

    /**
     * Recommander un upgrade pour un utilisateur
     */
    public function recommendUpgrade(User $user): ?array
    {
        $currentTier = $this->determineUserTier($user);
        $valueScore = $this->calculateUserValueScore($user);

        // Ne pas recommander d'upgrade pour les utilisateurs Enterprise
        if ($currentTier === IntelligentAgent::TIER_ENTERPRISE) {
            return null;
        }

        $targetTier = $currentTier === IntelligentAgent::TIER_FREE
            ? IntelligentAgent::TIER_PREMIUM
            : IntelligentAgent::TIER_ENTERPRISE;

        // Seuil de recommandation basé sur le score de valeur
        $recommendationThreshold = match($currentTier) {
            IntelligentAgent::TIER_FREE => 50,
            IntelligentAgent::TIER_PREMIUM => 100,
            default => PHP_INT_MAX
        };

        if ($valueScore < $recommendationThreshold) {
            return null;
        }

        return [
            'current_tier' => $currentTier,
            'recommended_tier' => $targetTier,
            'benefits' => $this->getUpgradeBenefits($currentTier, $targetTier),
            'value_score' => $valueScore,
            'confidence' => min(100, ($valueScore / $recommendationThreshold) * 100),
        ];
    }

    /**
     * Synchroniser le tier de l'agent avec les fonctionnalités utilisateur
     */
    public function syncAgentTier(User $user): bool
    {
        $currentTier = $this->determineUserTier($user);
        $agent = $user->intelligentAgent;

        if (!$agent) {
            // Créer un agent avec le bon tier
            $user->createIntelligentAgent($currentTier);
            return true;
        }

        // Mettre à jour le tier si différent
        if ($agent->tier !== $currentTier) {
            $newCapabilities = $this->getTierCapabilities($currentTier);
            $newLimitations = $this->getTierLimitations($currentTier);

            return $agent->update([
                'tier' => $currentTier,
                'capabilities' => $newCapabilities,
                'daily_quota_limit' => $newLimitations['daily_quota'],
                'proactive_suggestions' => $newCapabilities['proactive_suggestions'],
                'realtime_monitoring' => $newCapabilities['realtime_data'],
                'multi_agent_communication' => $newCapabilities['multi_agent_communication'],
                'reaction_delay_seconds' => $newLimitations['response_delay_seconds'],
            ]);
        }

        return true;
    }

    /**
     * Obtenir un résumé complet du tier utilisateur
     */
    public function getUserTierSummary(User $user): array
    {
        $tier = $this->determineUserTier($user);
        $activeFeatures = $this->getActiveFeatures($user);
        $capabilities = $this->getTierCapabilities($tier);
        $limitations = $this->getTierLimitations($tier);
        $upgradeRecommendation = $this->recommendUpgrade($user);
        $valueScore = $this->calculateUserValueScore($user);

        return [
            'user_id' => $user->id,
            'current_tier' => $tier,
            'active_features' => $activeFeatures,
            'feature_count' => count($activeFeatures),
            'capabilities' => $capabilities,
            'limitations' => $limitations,
            'value_score' => $valueScore,
            'upgrade_recommendation' => $upgradeRecommendation,
            'tier_benefits' => $this->getTierBenefits($tier),
            'last_sync' => now()->toISOString(),
        ];
    }

    /**
     * Obtenir les bénéfices d'un tier spécifique
     */
    private function getTierBenefits(string $tier): array
    {
        return match($tier) {
            IntelligentAgent::TIER_FREE => [
                'Agent IA de base',
                'Jusqu\'à 10 questions par jour',
                'Analyses simples',
                'Support communautaire',
            ],
            IntelligentAgent::TIER_PREMIUM => [
                'Agent IA avancé',
                'Questions illimitées',
                'Analyses approfondies',
                'Suggestions proactives',
                'Support prioritaire',
                'Exports multiples',
            ],
            IntelligentAgent::TIER_ENTERPRISE => [
                'Agent IA premium',
                'Toutes les fonctionnalités Premium',
                'Communication multi-agents',
                'Marque blanche',
                'Support dédié',
                'Intégrations personnalisées',
                'Analytics avancée',
            ],
            default => []
        };
    }
}