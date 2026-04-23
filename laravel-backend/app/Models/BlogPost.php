<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_feature_access_id', // ✅ NOUVEAU : Lien vers l'achat spécifique
        'admin_weekly_objective_id', // ✅ NOUVEAU : Lien vers objectif hebdomadaire admin
        'slug',
        'title',
        'summary',
        'content',
        'content_hash', // ✅ NOUVEAU : Hash pour anti-doublons de contenu
        'header_image',
        'published_at',
        'status',
        'scheduled_at', // ✅ AJOUTÉ : Date/heure de publication programmée
        'scheduled_time',
        'likes',
        'views',
        'shares', // ✅ AJOUTÉ : Support des partages
        'is_ai_generated',
        'generation_context',
        'tags',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime', // ✅ AJOUTÉ : Date/heure de publication programmée
        'scheduled_time' => 'string', // Time field, pas datetime
        'is_ai_generated' => 'boolean',
        'generation_context' => 'array',
        'tags' => 'array',
    ];

    // ===== RELATIONS =====
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function author(): BelongsTo
    {
        return $this->user();
    }

    // ✅ NOUVEAU : Relation vers l'achat spécifique
    public function featureAccess(): BelongsTo
    {
        return $this->belongsTo(UserFeatureAccess::class, 'user_feature_access_id');
    }

    // ✅ NOUVEAU : Relation vers objectif hebdomadaire admin
    public function adminWeeklyObjective(): BelongsTo
    {
        return $this->belongsTo(AdminWeeklyObjective::class, 'admin_weekly_objective_id');
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'blog_post_category');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    // ===== SCOPES =====
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeScheduled($query)
    {
        return $query->where('status', 'scheduled');
    }

    // ===== MUTATORS =====
    public function setTitleAttribute($value)
    {
        $this->attributes['title'] = $value;
        if (empty($this->attributes['slug'])) {
            $slug = Str::slug($value);
            $originalSlug = $slug;
            $counter = 1;
            
            // ✅ Vérifier l'unicité du slug
            while (static::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }
            
            $this->attributes['slug'] = $slug;
        }
    }

    // ===== ACCESSORS =====
    public function getLikesCountAttribute()
    {
        return $this->reactions()->where('type', 'like')->count();
    }

    public function getCommentsCountAttribute()
    {
        return $this->comments()->count();
    }

    // ✅ NOUVEAU : Accessor pour les partages
    public function getSharesCountAttribute()
    {
        return $this->shares ?? 0;
    }

    // ===== MÉTHODES UTILITAIRES =====
    public function incrementViews()
    {
        $this->increment('views');
    }

    // ✅ NOUVEAU : Incrémenter les partages
    public function incrementShares()
    {
        $this->increment('shares');
        return $this->fresh()->shares;
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isScheduled(): bool
    {
        return $this->status === 'scheduled';
    }

    // ✅ NOUVEAU : Obtenir les statistiques complètes
    public function getInteractionStats(): array
    {
        return [
            'views' => $this->views ?? 0,
            'likes' => $this->reactions()->where('type', 'like')->count(),
            'comments' => $this->comments()->count(),
            'shares' => $this->shares ?? 0,
        ];
    }
}