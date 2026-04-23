<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class UserFeatureAccess extends Model
{
    use HasFactory;

    protected $table = 'user_feature_access';

    protected $fillable = [
        'user_id',
        'feature_id',
        'admin_enabled',
        'user_activated',
        'admin_enabled_at',
        'user_activated_at',
        'admin_enabled_by',
        'amount_paid',
        'payment_method',
        'admin_notes',
        'status',
        'expires_at',
        'billing_period', // monthly ou yearly
        'original_price',
        'discount_percentage',
        'enabled_platforms', // ✅ NOUVEAU : Plateformes sociales activées
    ];

    protected $casts = [
        'admin_enabled' => 'boolean',
        'user_activated' => 'boolean',
        'admin_enabled_at' => 'datetime',
        'user_activated_at' => 'datetime',
        'amount_paid' => 'decimal:2',
        'expires_at' => 'datetime',
        'original_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'enabled_platforms' => 'array', // ✅ NOUVEAU : Cast JSON vers array
    ];

    // ✅ NOUVEAU : Scopes pour expiration
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
                    ->where('admin_enabled', true)
                    ->where('user_activated', true)
                    ->where(function($q) {
                        // ✅ CORRECTION : Comparer avec now() (avec l'heure)
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                    });
    }

    public function scopeExpired(Builder $query): Builder
    {
        // ✅ CORRECTION : Comparer avec now() (avec l'heure) pour détecter expirations en temps réel
        return $query->where('expires_at', '<=', now())
                    ->whereNotNull('expires_at');
    }

    // ✅ NOUVEAU : Méthodes d'expiration
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        // ✅ CORRECTION : Comparer avec now() (avec l'heure exacte)
        // Une fonctionnalité expire à l'heure exacte indiquée dans expires_at
        return $this->expires_at->isPast();
    }

    public function isActive(): bool
    {
        return $this->admin_enabled &&
               $this->user_activated &&
               $this->status === 'active' &&
               !$this->isExpired();
    }

    public function getDaysRemaining(): ?int
    {
        if (!$this->expires_at) {
            return null;
        }

        // ✅ CORRECTION : Calculer en fonction de l'heure exacte
        // Si expires_at est dans le passé, retourner 0
        if ($this->expires_at->isPast()) {
            return 0;
        }

        // Calculer la différence en jours (arrondi vers le haut)
        // Exemple: reste 0.5 jour (12h) → afficher "0 jours" (expire aujourd'hui)
        $diff = now()->diffInDays($this->expires_at, false);

        // Si moins d'un jour complet, retourner 0 (expire aujourd'hui)
        return (int) floor($diff);
    }

    public function markAsExpired(): bool
    {
        return $this->update([
            'status' => 'expired',
            'user_activated' => false,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(Feature::class);
    }

    public function adminEnabledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_enabled_by');
    }

    public function enableByAdmin(int $adminId, ?string $notes = null): bool
    {
        // Calculer la durée d'expiration selon la période
        $days = $this->billing_period === 'yearly' ? 365 : 30;

        return $this->update([
            'admin_enabled' => true,
            'user_activated' => false, // ✅ L'utilisateur doit activer manuellement
            'admin_enabled_at' => now(),
            'expires_at' => now()->addDays($days), // ✅ 30 jours pour mensuel, 365 pour annuel
            'admin_enabled_by' => $adminId,
            'admin_notes' => $notes,
            'status' => 'active',
        ]);
    }

    public function activateByUser(): bool
    {
        if (!$this->admin_enabled) {
            return false;
        }

        // ✅ CORRECTION : Ne pas redéfinir expires_at, il est déjà défini à l'approbation admin
        return $this->update([
            'user_activated' => true,
            'user_activated_at' => now(),
        ]);
    }

    public function deactivateByUser(): bool
    {
        return $this->update([
            'user_activated' => false,
            'user_activated_at' => null,
        ]);
    }

    // ✅ SUPPRIMÉ : Plus de renouvellement - chaque achat = nouveau UserFeatureAccess
    // Pour "renouveler", l'utilisateur doit faire un NOUVEL achat via la page d'achat

    /**
     * Obtenir la durée en jours selon la période
     */
    public function getDurationInDays(): int
    {
        return $this->billing_period === 'yearly' ? 365 : 30;
    }

    /**
     * Obtenir le libellé de la période
     */
    public function getPeriodLabel(): string
    {
        return $this->billing_period === 'yearly' ? 'an' : 'mois';
    }
}
