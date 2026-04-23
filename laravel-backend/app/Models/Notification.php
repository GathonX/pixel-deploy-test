<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Carbon\Carbon;

class Notification extends Model
{
    use HasFactory;

    // ✅ UUID primary key pour compatibilité Laravel
    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * ✅ Générer automatiquement l'UUID à la création
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }

            // ✅ Remplir automatiquement les champs polymorphes si vides
            if (empty($model->notifiable_type) && !empty($model->user_id)) {
                $model->notifiable_type = 'App\\Models\\User';
                $model->notifiable_id = $model->user_id;
            }
        });
    }

    protected $fillable = [
        'id',
        'type',
        'notifiable_type',
        'notifiable_id',
        'data',
        'read_at',
        // Colonnes personnalisées conservées
        'user_id',
        'priority',
        'status',
        'title',
        'message',
        'href',
        'category',
        'tags',
        'show_badge',
        'expires_at'
    ];

    protected $casts = [
        'data' => 'array',
        'tags' => 'array',
        'show_badge' => 'boolean',
        'expires_at' => 'datetime',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * ✅ Relation polymorphe Laravel standard
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Relation avec l'utilisateur (conservée pour compatibilité)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scopes pour filtrer les notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'unread');
    }

    public function scopeRead($query)
    {
        return $query->where('status', 'read');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Marquer comme lue
     */
    public function markAsRead(): void
    {
        $this->update([
            'status' => 'read',
            'read_at' => now()
        ]);
    }

    /**
     * Vérifier si la notification est expirée
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Vérifier si la notification est non lue
     */
    public function isUnread(): bool
    {
        return $this->status === 'unread';
    }

    /**
     * Obtenir les notifications récentes (24h)
     */
    public static function getRecent(int $userId, int $limit = 10)
    {
        return static::where('user_id', $userId)
            ->where('created_at', '>=', now()->subDay())
            ->notExpired()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Compter les notifications non lues
     */
    public static function countUnread(int $userId): int
    {
        return static::where('user_id', $userId)
            ->unread()
            ->notExpired()
            ->count();
    }

    /**
     * Supprimer les notifications expirées
     */
    public static function deleteExpired(): int
    {
        return static::where('expires_at', '<', now())->delete();
    }
}
