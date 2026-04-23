<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkspaceSubscription extends Model
{
    protected $fillable = [
        'workspace_id',
        'plan_key',
        'status',
        'starts_at',
        'ends_at',
        'grace_ends_at',
        'canceled_at',
        'source',
    ];

    protected $casts = [
        'starts_at'      => 'datetime',
        'ends_at'        => 'datetime',
        'grace_ends_at'  => 'datetime',
        'canceled_at'    => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    /**
     * Plan associé depuis la table subscription_plans.
     */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_key', 'plan_key');
    }

    public function sitePlanAssignments(): HasMany
    {
        return $this->hasMany(SitePlanAssignment::class, 'workspace_subscription_id');
    }

    // -------------------------------------------------------------------------
    // Status helpers
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return in_array($this->status, ['trial_active', 'active', 'grace']);
    }

    public function isExpired(): bool
    {
        return in_array($this->status, ['expired', 'suspended', 'canceled']);
    }

    // -------------------------------------------------------------------------
    // Plan entitlements — lus depuis la table, fallback sur valeurs par défaut
    // -------------------------------------------------------------------------

    public function maxPublishedSites(): int
    {
        return $this->plan?->max_published_sites
            ?? match ($this->plan_key) {
                'premium' => 5,
                default   => 1,
            };
    }

    public function includedLanguagesPerSite(): int
    {
        return $this->plan?->included_languages_per_site
            ?? match ($this->plan_key) {
                'pro'     => 2,
                'premium' => 3,
                default   => 1,
            };
    }

    public function extraLanguagePriceAriary(): int
    {
        return $this->plan?->extra_language_price_ariary ?? 15000;
    }

    public function hasAiEnabled(): bool
    {
        return $this->plan?->ai_enabled
            ?? in_array($this->plan_key, ['pro', 'premium']);
    }

    public function maxUsers(): int
    {
        return $this->plan?->max_users ?? 1;
    }
}
