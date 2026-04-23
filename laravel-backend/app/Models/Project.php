<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'target_audience',
        'main_objective',
        'obstacles',
        'notes',
        'recommendations',
        'is_active',

        // Nouveaux champs business plan
        'sector',
        'location',
        'founded_year',
        'legal_form',
        'website',
        'email',
        'phone',
        'employees',
        'mission',
        'vision',
        'values',
        'short_term_goals',
        'long_term_goals',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'values' => 'array',
        'short_term_goals' => 'array',
        'long_term_goals' => 'array',
    ];

    /**
     * Get the user that owns the project.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }


    /**
     * Get the weekly content objectives associated with the project.
     */
    public function weeklyContentObjectives(): HasMany
    {
        return $this->hasMany(WeeklyContentObjective::class);
    }

}
