<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

/**
 * Plan d'abonnement PixelRise Workspace.
 *
 * Colonnes métier clés :
 *   plan_key                    string   starter | pro | premium
 *   price_ariary_monthly        int      tarif mensuel en Ariary
 *   max_published_sites         int      nb max de sites publiés inclus
 *   ai_enabled                  bool     accès aux fonctionnalités IA
 *   included_languages_per_site int      langues incluses par site
 *   extra_language_price_ariary int      surcoût par langue supplémentaire
 *   max_users                   int      nb max de membres workspace
 */
class SubscriptionPlan extends Model
{
    protected $fillable = [
        'plan_key',
        'name',
        'description',
        'is_active',
        'is_popular',
        'is_recommended',
        'sort_order',
        'price_ariary_monthly',
        'price_ariary_yearly',
        'max_published_sites',
        'ai_enabled',
        'included_languages_per_site',
        'extra_language_price_ariary',
        'max_users',
        'extra_user_price_ariary',
        'features',
    ];

    protected $casts = [
        'is_active'                   => 'boolean',
        'is_popular'                  => 'boolean',
        'is_recommended'              => 'boolean',
        'ai_enabled'                  => 'boolean',
        'features'                    => 'array',
        'max_published_sites'         => 'integer',
        'included_languages_per_site' => 'integer',
        'extra_language_price_ariary' => 'integer',
        'max_users'                   => 'integer',
        'extra_user_price_ariary'     => 'integer',
        'price_ariary_monthly'        => 'integer',
        'price_ariary_yearly'         => 'integer',
        'sort_order'                  => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function workspaceSubscriptions(): HasMany
    {
        return $this->hasMany(WorkspaceSubscription::class, 'plan_key', 'plan_key');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('price_ariary_monthly');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public static function findByKey(string $planKey): ?self
    {
        return static::where('plan_key', $planKey)->first();
    }

    /**
     * Renvoie les entitlements du plan sous forme de tableau simple.
     * Utilisé par PlanResolver et les controllers.
     */
    public function toEntitlements(): array
    {
        return [
            'plan_key'                    => $this->plan_key,
            'max_published_sites'         => $this->max_published_sites,
            'ai_enabled'                  => $this->ai_enabled,
            'included_languages_per_site' => $this->included_languages_per_site,
            'extra_language_price_ariary' => $this->extra_language_price_ariary,
            'max_users'                   => $this->max_users,
            'extra_user_price_ariary'     => $this->extra_user_price_ariary,
        ];
    }

    /**
     * Label d'affichage frontend.
     */
    public function getLabel(): string
    {
        return match ($this->plan_key) {
            'starter' => 'Starter',
            'pro'     => 'Pro',
            'premium' => 'Premium',
            default   => ucfirst($this->plan_key),
        };
    }

    /**
     * Couleur Tailwind pour le badge frontend.
     */
    public function getBadgeColor(): string
    {
        return match ($this->plan_key) {
            'pro'     => 'bg-blue-100 text-blue-700 border-blue-200',
            'premium' => 'bg-purple-100 text-purple-700 border-purple-200',
            default   => 'bg-slate-100 text-slate-600 border-slate-200',
        };
    }
}
