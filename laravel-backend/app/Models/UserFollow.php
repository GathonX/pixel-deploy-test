<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFollow extends Model
{
    use HasFactory;

    protected $table = 'user_follows';

    protected $fillable = [
        'follower_id',
        'following_id',
    ];

    protected $casts = [
        'follower_id' => 'integer',
        'following_id' => 'integer',
    ];

    /**
     * L'utilisateur qui suit (follower)
     */
    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    /**
     * L'utilisateur suivi (following)
     */
    public function following(): BelongsTo
    {
        return $this->belongsTo(User::class, 'following_id');
    }

    /**
     * Vérifier si un utilisateur suit un autre
     */
    public static function isFollowing(int $followerId, int $followingId): bool
    {
        return self::where('follower_id', $followerId)
                   ->where('following_id', $followingId)
                   ->exists();
    }

    /**
     * Créer une relation de follow
     */
    public static function createFollow(int $followerId, int $followingId): bool
    {
        if ($followerId === $followingId) {
            return false; // Un utilisateur ne peut pas se suivre lui-même
        }

        return self::updateOrCreate([
            'follower_id' => $followerId,
            'following_id' => $followingId,
        ]) ? true : false;
    }

    /**
     * Supprimer une relation de follow
     */
    public static function removeFollow(int $followerId, int $followingId): bool
    {
        return self::where('follower_id', $followerId)
                   ->where('following_id', $followingId)
                   ->delete() > 0;
    }
}