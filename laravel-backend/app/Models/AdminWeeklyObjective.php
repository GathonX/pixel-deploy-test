<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminWeeklyObjective extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_project_info_id',
        'user_id',
        'week_identifier',
        'week_start_date',
        'week_end_date',
        'objective_text',
        'daily_topics',
        'keywords_focus',
        'is_generated',
        'posts_generated_count',
        'posts_target_count',
    ];

    protected $casts = [
        'daily_topics' => 'array',
        'keywords_focus' => 'array',
        'is_generated' => 'boolean',
        'posts_generated_count' => 'integer',
        'posts_target_count' => 'integer',
        'week_start_date' => 'date',
        'week_end_date' => 'date',
    ];

    /**
     * ✅ Relation : Info projet admin
     */
    public function adminProjectInfo(): BelongsTo
    {
        return $this->belongsTo(AdminProjectInfo::class);
    }

    /**
     * ✅ Relation : Admin propriétaire
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * ✅ Relation : Posts de blog générés pour cet objectif
     */
    public function blogPosts(): HasMany
    {
        return $this->hasMany(BlogPost::class, 'admin_weekly_objective_id');
    }

    /**
     * ✅ Incrémenter le compteur de posts générés
     */
    public function incrementPostsCount(): void
    {
        $this->increment('posts_generated_count');
    }

    /**
     * ✅ Vérifier si l'objectif est complet (tous les posts générés)
     */
    public function isComplete(): bool
    {
        return $this->posts_generated_count >= $this->posts_target_count;
    }

    /**
     * ✅ Obtenir le sujet du jour
     */
    public function getTodayTopic(): ?string
    {
        if (!$this->daily_topics || !is_array($this->daily_topics)) {
            return null;
        }

        $dayOfWeek = now()->dayOfWeek; // 0 (dimanche) à 6 (samedi)

        // Ajuster pour commencer lundi (0) à dimanche (6)
        $dayIndex = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1;

        return $this->daily_topics[$dayIndex] ?? null;
    }

    /**
     * ✅ Obtenir progression en %
     */
    public function getProgressPercentage(): int
    {
        if ($this->posts_target_count === 0) {
            return 0;
        }

        return (int) min(100, ($this->posts_generated_count / $this->posts_target_count) * 100);
    }
}
