<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SitePlanAssignment extends Model
{
    protected $fillable = [
        'site_id',
        'workspace_subscription_id',
        'dedicated_subscription_id',
        'effective_plan_key',
        'billing_mode',
        'status',
        'starts_at',
        'ends_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function workspaceSubscription(): BelongsTo
    {
        return $this->belongsTo(WorkspaceSubscription::class, 'workspace_subscription_id');
    }

    public function dedicatedSubscription(): BelongsTo
    {
        return $this->belongsTo(WorkspaceSubscription::class, 'dedicated_subscription_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isIncludedInWorkspace(): bool
    {
        return $this->billing_mode === 'included_in_workspace';
    }
}
