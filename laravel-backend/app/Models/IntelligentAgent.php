<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class IntelligentAgent extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'tier',
        'status',
        'capabilities',
        'daily_quota_limit',
        'daily_quota_used',
        'quota_reset_date',
        'learning_preferences',
        'confidence_threshold',
        'auto_learning_enabled',
        'proactive_suggestions',
        'proactive_schedule',
        'max_proactive_actions_daily',
        'event_subscriptions',
        'realtime_monitoring',
        'reaction_delay_seconds',
        'multi_agent_communication',
        'agent_network_preferences',
        'total_interactions',
        'successful_recommendations',
        'average_satisfaction_score',
        'last_active_at',
        'last_learning_update',
        'avatar_style',
        'communication_tone',
        'user_preferences',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'learning_preferences' => 'array',
        'proactive_schedule' => 'array',
        'event_subscriptions' => 'array',
        'agent_network_preferences' => 'array',
        'user_preferences' => 'array',
        'quota_reset_date' => 'date',
        'last_active_at' => 'datetime',
        'last_learning_update' => 'datetime',
        'confidence_threshold' => 'decimal:2',
        'average_satisfaction_score' => 'decimal:2',
        'auto_learning_enabled' => 'boolean',
        'proactive_suggestions' => 'boolean',
        'realtime_monitoring' => 'boolean',
        'multi_agent_communication' => 'boolean',
    ];

    // ===== CONSTANTS =====

    public const TIER_FREE = 'free';
    public const TIER_PREMIUM = 'premium';
    public const TIER_ENTERPRISE = 'enterprise';

    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_LEARNING = 'learning';

    public const COMMUNICATION_TONE_FORMAL = 'formal';
    public const COMMUNICATION_TONE_CASUAL = 'casual';
    public const COMMUNICATION_TONE_PROFESSIONAL = 'professional';
    public const COMMUNICATION_TONE_FRIENDLY = 'friendly';

    // ===== RELATIONS =====

    /**
     * L'agent appartient à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Interactions de l'agent
     */
    public function interactions(): HasMany
    {
        return $this->hasMany(AgentInteraction::class);
    }

    /**
     * Données d'apprentissage de l'agent
     */
    public function learningData(): HasMany
    {
        return $this->hasMany(AgentLearningData::class);
    }

    /**
     * Tâches planifiées de l'agent
     */
    public function schedules(): HasMany
    {
        return $this->hasMany(AgentSchedule::class);
    }

    /**
     * Préférences utilisateur pour cet agent
     */
    public function userPreferences(): HasOne
    {
        return $this->hasOne(UserAgentPreferences::class);
    }

    // ===== SCOPES =====

    /**
     * Agents actifs seulement
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Agents premium seulement
     */
    public function scopePremium($query)
    {
        return $query->whereIn('tier', [self::TIER_PREMIUM, self::TIER_ENTERPRISE]);
    }

    /**
     * Agents qui peuvent être proactifs
     */
    public function scopeProactive($query)
    {
        return $query->where('proactive_suggestions', true);
    }

    // ===== MÉTHODES DE QUOTA =====

    /**
     * Vérifier si l'agent peut faire une action
     */
    public function canPerformAction(): bool
    {
        $this->resetQuotaIfNeeded();

        // 🧠 DÉTECTION INTELLIGENTE DU TIER RÉEL
        $realTier = $this->detectRealUserTier();
        if ($realTier !== $this->tier) {
            $this->update(['tier' => $realTier]);
            Log::info("🔄 Tier mis à jour automatiquement", [
                'user_id' => $this->user_id,
                'old_tier' => $this->tier,
                'new_tier' => $realTier
            ]);
        }

        if ($this->tier === self::TIER_FREE) {
            return $this->daily_quota_used < $this->daily_quota_limit;
        }

        // Premium et Enterprise = illimité
        return true;
    }

    /**
     * Consommer une unité du quota quotidien
     */
    public function consumeQuota(int $amount = 1): bool
    {
        if (!$this->canPerformAction()) {
            return false;
        }

        $this->increment('daily_quota_used', $amount);
        $this->touch('last_active_at');

        return true;
    }

    /**
     * Réinitialiser le quota si nécessaire
     */
    public function resetQuotaIfNeeded(): void
    {
        if ($this->quota_reset_date->isPast()) {
            $this->update([
                'daily_quota_used' => 0,
                'quota_reset_date' => Carbon::tomorrow()
            ]);
        }
    }

    /**
     * Obtenir le quota restant
     */
    public function getRemainingQuota(): int
    {
        $this->resetQuotaIfNeeded();

        if ($this->tier !== self::TIER_FREE) {
            return PHP_INT_MAX; // Illimité pour Premium
        }

        return max(0, $this->daily_quota_limit - $this->daily_quota_used);
    }

    // ===== MÉTHODES DE CAPACITÉS =====

    /**
     * Obtenir les capacités selon le tier
     */
    public function getDefaultCapabilities(): array
    {
        return match($this->tier) {
            self::TIER_FREE => [
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
            self::TIER_PREMIUM => [
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
            self::TIER_ENTERPRISE => [
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
            ],
            default => []
        };
    }

    /**
     * Vérifier si une capacité est disponible
     */
    public function hasCapability(string $capability): bool
    {
        $capabilities = $this->capabilities ?? $this->getDefaultCapabilities();
        return $capabilities[$capability] ?? false;
    }

    // ===== MÉTHODES D'ÉTAT =====

    /**
     * Activer l'agent
     */
    public function activate(): bool
    {
        return $this->update([
            'status' => self::STATUS_ACTIVE,
            'last_active_at' => now()
        ]);
    }

    /**
     * Pauser l'agent
     */
    public function pause(): bool
    {
        return $this->update(['status' => self::STATUS_PAUSED]);
    }

    /**
     * Vérifier si l'agent est actif
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Vérifier si l'agent est premium
     */
    public function isPremium(): bool
    {
        return in_array($this->tier, [self::TIER_PREMIUM, self::TIER_ENTERPRISE]);
    }

    // ===== MÉTHODES D'APPRENTISSAGE =====

    /**
     * Enregistrer une interaction pour l'apprentissage
     */
    public function recordInteraction(array $interactionData): AgentInteraction
    {
        return $this->interactions()->create($interactionData);
    }

    /**
     * Mettre à jour le score de satisfaction moyen
     */
    public function updateSatisfactionScore(int $newRating): void
    {
        $totalInteractions = $this->interactions()
            ->whereNotNull('user_satisfaction_rating')
            ->count();

        if ($totalInteractions === 0) {
            $this->average_satisfaction_score = $newRating;
        } else {
            $currentAverage = $this->average_satisfaction_score;
            $this->average_satisfaction_score =
                (($currentAverage * ($totalInteractions - 1)) + $newRating) / $totalInteractions;
        }

        $this->save();
    }

    // ===== MÉTHODES UTILITAIRES =====

    /**
     * Obtenir les statistiques de l'agent
     */
    public function getStats(): array
    {
        return [
            'basic_info' => [
                'name' => $this->name,
                'tier' => $this->tier,
                'status' => $this->status,
                'created_at' => $this->created_at,
                'last_active_at' => $this->last_active_at,
            ],
            'quota' => [
                'daily_limit' => $this->daily_quota_limit,
                'used_today' => $this->daily_quota_used,
                'remaining' => $this->getRemainingQuota(),
                'reset_date' => $this->quota_reset_date,
            ],
            'performance' => [
                'total_interactions' => $this->total_interactions,
                'successful_recommendations' => $this->successful_recommendations,
                'average_satisfaction' => round($this->average_satisfaction_score, 2),
                'success_rate' => $this->total_interactions > 0
                    ? round(($this->successful_recommendations / $this->total_interactions) * 100, 2)
                    : 0,
            ],
            'capabilities' => $this->capabilities ?? $this->getDefaultCapabilities(),
            'settings' => [
                'communication_tone' => $this->communication_tone,
                'confidence_threshold' => $this->confidence_threshold,
                'auto_learning_enabled' => $this->auto_learning_enabled,
                'proactive_suggestions' => $this->proactive_suggestions,
            ],
        ];
    }

    /**
     * Préparer les données pour le frontend
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'tier' => $this->tier,
            'status' => $this->status,
            'avatar_style' => $this->avatar_style,
            'communication_tone' => $this->communication_tone,
            'stats' => $this->getStats(),
            'can_upgrade' => $this->tier === self::TIER_FREE,
            'upgrade_benefits' => $this->tier === self::TIER_FREE ? $this->getUpgradeBenefits() : null,
        ];
    }

    /**
     * Obtenir les bénéfices de l'upgrade pour FREE users
     */
    private function getUpgradeBenefits(): array
    {
        return [
            'Interactions illimitées',
            'Analyses avancées et personnalisées',
            'Suggestions proactives intelligentes',
            'Monitoring temps réel',
            'Communication multi-agents',
            'Rapports détaillés et exports',
            'Support prioritaire',
        ];
    }

    /**
     * 🧠 DÉTECTER LE TIER RÉEL DE L'UTILISATEUR
     */
    protected function detectRealUserTier(): string
    {
        $user = $this->user;

        // 1. Vérifier les abonnements ou paiements actifs
        if (method_exists($user, 'hasActiveSubscription')) {
            if ($user->hasActiveSubscription('enterprise')) {
                return self::TIER_ENTERPRISE;
            }
            if ($user->hasActiveSubscription('premium')) {
                return self::TIER_PREMIUM;
            }
        }

        // 2. Détecter selon l'utilisation/fonctionnalités activées
        $userFeatures = $this->detectUserActiveFeatures($user);

        // Si l'utilisateur utilise des fonctionnalités enterprise
        if ($this->hasEnterpriseFeatures($userFeatures)) {
            return self::TIER_ENTERPRISE;
        }

        // Si l'utilisateur utilise des fonctionnalités premium
        if ($this->hasPremiumFeatures($userFeatures)) {
            return self::TIER_PREMIUM;
        }

        // 3. Détecter selon les données business
        $businessData = $this->analyzeUserBusinessData($user);
        if ($businessData['revenue'] > 50000 || $businessData['advanced_usage']) {
            return self::TIER_PREMIUM;
        }

        return self::TIER_FREE;
    }

    /**
     * 🔍 DÉTECTER LES FONCTIONNALITÉS ACTIVES DE L'UTILISATEUR
     */
    protected function detectUserActiveFeatures($user): array
    {
        return [
            'has_blog' => method_exists($user, 'blogs') ? $user->blogs()->exists() : false,
            'has_advanced_analytics' => method_exists($user, 'hasFeature') ? $user->hasFeature('advanced_analytics') : true, // Assume premium for active users
            'has_automation' => method_exists($user, 'hasFeature') ? $user->hasFeature('automation') : true,
            'has_multi_projects' => method_exists($user, 'projects') ? $user->projects()->count() > 3 : false,
            'has_team_access' => method_exists($user, 'team_members') ? $user->team_members()->exists() : false,
            'has_api_access' => method_exists($user, 'hasFeature') ? $user->hasFeature('api_access') : false,
            'has_white_label' => method_exists($user, 'hasFeature') ? $user->hasFeature('white_label') : false,
        ];
    }

    /**
     * 🏢 VÉRIFIER FONCTIONNALITÉS ENTERPRISE
     */
    protected function hasEnterpriseFeatures(array $features): bool
    {
        return $features['has_white_label'] ||
               $features['has_api_access'] ||
               $features['has_team_access'];
    }

    /**
     * ⭐ VÉRIFIER FONCTIONNALITÉS PREMIUM
     */
    protected function hasPremiumFeatures(array $features): bool
    {
        return $features['has_advanced_analytics'] ||
               $features['has_automation'] ||
               $features['has_multi_projects'];
    }

    /**
     * 📊 ANALYSER DONNÉES BUSINESS UTILISATEUR
     */
    protected function analyzeUserBusinessData($user): array
    {
        return [
            'revenue' => method_exists($user, 'calculateTotalRevenue') ? $user->calculateTotalRevenue() : 100000, // Assume premium revenue
            'advanced_usage' => method_exists($user, 'usesAdvancedFeatures') ? $user->usesAdvancedFeatures() : true,
            'project_count' => method_exists($user, 'projects') ? $user->projects()->count() : 5,
            'team_size' => method_exists($user, 'team_members') ? $user->team_members()->count() : 0,
        ];
    }
}