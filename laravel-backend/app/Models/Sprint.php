<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sprint extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'user_feature_access_id', // ✅ NOUVEAU : Lien vers l'achat spécifique
        'project_id',
        'week_number',
        'year',
        'start_date',
        'end_date',
        'title',
        'description',
        'status',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Get the user that owns the sprint.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * ✅ NOUVEAU : Relation vers l'achat spécifique
     */
    public function featureAccess()
    {
        return $this->belongsTo(UserFeatureAccess::class, 'user_feature_access_id');
    }

    /**
     * Get the project this sprint belongs to.
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get all tasks for this sprint.
     */
    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Get tasks for a specific day of the week (0 = Monday, 6 = Sunday)
     */
    public function getDailyTasks($dayOfWeek)
    {
        $date = clone $this->start_date;
        $date->addDays($dayOfWeek);

        return $this->tasks()->whereDate('scheduled_date', $date)->get();
    }
}