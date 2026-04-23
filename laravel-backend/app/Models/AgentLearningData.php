<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class AgentLearningData extends Model
{
    use HasFactory;

    protected $fillable = [
        'intelligent_agent_id',
        'user_id',
        'learning_type',
        'pattern_key',
        'pattern_data',
        'description',
        'success_count',
        'failure_count',
        'effectiveness_score',
        'business_sector',
        'context_tags',
        'global_applicable',
        'last_validated_at',
        'expires_at',
        'confidence_level',
    ];

    protected $casts = [
        'pattern_data' => 'array',
        'effectiveness_score' => 'decimal:2',
        'global_applicable' => 'boolean',
        'last_validated_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    // ===== CONSTANTS =====

    public const TYPE_SUCCESS_PATTERN = 'success_pattern';
    public const TYPE_FAILURE_PATTERN = 'failure_pattern';
    public const TYPE_USER_PREFERENCE = 'user_preference';
    public const TYPE_BUSINESS_INSIGHT = 'business_insight';
    public const TYPE_MARKET_TREND = 'market_trend';
    public const TYPE_SECTOR_KNOWLEDGE = 'sector_knowledge';

    // ===== RELATIONS =====

    /**
     * Les données d'apprentissage appartiennent à un agent intelligent
     */
    public function intelligentAgent(): BelongsTo
    {
        return $this->belongsTo(IntelligentAgent::class);
    }

    /**
     * Les données d'apprentissage appartiennent à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ===== SCOPES =====

    /**
     * Patterns efficaces
     */
    public function scopeEffective($query, float $threshold = 0.7)
    {
        return $query->where('effectiveness_score', '>=', $threshold);
    }

    /**
     * Patterns par type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('learning_type', $type);
    }

    /**
     * Patterns par secteur
     */
    public function scopeBySector($query, string $sector)
    {
        return $query->where('business_sector', $sector);
    }

    /**
     * Patterns applicables globalement
     */
    public function scopeGlobal($query)
    {
        return $query->where('global_applicable', true);
    }

    /**
     * Patterns non expirés
     */
    public function scopeActive($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Patterns avec un niveau de confiance minimum
     */
    public function scopeConfident($query, int $minConfidence = 70)
    {
        return $query->where('confidence_level', '>=', $minConfidence);
    }

    // ===== MÉTHODES =====

    /**
     * Enregistrer un succès pour ce pattern
     */
    public function recordSuccess(): void
    {
        $this->increment('success_count');
        $this->updateEffectivenessScore();
        $this->updateConfidenceLevel();
        $this->touch('last_validated_at');
    }

    /**
     * Enregistrer un échec pour ce pattern
     */
    public function recordFailure(): void
    {
        $this->increment('failure_count');
        $this->updateEffectivenessScore();
        $this->updateConfidenceLevel();
    }

    /**
     * Mettre à jour le score d'efficacité
     */
    private function updateEffectivenessScore(): void
    {
        $total = $this->success_count + $this->failure_count;

        if ($total > 0) {
            $this->effectiveness_score = $this->success_count / $total;
            $this->save();
        }
    }

    /**
     * Mettre à jour le niveau de confiance basé sur l'utilisation
     */
    private function updateConfidenceLevel(): void
    {
        $total = $this->success_count + $this->failure_count;
        $baseScore = $this->effectiveness_score * 100;

        // Plus le pattern est utilisé, plus il gagne en confiance
        $usageBonus = min(20, $total * 2); // Max 20 points bonus
        $this->confidence_level = min(100, $baseScore + $usageBonus);

        $this->save();
    }

    /**
     * Vérifier si le pattern est encore valide
     */
    public function isValid(): bool
    {
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        if ($this->effectiveness_score < 0.3) {
            return false;
        }

        return true;
    }

    /**
     * Vérifier si le pattern est efficace
     */
    public function isEffective(): bool
    {
        return $this->effectiveness_score >= 0.7 && $this->confidence_level >= 70;
    }

    /**
     * Obtenir les tags contextuels comme array
     */
    public function getContextTagsArray(): array
    {
        if (empty($this->context_tags)) {
            return [];
        }

        return array_map('trim', explode(',', $this->context_tags));
    }

    /**
     * Ajouter un tag contextuel
     */
    public function addContextTag(string $tag): void
    {
        $currentTags = $this->getContextTagsArray();

        if (!in_array($tag, $currentTags)) {
            $currentTags[] = $tag;
            $this->context_tags = implode(', ', $currentTags);
            $this->save();
        }
    }

    /**
     * Créer un pattern de succès à partir d'une interaction
     */
    public static function createSuccessPattern(
        AgentInteraction $interaction,
        string $patternKey,
        array $patternData,
        string $description = null
    ): self {
        return self::create([
            'intelligent_agent_id' => $interaction->intelligent_agent_id,
            'user_id' => $interaction->user_id,
            'learning_type' => self::TYPE_SUCCESS_PATTERN,
            'pattern_key' => $patternKey,
            'pattern_data' => $patternData,
            'description' => $description ?? "Pattern créé à partir de l'interaction {$interaction->id}",
            'success_count' => 1,
            'failure_count' => 0,
            'effectiveness_score' => 1.0,
            'business_sector' => $interaction->category,
            'confidence_level' => 60, // Score initial modeste
            'last_validated_at' => now(),
        ]);
    }

    /**
     * Créer un pattern de préférence utilisateur
     */
    public static function createUserPreference(
        int $intelligentAgentId,
        int $userId,
        string $preferenceKey,
        array $preferenceData,
        string $sector = null
    ): self {
        return self::create([
            'intelligent_agent_id' => $intelligentAgentId,
            'user_id' => $userId,
            'learning_type' => self::TYPE_USER_PREFERENCE,
            'pattern_key' => $preferenceKey,
            'pattern_data' => $preferenceData,
            'description' => "Préférence utilisateur pour {$preferenceKey}",
            'effectiveness_score' => 0.8, // Les préférences sont généralement efficaces
            'business_sector' => $sector,
            'confidence_level' => 80,
            'global_applicable' => false, // Les préférences sont spécifiques à l'utilisateur
        ]);
    }

    /**
     * Trouver des patterns similaires
     */
    public function findSimilarPatterns(float $similarityThreshold = 0.8): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('learning_type', $this->learning_type)
            ->where('business_sector', $this->business_sector)
            ->where('id', '!=', $this->id)
            ->where('effectiveness_score', '>=', $similarityThreshold)
            ->get();
    }

    /**
     * Préparer les données pour le frontend
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->learning_type,
            'pattern_key' => $this->pattern_key,
            'description' => $this->description,
            'effectiveness_score' => round($this->effectiveness_score * 100, 1),
            'confidence_level' => $this->confidence_level,
            'success_count' => $this->success_count,
            'failure_count' => $this->failure_count,
            'business_sector' => $this->business_sector,
            'context_tags' => $this->getContextTagsArray(),
            'is_effective' => $this->isEffective(),
            'last_validated' => $this->last_validated_at?->toDateString(),
            'expires_at' => $this->expires_at?->toDateString(),
        ];
    }
}