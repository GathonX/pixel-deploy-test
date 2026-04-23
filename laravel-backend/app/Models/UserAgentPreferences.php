<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAgentPreferences extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'intelligent_agent_id',
        'preferred_communication_style',
        'response_length',
        'preferred_language',
        'email_notifications',
        'push_notifications',
        'sms_notifications',
        'notification_schedule',
        'business_focus_areas',
        'include_competitor_analysis',
        'include_market_trends',
        'deep_financial_analysis',
        'allow_proactive_suggestions',
        'max_suggestions_per_day',
        'proactive_topics',
        'allow_learning_from_interactions',
        'share_anonymized_data',
        'personalized_recommendations',
        'daily_interaction_limit',
        'restricted_topics',
        'preferred_business_categories',
        'preferences_last_updated',
        'previous_preferences',
    ];

    protected $casts = [
        'email_notifications' => 'boolean',
        'push_notifications' => 'boolean',
        'sms_notifications' => 'boolean',
        'notification_schedule' => 'array',
        'business_focus_areas' => 'array',
        'include_competitor_analysis' => 'boolean',
        'include_market_trends' => 'boolean',
        'deep_financial_analysis' => 'boolean',
        'allow_proactive_suggestions' => 'boolean',
        'proactive_topics' => 'array',
        'allow_learning_from_interactions' => 'boolean',
        'share_anonymized_data' => 'boolean',
        'personalized_recommendations' => 'boolean',
        'restricted_topics' => 'array',
        'preferred_business_categories' => 'array',
        'preferences_last_updated' => 'datetime',
        'previous_preferences' => 'array',
    ];

    // ===== CONSTANTS =====

    public const STYLE_FORMAL = 'formal';
    public const STYLE_CASUAL = 'casual';
    public const STYLE_PROFESSIONAL = 'professional';
    public const STYLE_FRIENDLY = 'friendly';

    public const LENGTH_CONCISE = 'concise';
    public const LENGTH_DETAILED = 'detailed';
    public const LENGTH_ADAPTIVE = 'adaptive';

    public const BUSINESS_CATEGORIES = [
        'marketing',
        'finance',
        'operations',
        'strategy',
        'sales',
        'hr',
        'technology',
        'legal',
        'product',
        'customer_service',
    ];

    // ===== RELATIONS =====

    /**
     * Les préférences appartiennent à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Les préférences sont liées à un agent intelligent (optionnel)
     */
    public function intelligentAgent(): BelongsTo
    {
        return $this->belongsTo(IntelligentAgent::class);
    }

    // ===== MÉTHODES =====

    /**
     * Obtenir les préférences par défaut pour un nouvel utilisateur
     */
    public static function getDefaultPreferences(int $userId, int $intelligentAgentId = null): array
    {
        return [
            'user_id' => $userId,
            'intelligent_agent_id' => $intelligentAgentId,
            'preferred_communication_style' => self::STYLE_PROFESSIONAL,
            'response_length' => self::LENGTH_ADAPTIVE,
            'preferred_language' => 'fr',
            'email_notifications' => true,
            'push_notifications' => true,
            'sms_notifications' => false,
            'notification_schedule' => [
                'start_hour' => 9,
                'end_hour' => 18,
                'weekends' => false,
                'timezone' => 'Europe/Paris',
            ],
            'business_focus_areas' => ['marketing', 'finance', 'strategy'],
            'include_competitor_analysis' => false,
            'include_market_trends' => false,
            'deep_financial_analysis' => false,
            'allow_proactive_suggestions' => false,
            'max_suggestions_per_day' => 3,
            'proactive_topics' => [],
            'allow_learning_from_interactions' => true,
            'share_anonymized_data' => false,
            'personalized_recommendations' => true,
            'daily_interaction_limit' => null,
            'restricted_topics' => [],
            'preferred_business_categories' => ['marketing', 'strategy'],
            'preferences_last_updated' => now(),
        ];
    }

    /**
     * Créer ou mettre à jour les préférences
     */
    public static function updatePreferences(int $userId, array $preferences): self
    {
        // Sauvegarder les anciennes préférences
        $existing = self::where('user_id', $userId)->first();
        $previousPreferences = $existing ? $existing->toArray() : null;

        return self::updateOrCreate(
            ['user_id' => $userId],
            array_merge($preferences, [
                'previous_preferences' => $previousPreferences,
                'preferences_last_updated' => now(),
            ])
        );
    }

    /**
     * Vérifier si les notifications sont autorisées à cette heure
     */
    public function canSendNotificationNow(): bool
    {
        $schedule = $this->notification_schedule ?? [];
        $now = now();

        // Vérifier les heures
        $startHour = $schedule['start_hour'] ?? 0;
        $endHour = $schedule['end_hour'] ?? 23;
        $currentHour = $now->hour;

        if ($currentHour < $startHour || $currentHour > $endHour) {
            return false;
        }

        // Vérifier les weekends
        if (!($schedule['weekends'] ?? true) && $now->isWeekend()) {
            return false;
        }

        return true;
    }

    /**
     * Obtenir les canaux de notification autorisés
     */
    public function getEnabledNotificationChannels(): array
    {
        $channels = [];

        if ($this->email_notifications) {
            $channels[] = 'email';
        }

        if ($this->push_notifications) {
            $channels[] = 'push';
        }

        if ($this->sms_notifications) {
            $channels[] = 'sms';
        }

        return $channels;
    }

    /**
     * Vérifier si un sujet est autorisé
     */
    public function isTopicAllowed(string $topic): bool
    {
        $restrictedTopics = $this->restricted_topics ?? [];
        return !in_array($topic, $restrictedTopics);
    }

    /**
     * Vérifier si une catégorie business est préférée
     */
    public function isPreferredBusinessCategory(string $category): bool
    {
        $preferredCategories = $this->preferred_business_categories ?? [];
        return in_array($category, $preferredCategories);
    }

    /**
     * Obtenir la limite d'interactions quotidiennes effective
     */
    public function getEffectiveDailyLimit(IntelligentAgent $agent): ?int
    {
        // Si une limite personnalisée est définie, l'utiliser
        if ($this->daily_interaction_limit !== null) {
            return $this->daily_interaction_limit;
        }

        // Sinon, utiliser la limite de l'agent
        return $agent->daily_quota_limit;
    }

    /**
     * Obtenir les préférences de proactivité
     */
    public function getProactivitySettings(): array
    {
        return [
            'enabled' => $this->allow_proactive_suggestions,
            'max_per_day' => $this->max_suggestions_per_day,
            'topics' => $this->proactive_topics ?? [],
            'schedule' => $this->notification_schedule ?? [],
        ];
    }

    /**
     * Obtenir les préférences d'apprentissage
     */
    public function getLearningSettings(): array
    {
        return [
            'allow_learning' => $this->allow_learning_from_interactions,
            'share_data' => $this->share_anonymized_data,
            'personalized' => $this->personalized_recommendations,
        ];
    }

    /**
     * Obtenir les préférences d'analyse avancée
     */
    public function getAdvancedAnalysisSettings(): array
    {
        return [
            'competitor_analysis' => $this->include_competitor_analysis,
            'market_trends' => $this->include_market_trends,
            'financial_analysis' => $this->deep_financial_analysis,
            'focus_areas' => $this->business_focus_areas ?? [],
        ];
    }

    /**
     * Restaurer les préférences précédentes
     */
    public function restorePreviousPreferences(): bool
    {
        if (!$this->previous_preferences) {
            return false;
        }

        // Sauvegarder les préférences actuelles avant de restaurer
        $currentPreferences = $this->toArray();

        $this->fill($this->previous_preferences);
        $this->previous_preferences = $currentPreferences;
        $this->preferences_last_updated = now();

        return $this->save();
    }

    /**
     * Valider les préférences
     */
    public function validatePreferences(): array
    {
        $errors = [];

        // Valider le style de communication
        if (!in_array($this->preferred_communication_style, [
            self::STYLE_FORMAL, self::STYLE_CASUAL, self::STYLE_PROFESSIONAL, self::STYLE_FRIENDLY
        ])) {
            $errors['communication_style'] = 'Style de communication invalide';
        }

        // Valider la longueur de réponse
        if (!in_array($this->response_length, [
            self::LENGTH_CONCISE, self::LENGTH_DETAILED, self::LENGTH_ADAPTIVE
        ])) {
            $errors['response_length'] = 'Longueur de réponse invalide';
        }

        // Valider les catégories business
        $invalidCategories = array_diff(
            $this->preferred_business_categories ?? [],
            self::BUSINESS_CATEGORIES
        );
        if (!empty($invalidCategories)) {
            $errors['business_categories'] = 'Catégories business invalides: ' . implode(', ', $invalidCategories);
        }

        // Valider le nombre maximum de suggestions
        if ($this->max_suggestions_per_day < 0 || $this->max_suggestions_per_day > 50) {
            $errors['max_suggestions'] = 'Le nombre maximum de suggestions doit être entre 0 et 50';
        }

        return $errors;
    }

    /**
     * Préparer les données pour le frontend
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'communication' => [
                'style' => $this->preferred_communication_style,
                'length' => $this->response_length,
                'language' => $this->preferred_language,
            ],
            'notifications' => [
                'email' => $this->email_notifications,
                'push' => $this->push_notifications,
                'sms' => $this->sms_notifications,
                'schedule' => $this->notification_schedule,
                'can_notify_now' => $this->canSendNotificationNow(),
            ],
            'business_settings' => [
                'focus_areas' => $this->business_focus_areas,
                'preferred_categories' => $this->preferred_business_categories,
                'advanced_analysis' => $this->getAdvancedAnalysisSettings(),
            ],
            'proactivity' => $this->getProactivitySettings(),
            'learning' => $this->getLearningSettings(),
            'restrictions' => [
                'daily_limit' => $this->daily_interaction_limit,
                'restricted_topics' => $this->restricted_topics,
            ],
            'meta' => [
                'last_updated' => $this->preferences_last_updated?->toISOString(),
                'has_previous_backup' => !empty($this->previous_preferences),
            ],
        ];
    }
}