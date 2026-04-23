<?php
// laravel-backend/app/Models/CreditTransaction.php
// ✅ MODÈLE : Transaction de crédits (historique des mouvements)
// ✅ TRAÇABILITÉ : Audit complet des gains/dépenses de crédits

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class CreditTransaction extends Model
{
    use HasFactory;

    /**
     * ✅ Champs assignables en masse
     */
    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'balance_before',
        'balance_after',
        'description',
        'reference_type',
        'reference_id',
        'payment_transaction_id',
        'action_id',
        'package_id',
        'source',
        'ip_address',
        'user_agent',
        'metadata',
        'status',
        'processed_at',
    ];

    /**
     * ✅ Cast des attributs
     */
    protected $casts = [
        'amount' => 'integer',
        'balance_before' => 'integer',
        'balance_after' => 'integer',
        'metadata' => 'array',
        'processed_at' => 'datetime',
    ];

    /**
     * ✅ CONSTANTES - Types de transaction
     */
    public const TYPE_PURCHASE = 'purchase';
    public const TYPE_EARNED_ACTION = 'earned_action';
    public const TYPE_EARNED_REFERRAL = 'earned_referral';
    public const TYPE_EARNED_BONUS = 'earned_bonus';
    public const TYPE_SPENT_GENERATION = 'spent_generation';
    public const TYPE_SPENT_FEATURE = 'spent_feature';
    public const TYPE_AUTO_RECHARGE = 'auto_recharge';
    public const TYPE_ADMIN_ADJUSTMENT = 'admin_adjustment';
    public const TYPE_REFUND = 'refund';
    public const TYPE_EXPIRY = 'expiry';

    public const TYPES = [
        self::TYPE_PURCHASE,
        self::TYPE_EARNED_ACTION,
        self::TYPE_EARNED_REFERRAL,
        self::TYPE_EARNED_BONUS,
        self::TYPE_SPENT_GENERATION,
        self::TYPE_SPENT_FEATURE,
        self::TYPE_AUTO_RECHARGE,
        self::TYPE_ADMIN_ADJUSTMENT,
        self::TYPE_REFUND,
        self::TYPE_EXPIRY,
    ];

    /**
     * ✅ CONSTANTES - Statuts
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_COMPLETED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    /**
     * ✅ CONSTANTES - Sources
     */
    public const SOURCE_SYSTEM = 'system';
    public const SOURCE_ADMIN = 'admin';
    public const SOURCE_API = 'api';
    public const SOURCE_WEBHOOK = 'webhook';
    public const SOURCE_WEB = 'web';

    /**
     * ✅ RELATIONS
     */

    /**
     * Transaction appartient à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Transaction peut être liée à une transaction de paiement
     */
    public function paymentTransaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class);
    }

    /**
     * ✅ SCOPES
     */

    /**
     * Scope pour un utilisateur spécifique
     */
    public function scopeForUser($query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope par type de transaction
     */
    public function scopeOfType($query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    /**
     * Scope pour les gains (montant positif)
     */
    public function scopeEarnings($query): Builder
    {
        return $query->where('amount', '>', 0);
    }

    /**
     * Scope pour les dépenses (montant négatif)
     */
    public function scopeSpending($query): Builder
    {
        return $query->where('amount', '<', 0);
    }

    /**
     * Scope pour les transactions complétées
     */
    public function scopeCompleted($query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope pour une période donnée
     */
    public function scopeBetweenDates($query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope pour ce mois
     */
    public function scopeThisMonth($query): Builder
    {
        return $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
    }

    /**
     * Scope pour aujourd'hui
     */
    public function scopeToday($query): Builder
    {
        return $query->whereDate('created_at', today());
    }

    /**
     * Scope par source
     */
    public function scopeFromSource($query, string $source): Builder
    {
        return $query->where('source', $source);
    }

    /**
     * ✅ MÉTHODES UTILITAIRES
     */

    /**
     * Vérifier si c'est un gain
     */
    public function isEarning(): bool
    {
        return $this->amount > 0;
    }

    /**
     * Vérifier si c'est une dépense
     */
    public function isSpending(): bool
    {
        return $this->amount < 0;
    }

    /**
     * Vérifier si la transaction est complétée
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Obtenir le montant absolu
     */
    public function getAbsoluteAmountAttribute(): int
    {
        return abs($this->amount);
    }

    /**
     * Obtenir la description du type pour l'affichage
     */
    public function getTypeDescriptionAttribute(): string
    {
        return match($this->type) {
            self::TYPE_PURCHASE => 'Achat de crédits',
            self::TYPE_EARNED_ACTION => 'Action complétée',
            self::TYPE_EARNED_REFERRAL => 'Parrainage',
            self::TYPE_EARNED_BONUS => 'Bonus',
            self::TYPE_SPENT_GENERATION => 'Génération IA',
            self::TYPE_SPENT_FEATURE => 'Fonctionnalité',
            self::TYPE_AUTO_RECHARGE => 'Recharge automatique',
            self::TYPE_ADMIN_ADJUSTMENT => 'Ajustement administrateur',
            self::TYPE_REFUND => 'Remboursement',
            self::TYPE_EXPIRY => 'Expiration',
            default => 'Transaction'
        };
    }

    /**
     * Obtenir la couleur pour l'affichage selon le type
     */
    public function getTypeColorAttribute(): string
    {
        if ($this->isEarning()) {
            return match($this->type) {
                self::TYPE_PURCHASE => 'blue',
                self::TYPE_EARNED_ACTION => 'green',
                self::TYPE_EARNED_REFERRAL => 'purple',
                self::TYPE_EARNED_BONUS => 'yellow',
                self::TYPE_AUTO_RECHARGE => 'indigo',
                self::TYPE_REFUND => 'emerald',
                default => 'green'
            };
        }

        return 'red'; // Pour les dépenses
    }

    /**
     * Obtenir l'icône pour l'affichage selon le type
     */
    public function getTypeIconAttribute(): string
    {
        return match($this->type) {
            self::TYPE_PURCHASE => 'shopping-cart',
            self::TYPE_EARNED_ACTION => 'check-circle',
            self::TYPE_EARNED_REFERRAL => 'users',
            self::TYPE_EARNED_BONUS => 'gift',
            self::TYPE_SPENT_GENERATION => 'cpu',
            self::TYPE_SPENT_FEATURE => 'zap',
            self::TYPE_AUTO_RECHARGE => 'refresh-cw',
            self::TYPE_ADMIN_ADJUSTMENT => 'settings',
            self::TYPE_REFUND => 'rotate-ccw',
            self::TYPE_EXPIRY => 'clock',
            default => 'circle'
        };
    }

    /**
     * ✅ MÉTHODES STATIQUES - CRÉATION
     */

    /**
     * Créer une transaction de gain
     */
    public static function createEarning(
        int $userId,
        string $type,
        int $amount,
        string $description,
        array $options = []
    ): self {
        $userCredit = UserCredit::getOrCreateForUser($userId);
        
        return self::create([
            'user_id' => $userId,
            'type' => $type,
            'amount' => abs($amount), // Toujours positif pour les gains
            'balance_before' => $userCredit->current_balance,
            'balance_after' => $userCredit->current_balance + abs($amount),
            'description' => $description,
            'reference_type' => $options['reference_type'] ?? null,
            'reference_id' => $options['reference_id'] ?? null,
            'payment_transaction_id' => $options['payment_transaction_id'] ?? null,
            'action_id' => $options['action_id'] ?? null,
            'package_id' => $options['package_id'] ?? null,
            'source' => $options['source'] ?? self::SOURCE_SYSTEM,
            'ip_address' => $options['ip_address'] ?? request()->ip(),
            'user_agent' => $options['user_agent'] ?? request()->userAgent(),
            'metadata' => $options['metadata'] ?? null,
            'status' => $options['status'] ?? self::STATUS_COMPLETED,
            'processed_at' => now(),
        ]);
    }

    /**
     * Créer une transaction de dépense
     */
    public static function createSpending(
        int $userId,
        string $type,
        int $amount,
        string $description,
        array $options = []
    ): self {
        $userCredit = UserCredit::getOrCreateForUser($userId);
        
        return self::create([
            'user_id' => $userId,
            'type' => $type,
            'amount' => -abs($amount), // Toujours négatif pour les dépenses
            'balance_before' => $userCredit->current_balance,
            'balance_after' => $userCredit->current_balance - abs($amount),
            'description' => $description,
            'reference_type' => $options['reference_type'] ?? null,
            'reference_id' => $options['reference_id'] ?? null,
            'source' => $options['source'] ?? self::SOURCE_SYSTEM,
            'ip_address' => $options['ip_address'] ?? request()->ip(),
            'user_agent' => $options['user_agent'] ?? request()->userAgent(),
            'metadata' => $options['metadata'] ?? null,
            'status' => $options['status'] ?? self::STATUS_COMPLETED,
            'processed_at' => now(),
        ]);
    }

    /**
     * ✅ MÉTHODES STATIQUES - STATISTIQUES
     */

    /**
     * Obtenir les statistiques d'un utilisateur
     */
    public static function getUserStats(int $userId, int $days = 30): array
    {
        $startDate = now()->subDays($days);
        
        $transactions = self::forUser($userId)
            ->completed()
            ->where('created_at', '>=', $startDate)
            ->get();

        return [
            'totalTransactions' => $transactions->count(),
            'totalEarnings' => $transactions->where('amount', '>', 0)->sum('amount'),
            'totalSpending' => abs($transactions->where('amount', '<', 0)->sum('amount')),
            'netChange' => $transactions->sum('amount'),
            'byType' => $transactions->groupBy('type')->map->count(),
            'byDate' => $transactions->groupBy(function ($transaction) {
                return $transaction->created_at->format('Y-m-d');
            })->map->sum('amount'),
        ];
    }

    /**
     * Obtenir l'historique formaté pour le frontend
     */
    public static function getHistoryForUser(int $userId, int $limit = 50): array
    {
        return self::forUser($userId)
            ->completed()
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'typeDescription' => $transaction->type_description,
                    'amount' => $transaction->amount,
                    'absoluteAmount' => $transaction->absolute_amount,
                    'isEarning' => $transaction->isEarning(),
                    'description' => $transaction->description,
                    'balanceBefore' => $transaction->balance_before,
                    'balanceAfter' => $transaction->balance_after,
                    'date' => $transaction->created_at->toDateString(),
                    'time' => $transaction->created_at->format('H:i'),
                    'icon' => $transaction->type_icon,
                    'color' => $transaction->type_color,
                    'source' => $transaction->source,
                ];
            })
            ->toArray();
    }

    /**
     * ✅ ÉVÉNEMENTS DE MODÈLE
     */
    protected static function booted()
    {
        // Vérifier que le balance_after est cohérent
        static::creating(function ($transaction) {
            if ($transaction->balance_after !== ($transaction->balance_before + $transaction->amount)) {
                throw new \Exception('Inconsistent balance calculation in credit transaction');
            }
        });
    }
}