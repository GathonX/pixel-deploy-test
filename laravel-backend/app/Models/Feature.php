<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Feature extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'description',
        'price',
        'category',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Calculer le prix pour une période donnée avec réduction
     */
    public function getPriceForPeriod(string $period = 'monthly'): float
    {
        if ($period === 'yearly') {
            // Prix annuel = prix mensuel × 12 avec 20% de réduction
            return round($this->price * 12 * 0.8, 2);
        }

        return (float) $this->price;
    }

    /**
     * Obtenir les détails de prix pour les deux périodes
     */
    public function getPricingDetails(): array
    {
        $monthlyPrice = $this->getPriceForPeriod('monthly');
        $yearlyPrice = $this->getPriceForPeriod('yearly');
        $yearlyPriceWithoutDiscount = $this->price * 12;
        $savings = $yearlyPriceWithoutDiscount - $yearlyPrice;

        return [
            'monthly' => [
                'price' => $monthlyPrice,
                'period' => 'monthly',
                'display' => $monthlyPrice . '€/mois',
            ],
            'yearly' => [
                'price' => $yearlyPrice,
                'period' => 'yearly',
                'original_price' => $yearlyPriceWithoutDiscount,
                'discount_percentage' => 20,
                'savings' => $savings,
                'display' => $yearlyPrice . '€/an',
                'monthly_equivalent' => round($yearlyPrice / 12, 2),
            ],
        ];
    }

    // Ajoute ceci pour exposer automatiquement le pricing complet
    public function getPricingAttribute()
    {
        return $this->getPricingDetails();
    }

    public function userAccess(): HasMany
    {
        return $this->hasMany(UserFeatureAccess::class);
    }

    public function activationRequests(): HasMany
    {
        return $this->hasMany(FeatureActivationRequest::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function hasUserAccess(int $userId): bool
    {
        // ✅ BASÉ SUR LA DATE : Vérifier expires_at directement
        return $this->userAccess()
            ->where('user_id', $userId)
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where(function($query) {
                // ✅ Actif = pas d'expiration OU expiration dans le futur
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->exists();
    }
}

