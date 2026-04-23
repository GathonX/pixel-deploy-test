<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'site_id',
        'assigned_to_id',
        'sprint_id',
        'title',
        'description',
        'type', // 'mission', 'vision', 'objective', 'action'
        'priority', // 'high', 'medium', 'low', 'normal'
        'status', // 'pending', 'in-progress', 'completed'
        'scheduled_date',
        'completed_at',
        'order',
        'image_path',
        'reservation_id',
        'reservation_type',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'completed_at' => 'datetime',  // ✅ CORRECTION : datetime simple (nullable par défaut en Laravel)
        'user_id' => 'integer',
    ];

    // ===== RELATIONS =====

    /**
     * ✅ NOUVEAU : Relation avec l'utilisateur propriétaire
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * ✅ EXISTANT : Get the sprint that owns this task.
     */
    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    // ===== MÉTHODES MÉTIER =====

    /**
     * Mark the task as completed.
     */
    public function complete(): self
    {
        $this->status = 'completed';
        $this->completed_at = now();
        $this->save();

        return $this;
    }

    /**
     * Mark the task as in progress.
     */
    public function startProgress(): self
    {
        $this->status = 'in-progress';
        $this->save();

        return $this;
    }

    /**
     * ✅ CORRECTION : Reset the task to pending - gestion correcte du null
     */
    public function resetStatus(): self
    {
        $this->status = 'pending';
        
        // ✅ MÉTHODE 1 : Utiliser l'attribut raw pour forcer null
        $this->attributes['completed_at'] = null;
        $this->save();

        return $this;
    }

    // ===== SCOPES =====

    /**
     * ✅ NOUVEAU : Scope pour les tâches d'un utilisateur
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * ✅ NOUVEAU : Scope pour les tâches terminées
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * ✅ NOUVEAU : Scope pour les tâches en cours
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in-progress');
    }
}