<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ContentPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'preferable_type',
        'preferable_id',
        'preference',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relation avec l'utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relation polymorphique avec le contenu
     */
    public function preferable(): MorphTo
    {
        return $this->morphTo();
    }
}
