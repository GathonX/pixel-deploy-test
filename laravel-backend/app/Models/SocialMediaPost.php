<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SocialMediaPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_feature_access_id', // ✅ NOUVEAU : Lien vers l'achat spécifique
        'platform',
        'content',
        'content_hash', // ✅ NOUVEAU : Hash pour anti-doublons de contenu
        'images',
        'video',
        'published_at',
        'status',
        'scheduled_time',
        'likes',
        'comments',
        'shares',
        'views',
        'is_ai_generated',
        'generation_context',
        'tags',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_time' => 'string', // Time field, pas datetime
        'is_ai_generated' => 'boolean',
        'images' => 'array',
        'generation_context' => 'array',
        'tags' => 'array',
    ];

    // ===== CONSTANTES =====
    const PLATFORMS = [
        'facebook',
        'instagram',
        'twitter',
        'linkedin'
    ];

    const STATUSES = [
        'draft',
        'scheduled',
        'published'
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

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'social_media_post_category');
    }

    public function postComments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    // ===== SCOPES =====
    public function scopePlatform($query, $platform)
    {
        return $query->where('platform', $platform);
    }

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

    // ===== ACCESSORS =====
    public function getLikesCountAttribute()
    {
        return $this->reactions()->where('type', 'like')->count();
    }

    public function getCommentsCountAttribute()
    {
        return $this->postComments()->count();
    }

    public function getFirstImageAttribute()
    {
        return $this->images[0] ?? null;
    }

    // ===== MÉTHODES UTILITAIRES =====
    public function incrementViews()
    {
        $this->increment('views');
    }

    public function incrementShares()
    {
        $this->increment('shares');
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

    public function getCharacterLimit(): int
    {
        return match($this->platform) {
            'twitter' => 280,
            'facebook' => 2000,
            'instagram' => 2200,
            'linkedin' => 3000,
            default => 2000
        };
    }
}
