<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LifecycleEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'workspace_id',
        'site_id',
        'event_type',
        'event_at',
        'payload_json',
        'created_at',
    ];

    protected $casts = [
        'event_at'     => 'datetime',
        'payload_json' => 'array',
        'created_at'   => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }
}
