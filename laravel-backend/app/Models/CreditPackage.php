<?php
// laravel-backend/app/Models/CreditPackage.php
// ✅ MODÈLE : Package de crédits
// ✅ COMPATIBLE : Avec votre interface CreditPackage frontend

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class CreditPackage extends Model
{
    use HasFactory;

    /**
     * ✅ Champs assignables en masse
     */
    protected $fillable = [
        'package_key',
        'name',
        'description',
        'credits',
        'price',
        'original_price',
        'discount_percentage',
        'is_popular',
        'is_best_value',
        'bonus_type',
        'bonus_credits',
        'bonus_description',
        'paypal_product_id',
        'is_active',
        'sort_order',
    ];

    /**
     * ✅ Cast des attributs
     */
    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'discount_percentage' => 'integer',
        'credits' => 'integer',
        'bonus_credits' => 'integer',
        'is_popular' => 'boolean',
        'is_best_value' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * ✅ CONSTANTES - Types de bonus
     */
    public const BONUS_TYPE_CREDITS = 'credits';
    public const BONUS_TYPE_FEATURE = 'feature';
    public const BONUS_TYPE_NONE = 'none';

    public const BONUS_TYPES = [
        self::BONUS_TYPE_CREDITS,
        self::BONUS_TYPE_FEATURE,
        self::BONUS_TYPE_NONE,
    ];

    /**
     * ✅ RELATIONS
     */

    /**
     * Package peut être acheté plusieurs fois
     */
    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'package_id', 'package_key');
    }

    /**
     * Package peut être utilisé dans les recharges auto
     */
    public function autoRechargeLogs(): HasMany
    {
        return $this->hasMany(AutoRechargeLog::class);
    }

    /**
     * ✅ SCOPES
     */

    /**
     * Scope pour les packages actifs
     */
    public function scopeActive($query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour les packages populaires
     */
    public function scopePopular($query): Builder
    {
        return $query->where('is_popular', true);
    }

    /**
     * Scope pour les meilleures valeurs
     */
    public function scopeBestValue($query): Builder
    {
        return $query->where('is_best_value', true);
    }

    /**
     * Scope pour ordonner par ordre d'affichage
     */
    public function scopeOrdered($query): Builder
    {
        return $query->orderBy('sort_order')
                    ->orderBy('price');
    }

    /**
     * Scope pour les packages avec bonus
     */
    public function scopeWithBonus($query): Builder
    {
        return $query->where('bonus_type', '!=', self::BONUS_TYPE_NONE);
    }

    /**
     * Scope par clé de package
     */
    public function scopeByKey($query, string $packageKey): Builder
    {
        return $query->where('package_key', $packageKey);
    }

    /**
     * ✅ MÉTHODES UTILITAIRES
     */

    /**
     * Vérifier si le package a une réduction
     */
    public function hasDiscount(): bool
    {
        return $this->discount_percentage > 0;
    }

    /**
     * Vérifier si le package a un bonus
     */
    public function hasBonus(): bool
    {
        return $this->bonus_type !== self::BONUS_TYPE_NONE;
    }

    /**
     * Vérifier si le package a un bonus en crédits
     */
    public function hasCreditBonus(): bool
    {
        return $this->bonus_type === self::BONUS_TYPE_CREDITS && $this->bonus_credits > 0;
    }

    /**
     * Obtenir le total de crédits (inclus bonus)
     */
    public function getTotalCreditsAttribute(): int
    {
        $total = $this->credits;
        
        if ($this->hasCreditBonus()) {
            $total += $this->bonus_credits;
        }
        
        return $total;
    }

    /**
     * Obtenir le prix par crédit
     */
    public function getPricePerCreditAttribute(): float
    {
        if ($this->total_credits === 0) {
            return 0;
        }
        
        return round($this->price / $this->total_credits, 3);
    }

    /**
     * Obtenir l'économie en euros
     */
    public function getSavingsAmountAttribute(): float
    {
        if (!$this->hasDiscount()) {
            return 0;
        }
        
        return $this->original_price - $this->price;
    }

    /**
     * Obtenir le montant avec TVA
     */
    public function getPriceWithTaxAttribute(): float
    {
        return $this->price * 1.2; // TVA 20%
    }

    /**
     * Vérifier si c'est la meilleure valeur parmi tous les packages
     */
    public function isBestValueOverall(): bool
    {
        $bestPricePerCredit = self::active()
            ->min('price_per_credit');
            
        return $this->price_per_credit <= $bestPricePerCredit;
    }

    /**
     * Obtenir la classe CSS pour le badge
     */
    public function getBadgeClassAttribute(): string
    {
        if ($this->is_popular) {
            return 'bg-blue-500 text-white';
        }
        
        if ($this->is_best_value) {
            return 'bg-green-500 text-white';
        }
        
        return 'bg-gray-100 text-gray-800';
    }

    /**
     * Obtenir le texte du badge
     */
    public function getBadgeTextAttribute(): ?string
    {
        if ($this->is_popular) {
            return 'Plus populaire';
        }
        
        if ($this->is_best_value) {
            return 'Meilleure valeur';
        }
        
        return null;
    }

    /**
     * Formater la description du bonus
     */
    public function getFormattedBonusAttribute(): ?string
    {
        if (!$this->hasBonus()) {
            return null;
        }
        
        if ($this->hasCreditBonus()) {
            return "+{$this->bonus_credits} crédits bonus";
        }
        
        return $this->bonus_description;
    }

    /**
     * ✅ MÉTHODES STATIQUES
     */

    /**
     * Trouver un package par sa clé
     */
    public static function findByKey(string $packageKey): ?self
    {
        return self::where('package_key', $packageKey)->first();
    }

    /**
     * Obtenir les packages recommandés (populaires + best value)
     */
    public static function getRecommended()
    {
        return self::active()
            ->where(function ($query) {
                $query->where('is_popular', true)
                      ->orWhere('is_best_value', true);
            })
            ->ordered()
            ->get();
    }

    /**
     * Obtenir tous les packages pour l'affichage frontend
     */
    public static function getForFrontend()
    {
        return self::active()
            ->ordered()
            ->get()
            ->map(function ($package) {
                return [
                    'id' => $package->package_key,
                    'name' => $package->name,
                    'description' => $package->description,
                    'credits' => $package->credits,
                    'price' => $package->price,
                    'originalPrice' => $package->original_price,
                    'discount' => $package->discount_percentage,
                    'popular' => $package->is_popular,
                    'bestValue' => $package->is_best_value,
                    'bonus' => $package->hasBonus() ? [
                        'type' => $package->bonus_type,
                        'value' => $package->bonus_credits,
                        'description' => $package->formatted_bonus,
                    ] : null,
                    'paypalProductId' => $package->paypal_product_id,
                    'totalCredits' => $package->total_credits,
                    'pricePerCredit' => $package->price_per_credit,
                    'priceWithTax' => $package->price_with_tax,
                ];
            });
    }

    /**
     * ✅ ÉVÉNEMENTS DE MODÈLE
     */
    protected static function booted()
    {
        // Calculer automatiquement le pourcentage de réduction
        static::saving(function ($package) {
            if ($package->original_price > 0 && $package->price > 0) {
                $package->discount_percentage = round(
                    (($package->original_price - $package->price) / $package->original_price) * 100
                );
            }
        });
    }
}