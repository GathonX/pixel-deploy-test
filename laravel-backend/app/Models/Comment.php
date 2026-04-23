<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'commentable_type',
        'commentable_id',
        'content',
        'likes_count',
        'parent_id',
        'author_name',
        'author_email',        // ✅ NOUVEAU
        'user_fingerprint',    // ✅ NOUVEAU
        'ip_address',          // ✅ NOUVEAU
        'user_agent',          // ✅ NOUVEAU
    ];

    protected $casts = [
        'likes_count' => 'integer',
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

    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }

    public function reactions(): MorphMany
    {
        return $this->morphMany(Reaction::class, 'reactable');
    }

    // ===== SCOPES =====

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeReplies($query)
    {
        return $query->whereNotNull('parent_id');
    }

    public function scopeByFingerprint($query, string $fingerprint)
    {
        return $query->where('user_fingerprint', $fingerprint);
    }

    public function scopeByIpAddress($query, string $ipAddress)
    {
        return $query->where('ip_address', $ipAddress);
    }

    // ===== ACCESSORS =====

    public function getLikesCountCachedAttribute()
    {
        return $this->reactions()->where('type', 'like')->count();
    }

    public function getRepliesCountAttribute()
    {
        return $this->replies()->count();
    }

    // ✅ AMÉLIORÉ : Nom d'affichage avec logique d'identité
    public function getDisplayNameAttribute(): string
    {
        // 1. Utilisateur connecté
        if ($this->user_id && $this->user) {
            return $this->user->name;
        }
        
        // 2. Visiteur avec nom personnalisé
        if ($this->author_name && $this->author_name !== 'Visiteur') {
            return $this->author_name;
        }
        
        // 3. Fallback anonyme
        return '👤 Anonyme';
    }

    // ✅ NOUVEAU : Vérifier si même utilisateur anonyme
    public function isSameAnonymousUser(string $fingerprint, string $ipAddress = null): bool
    {
        if ($this->user_id) {
            return false; // Utilisateur connecté
        }
        
        // Vérifier par fingerprint (priorité)
        if ($this->user_fingerprint && $fingerprint) {
            return $this->user_fingerprint === $fingerprint;
        }
        
        // Fallback par IP si pas de fingerprint
        if ($this->ip_address && $ipAddress) {
            return $this->ip_address === $ipAddress;
        }
        
        return false;
    }

    // ✅ NOUVEAU : Statistiques d'identité
    public function getIdentityInfoAttribute(): array
    {
        return [
            'type' => $this->user_id ? 'authenticated' : 'anonymous',
            'has_email' => !empty($this->author_email),
            'has_fingerprint' => !empty($this->user_fingerprint),
            'display_name' => $this->display_name
        ];
    }

    // ===== MÉTHODES UTILITAIRES =====

    public function isReply(): bool
    {
        return !is_null($this->parent_id);
    }

    public function isTopLevel(): bool
    {
        return is_null($this->parent_id);
    }

    public function isAnonymous(): bool
    {
        return is_null($this->user_id);
    }

    public function isAuthenticated(): bool
    {
        return !is_null($this->user_id);
    }

    public function updateLikesCount()
    {
        $this->update([
            'likes_count' => $this->reactions()->where('type', 'like')->count()
        ]);
    }

    public function canReply(): bool
    {
        // Limiter les niveaux de réponses pour éviter la complexité
        return $this->isTopLevel();
    }

    // ✅ NOUVEAU : Obtenir d'autres commentaires du même utilisateur anonyme
    public function getOtherCommentsByAnonymousUser(int $limit = 5)
    {
        if ($this->isAuthenticated()) {
            return collect();
        }

        $query = static::where('id', '!=', $this->id)
                      ->whereNull('user_id');

        if ($this->user_fingerprint) {
            $query->where('user_fingerprint', $this->user_fingerprint);
        } elseif ($this->ip_address) {
            $query->where('ip_address', $this->ip_address);
        } else {
            return collect();
        }

        return $query->with(['commentable'])
                    ->orderBy('created_at', 'desc')
                    ->limit($limit)
                    ->get();
    }
}