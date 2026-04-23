<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    protected $fillable = [
        'owner_user_id',
        'name',
        'status',
        'trial_starts_at',
        'trial_ends_at',
        'suspended_at',
        'deleted_at',
        'delivered_at',
        'delivered_to_user_id',
    ];

    protected $casts = [
        'trial_starts_at'      => 'datetime',
        'trial_ends_at'        => 'datetime',
        'suspended_at'         => 'datetime',
        'deleted_at'           => 'datetime',
        'delivered_at'         => 'datetime',
    ];

    public function isDelivered(): bool
    {
        return !is_null($this->delivered_at);
    }

    public function deliveredTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delivered_to_user_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(WorkspaceUser::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(WorkspaceSubscription::class);
    }

    public function activeSubscription(): ?WorkspaceSubscription
    {
        return $this->subscriptions()
            ->whereIn('status', ['trial_active', 'active', 'grace'])
            ->latest()
            ->first();
    }

    public function sites(): HasMany
    {
        return $this->hasMany(UserSite::class);
    }

    public function billingInvoices(): HasMany
    {
        return $this->hasMany(BillingInvoice::class);
    }

    public function lifecycleEvents(): HasMany
    {
        return $this->hasMany(LifecycleEvent::class);
    }

    public function deletionQueue(): HasMany
    {
        return $this->hasMany(DeletionQueue::class);
    }

    public function isTrialActive(): bool
    {
        return $this->status === 'trial_active'
            && $this->trial_ends_at
            && $this->trial_ends_at->isFuture();
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['trial_active', 'active', 'grace']);
    }
}
