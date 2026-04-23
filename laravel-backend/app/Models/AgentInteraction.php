<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class AgentInteraction extends Model
{
    use HasFactory;

    protected $fillable = [
        'intelligent_agent_id',
        'user_id',
        'interaction_type',
        'user_input',
        'agent_response',
        'context_data',
        'intent',
        'category',
        'confidence_score',
        'outcome',
        'user_satisfaction_rating',
        'user_feedback',
        'recommendation_followed',
        'response_time_ms',
        'completed_at',
        'used_for_learning',
        'marked_as_important',
    ];

    protected $casts = [
        'context_data' => 'array',
        'confidence_score' => 'decimal:2',
        'completed_at' => 'datetime',
        'used_for_learning' => 'boolean',
        'marked_as_important' => 'boolean',
        'recommendation_followed' => 'boolean',
    ];

    // ===== CONSTANTS =====

    public const TYPE_QUESTION = 'question';
    public const TYPE_RECOMMENDATION = 'recommendation';
    public const TYPE_ANALYSIS = 'analysis';
    public const TYPE_PROACTIVE_SUGGESTION = 'proactive_suggestion';
    public const TYPE_REACTIVE_ALERT = 'reactive_alert';
    public const TYPE_SCHEDULED_TASK = 'scheduled_task';
    public const TYPE_LEARNING_FEEDBACK = 'learning_feedback';

    public const OUTCOME_PENDING = 'pending';
    public const OUTCOME_SUCCESS = 'success';
    public const OUTCOME_PARTIAL = 'partial';
    public const OUTCOME_FAILED = 'failed';

    public const CATEGORY_BUSINESS = 'business';
    public const CATEGORY_MARKETING = 'marketing';
    public const CATEGORY_FINANCE = 'finance';
    public const CATEGORY_STRATEGY = 'strategy';
    public const CATEGORY_OPERATIONS = 'operations';
    public const CATEGORY_GENERAL = 'general';

    // ===== RELATIONS =====

    /**
     * L'interaction appartient à un agent intelligent
     */
    public function intelligentAgent(): BelongsTo
    {
        return $this->belongsTo(IntelligentAgent::class);
    }

    /**
     * L'interaction appartient à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ===== SCOPES =====

    /**
     * Interactions réussies
     */
    public function scopeSuccessful($query)
    {
        return $query->where('outcome', self::OUTCOME_SUCCESS);
    }

    /**
     * Interactions avec feedback utilisateur
     */
    public function scopeWithUserFeedback($query)
    {
        return $query->whereNotNull('user_satisfaction_rating');
    }

    /**
     * Interactions par catégorie
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Interactions récentes
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', Carbon::now()->subDays($days));
    }

    /**
     * Interactions utilisées pour l'apprentissage
     */
    public function scopeForLearning($query)
    {
        return $query->where('used_for_learning', true);
    }

    // ===== MÉTHODES =====

    /**
     * Marquer l'interaction comme terminée
     */
    public function markCompleted(string $outcome = self::OUTCOME_SUCCESS): bool
    {
        return $this->update([
            'outcome' => $outcome,
            'completed_at' => now(),
        ]);
    }

    /**
     * Enregistrer le feedback utilisateur
     */
    public function recordUserFeedback(int $rating, ?string $feedback = null, ?bool $followed = null): bool
    {
        $data = [
            'user_satisfaction_rating' => $rating,
        ];

        if ($feedback !== null) {
            $data['user_feedback'] = $feedback;
        }

        if ($followed !== null) {
            $data['recommendation_followed'] = $followed;
        }

        $success = $this->update($data);

        // Mettre à jour le score de satisfaction de l'agent
        if ($success) {
            $this->intelligentAgent->updateSatisfactionScore($rating);
        }

        return $success;
    }

    /**
     * Calculer le temps de réponse
     */
    public function calculateResponseTime(): ?int
    {
        if ($this->completed_at && $this->created_at) {
            return $this->created_at->diffInMilliseconds($this->completed_at);
        }

        return null;
    }

    /**
     * Vérifier si l'interaction est réussie
     */
    public function isSuccessful(): bool
    {
        return $this->outcome === self::OUTCOME_SUCCESS;
    }

    /**
     * Obtenir la satisfaction utilisateur (1-5 scale)
     */
    public function getSatisfactionLevel(): ?string
    {
        if ($this->user_satisfaction_rating === null) {
            return null;
        }

        return match($this->user_satisfaction_rating) {
            1 => 'Very Unsatisfied',
            2 => 'Unsatisfied',
            3 => 'Neutral',
            4 => 'Satisfied',
            5 => 'Very Satisfied',
            default => null,
        };
    }

    /**
     * Obtenir les données contextuelles formatées
     */
    public function getFormattedContext(): array
    {
        $context = $this->context_data ?? [];

        return [
            'business_context' => $context['business_context'] ?? null,
            'user_tier' => $context['user_tier'] ?? 'free',
            'session_id' => $context['session_id'] ?? null,
            'timestamp' => $this->created_at->toISOString(),
            'interaction_id' => $this->id,
        ];
    }

    /**
     * Préparer pour l'apprentissage automatique
     */
    public function toLearningData(): array
    {
        return [
            'interaction_type' => $this->interaction_type,
            'category' => $this->category,
            'intent' => $this->intent,
            'user_input_length' => strlen($this->user_input ?? ''),
            'agent_response_length' => strlen($this->agent_response ?? ''),
            'confidence_score' => $this->confidence_score,
            'outcome' => $this->outcome,
            'user_satisfaction' => $this->user_satisfaction_rating,
            'response_time_ms' => $this->response_time_ms,
            'recommendation_followed' => $this->recommendation_followed,
            'user_tier' => $this->getFormattedContext()['user_tier'],
            'timestamp' => $this->created_at->timestamp,
        ];
    }

    /**
     * Préparer les données pour le frontend
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->interaction_type,
            'category' => $this->category,
            'user_input' => $this->user_input,
            'agent_response' => $this->agent_response,
            'outcome' => $this->outcome,
            'satisfaction_rating' => $this->user_satisfaction_rating,
            'satisfaction_level' => $this->getSatisfactionLevel(),
            'confidence_score' => $this->confidence_score,
            'response_time_ms' => $this->response_time_ms,
            'created_at' => $this->created_at->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
        ];
    }
}