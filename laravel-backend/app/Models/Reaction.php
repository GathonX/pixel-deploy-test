<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Reaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reactable_type',
        'reactable_id',
        'type',
    ];

    // ===== CONSTANTES =====

    const TYPES = [
        'like',
        'love',
        'laugh',
        'angry',
        'sad'
    ];

    // ===== RELATIONS =====

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactable(): MorphTo
    {
        return $this->morphTo();
    }

    // ===== SCOPES =====

    public function scopeType($query, $type)
    {
        return $query->where('type', $type);
    }

    public function scopeLikes($query)
    {
        return $query->where('type', 'like');
    }

    // ===== ÉVÉNEMENTS =====

    protected static function boot()
    {
        parent::boot();

        // Mise à jour du compteur après création
        static::created(function ($reaction) {
            $reaction->updateCounterCache();
        });

        // Mise à jour du compteur après suppression
        static::deleted(function ($reaction) {
            $reaction->updateCounterCache();
        });
    }

    // ===== MÉTHODES UTILITAIRES =====

    public function updateCounterCache()
    {
        if ($this->reactable_type === Comment::class) {
            $comment = Comment::find($this->reactable_id);
            if ($comment) {
                $comment->updateLikesCount();
            }
        }
    }

    public static function toggle(int $userId, string $reactableType, int $reactableId, string $type = 'like')
    {
        $existing = self::where([
            'user_id' => $userId,
            'reactable_type' => $reactableType,
            'reactable_id' => $reactableId,
            'type' => $type
        ])->first();

        if ($existing) {
            $existing->delete();
            return false; // Removed
        } else {
            self::create([
                'user_id' => $userId,
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId,
                'type' => $type
            ]);
            return true; // Added
        }
    }
}