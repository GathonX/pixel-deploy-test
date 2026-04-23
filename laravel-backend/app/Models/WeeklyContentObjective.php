<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WeeklyContentObjective extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'week_identifier',
        'content_type',
        'objectives',
        'is_generated',
        'week_start_date',
        'week_end_date',
    ];

    protected $casts = [
        'objectives' => 'array',
        'is_generated' => 'boolean',
        'week_start_date' => 'datetime',
        'week_end_date' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
