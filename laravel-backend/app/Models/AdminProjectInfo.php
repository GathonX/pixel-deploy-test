<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminProjectInfo extends Model
{
    use HasFactory;

    protected $table = 'admin_project_info';

    protected $fillable = [
        'user_id',
        'business_name',
        'business_description',
        'business_ideas',
        'target_audience',
        'keywords',
        'industry',
        'content_goals',
        'tone_of_voice',
        'content_themes',
        'auto_generation_enabled',
        'posts_per_week',
        'last_objective_generated_at',
        'current_week_identifier',
    ];

    protected $casts = [
        'business_ideas' => 'array',
        'target_audience' => 'array',
        'keywords' => 'array',
        'content_themes' => 'array',
        'auto_generation_enabled' => 'boolean',
        'posts_per_week' => 'integer',
        'last_objective_generated_at' => 'datetime',
    ];

    /**
     * ✅ Relation : Admin qui a créé ces informations
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * ✅ Relation : Objectifs hebdomadaires générés pour l'admin
     */
    public function weeklyObjectives(): HasMany
    {
        return $this->hasMany(AdminWeeklyObjective::class, 'admin_project_info_id');
    }

    /**
     * ✅ Vérifier si génération automatique est activée
     */
    public function isAutoGenerationEnabled(): bool
    {
        return $this->auto_generation_enabled === true;
    }

    /**
     * ✅ Obtenir l'objectif de la semaine courante
     */
    public function getCurrentWeekObjective(): ?AdminWeeklyObjective
    {
        $weekIdentifier = now()->format('Y-W');

        return $this->weeklyObjectives()
            ->where('week_identifier', $weekIdentifier)
            ->first();
    }

    /**
     * ✅ Vérifier si un objectif existe pour cette semaine
     */
    public function hasObjectiveThisWeek(): bool
    {
        return $this->getCurrentWeekObjective() !== null;
    }

    /**
     * ✅ Obtenir toutes les idées formatées pour l'IA
     */
    public function getFormattedIdeasForAI(): string
    {
        $ideas = [];

        if ($this->business_name) {
            $ideas[] = "Business: {$this->business_name}";
        }

        if ($this->business_description) {
            $ideas[] = "Description: {$this->business_description}";
        }

        if ($this->business_ideas && is_array($this->business_ideas)) {
            $ideas[] = "Idées principales: " . implode(', ', $this->business_ideas);
        }

        if ($this->target_audience && is_array($this->target_audience)) {
            $ideas[] = "Public cible: " . implode(', ', $this->target_audience);
        }

        if ($this->keywords && is_array($this->keywords)) {
            $ideas[] = "Mots-clés: " . implode(', ', $this->keywords);
        }

        if ($this->industry) {
            $ideas[] = "Secteur: {$this->industry}";
        }

        if ($this->content_goals) {
            $ideas[] = "Objectifs de contenu: {$this->content_goals}";
        }

        if ($this->content_themes && is_array($this->content_themes)) {
            $ideas[] = "Thèmes: " . implode(', ', $this->content_themes);
        }

        return implode("\n", $ideas);
    }

    /**
     * ✅ Marquer que l'objectif a été généré cette semaine
     */
    public function markObjectiveGenerated(): void
    {
        $this->update([
            'last_objective_generated_at' => now(),
            'current_week_identifier' => now()->format('Y-W')
        ]);
    }
}
