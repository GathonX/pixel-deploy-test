<?php
// laravel-backend/app/Models/AutoRechargeLog.php
// ✅ MODÈLE : Log de recharge automatique
// ✅ TRAÇABILITÉ : Historique complet des recharges automatiques

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class AutoRechargeLog extends Model
{
    use HasFactory;

    /**
     * ✅ Champs assignables en masse
     */
    protected $fillable = [
        'user_id',
        'credit_package_id',
        'payment_transaction_id',
        'trigger_balance',
        'threshold_configured',
        'trigger_action',
        'package_id_used',
        'credits_recharged',
        'amount_charged',
        'currency',
        'status',
        'triggered_at',
        'started_processing_at',
        'completed_at',
        'failed_at',
        'paypal_order_id',
        'paypal_response',
        'error_code',
        'error_message',
        'error_details',
        'retry_count',
        'next_retry_at',
        'monthly_limit_configured',
        'monthly_usage_before',
        'monthly_usage_after',
        'month_year',
        'limit_check_passed',
        'limit_check_details',
        'ip_address',
        'user_agent',
        'security_checks',
        'balance_before_recharge',
        'balance_after_recharge',
        'user_notified',
        'user_notified_at',
        'notification_details',
        'metadata',
    ];

    /**
     * ✅ Cast des attributs
     */
    protected $casts = [
        'trigger_balance' => 'integer',
        'threshold_configured' => 'integer',
        'credits_recharged' => 'integer',
        'amount_charged' => 'decimal:2',
        'triggered_at' => 'datetime',
        'started_processing_at' => 'datetime',
        'completed_at' => 'datetime',
        'failed_at' => 'datetime',
        'paypal_response' => 'array',
        'retry_count' => 'integer',
        'next_retry_at' => 'datetime',
        'monthly_limit_configured' => 'integer',
        'monthly_usage_before' => 'integer',
        'monthly_usage_after' => 'integer',
        'month_year' => 'date',
        'limit_check_passed' => 'boolean',
        'security_checks' => 'array',
        'balance_before_recharge' => 'integer',
        'balance_after_recharge' => 'integer',
        'user_notified' => 'boolean',
        'user_notified_at' => 'datetime',
        'notification_details' => 'array',
        'metadata' => 'array',
    ];

    /**
     * ✅ CONSTANTES - Statuts de recharge
     */
    public const STATUS_TRIGGERED = 'triggered';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_TRIGGERED,
        self::STATUS_PROCESSING,
        self::STATUS_COMPLETED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    /**
     * ✅ RELATIONS
     */

    /**
     * Log appartient à un utilisateur
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Log peut être lié à un package de crédits
     */
    public function creditPackage(): BelongsTo
    {
        return $this->belongsTo(CreditPackage::class);
    }

    /**
     * Log peut être lié à une transaction de paiement
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
     * Scope par statut
     */
    public function scopeWithStatus($query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Scope pour les recharges complétées
     */
    public function scopeCompleted($query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope pour les recharges échouées
     */
    public function scopeFailed($query): Builder
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope pour les recharges en cours
     */
    public function scopeProcessing($query): Builder
    {
        return $query->where('status', self::STATUS_PROCESSING);
    }

    /**
     * Scope pour une période donnée
     */
    public function scopeBetweenDates($query, Carbon $startDate, Carbon $endDate): Builder
    {
        return $query->whereBetween('triggered_at', [$startDate, $endDate]);
    }

    /**
     * Scope pour ce mois
     */
    public function scopeThisMonth($query): Builder
    {
        return $query->whereMonth('triggered_at', now()->month)
                    ->whereYear('triggered_at', now()->year);
    }

    /**
     * Scope pour les recharges nécessitant un retry
     */
    public function scopeNeedingRetry($query): Builder
    {
        return $query->where('status', self::STATUS_FAILED)
                    ->where('retry_count', '<', 3)
                    ->where('next_retry_at', '<=', now());
    }

    /**
     * ✅ MÉTHODES UTILITAIRES - STATUTS
     */

    /**
     * Vérifier si la recharge a été déclenchée
     */
    public function isTriggered(): bool
    {
        return $this->status === self::STATUS_TRIGGERED;
    }

    /**
     * Vérifier si la recharge est en cours
     */
    public function isProcessing(): bool
    {
        return $this->status === self::STATUS_PROCESSING;
    }

    /**
     * Vérifier si la recharge est complétée
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Vérifier si la recharge a échoué
     */
    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Vérifier si la recharge a été annulée
     */
    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * ✅ MÉTHODES - ACTIONS DE STATUT
     */

    /**
     * Marquer comme en cours de traitement
     */
    public function markAsProcessing(): bool
    {
        return $this->update([
            'status' => self::STATUS_PROCESSING,
            'started_processing_at' => now(),
        ]);
    }

    /**
     * Marquer comme complétée
     */
    public function markAsCompleted(int $creditsAdded, int $finalBalance): bool
    {
        return $this->update([
            'status' => self::STATUS_COMPLETED,
            'completed_at' => now(),
            'credits_recharged' => $creditsAdded,
            'balance_after_recharge' => $finalBalance,
            'monthly_usage_after' => $this->monthly_usage_before + $this->amount_charged,
        ]);
    }

    /**
     * Marquer comme échouée
     */
    public function markAsFailed(string $errorCode, string $errorMessage, array $errorDetails = []): bool
    {
        $nextRetry = $this->retry_count < 3 
            ? now()->addMinutes(pow(2, $this->retry_count) * 5) // Backoff exponentiel
            : null;

        return $this->update([
            'status' => self::STATUS_FAILED,
            'failed_at' => now(),
            'error_code' => $errorCode,
            'error_message' => $errorMessage,
            'error_details' => $errorDetails,
            'next_retry_at' => $nextRetry,
        ]);
    }

    /**
     * Marquer comme annulée
     */
    public function markAsCancelled(string $reason = null): bool
    {
        $metadata = $this->metadata ?? [];
        if ($reason) {
            $metadata['cancellation_reason'] = $reason;
        }

        return $this->update([
            'status' => self::STATUS_CANCELLED,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Incrémenter le compteur de retry
     */
    public function incrementRetryCount(): bool
    {
        return $this->increment('retry_count');
    }

    /**
     * ✅ MÉTHODES - GESTION DES LIMITES
     */

    /**
     * Vérifier si les limites mensuelles sont respectées
     */
    public function checkMonthlyLimits(): array
    {
        $usage = $this->monthly_usage_before + $this->amount_charged;
        $passed = $usage <= $this->monthly_limit_configured;

        $details = [
            'usage_before' => $this->monthly_usage_before,
            'amount_to_charge' => $this->amount_charged,
            'usage_after' => $usage,
            'limit_configured' => $this->monthly_limit_configured,
            'limit_remaining' => max(0, $this->monthly_limit_configured - $usage),
            'passed' => $passed,
            'checked_at' => now()->toISOString(),
        ];

        $this->update([
            'limit_check_passed' => $passed,
            'limit_check_details' => json_encode($details),
        ]);

        return $details;
    }

    /**
     * ✅ MÉTHODES - NOTIFICATIONS
     */

    /**
     * Marquer l'utilisateur comme notifié
     */
    public function markUserNotified(array $notificationDetails = []): bool
    {
        return $this->update([
            'user_notified' => true,
            'user_notified_at' => now(),
            'notification_details' => $notificationDetails,
        ]);
    }

    /**
     * ✅ MÉTHODES D'AFFICHAGE
     */

    /**
     * Obtenir la description du statut
     */
    public function getStatusDescriptionAttribute(): string
    {
        return match($this->status) {
            self::STATUS_TRIGGERED => 'Déclenchée',
            self::STATUS_PROCESSING => 'En cours',
            self::STATUS_COMPLETED => 'Complétée',
            self::STATUS_FAILED => 'Échouée',
            self::STATUS_CANCELLED => 'Annulée',
            default => 'Inconnu'
        };
    }

    /**
     * Obtenir la couleur du statut
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            self::STATUS_TRIGGERED => 'blue',
            self::STATUS_PROCESSING => 'yellow',
            self::STATUS_COMPLETED => 'green',
            self::STATUS_FAILED => 'red',
            self::STATUS_CANCELLED => 'gray',
            default => 'gray'
        };
    }

    /**
     * Obtenir la durée de traitement
     */
    public function getProcessingDurationAttribute(): ?string
    {
        if (!$this->started_processing_at) {
            return null;
        }

        $endTime = $this->completed_at ?: $this->failed_at ?: now();
        $duration = $this->started_processing_at->diffInSeconds($endTime);

        if ($duration < 60) {
            return "{$duration}s";
        } elseif ($duration < 3600) {
            return round($duration / 60, 1) . 'm';
        } else {
            return round($duration / 3600, 1) . 'h';
        }
    }

    /**
     * Formater pour l'affichage frontend
     */
    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'packageUsed' => $this->package_id_used,
            'packageName' => $this->creditPackage->name ?? null,
            'triggerBalance' => $this->trigger_balance,
            'thresholdConfigured' => $this->threshold_configured,
            'triggerAction' => $this->trigger_action,
            'creditsRecharged' => $this->credits_recharged,
            'amountCharged' => $this->amount_charged,
            'currency' => $this->currency,
            'status' => $this->status,
            'statusDescription' => $this->status_description,
            'statusColor' => $this->status_color,
            'triggeredAt' => $this->triggered_at->toDateString(),
            'triggeredAtTime' => $this->triggered_at->format('H:i'),
            'completedAt' => $this->completed_at?->toDateString(),
            'processingDuration' => $this->processing_duration,
            'balanceBeforeRecharge' => $this->balance_before_recharge,
            'balanceAfterRecharge' => $this->balance_after_recharge,
            'monthlyUsageBefore' => $this->monthly_usage_before,
            'monthlyUsageAfter' => $this->monthly_usage_after,
            'monthlyLimitConfigured' => $this->monthly_limit_configured,
            'limitCheckPassed' => $this->limit_check_passed,
            'errorCode' => $this->error_code,
            'errorMessage' => $this->error_message,
            'retryCount' => $this->retry_count,
            'nextRetryAt' => $this->next_retry_at?->toDateString(),
            'userNotified' => $this->user_notified,
            'paypalOrderId' => $this->paypal_order_id,
        ];
    }

    /**
     * ✅ MÉTHODES STATIQUES
     */

    /**
     * Créer un nouveau log de recharge automatique
     */
    public static function createTrigger(
        int $userId,
        int $triggerBalance,
        int $threshold,
        string $packageId,
        float $amountToCharge,
        string $triggerAction = null
    ): self {
        $userCredit = UserCredit::getOrCreateForUser($userId);
        $monthYear = now()->firstOfMonth();

        // Calculer l'usage mensuel actuel
        $monthlyUsage = self::forUser($userId)
            ->completed()
            ->whereMonth('triggered_at', now()->month)
            ->whereYear('triggered_at', now()->year)
            ->sum('amount_charged');

        return self::create([
            'user_id' => $userId,
            'trigger_balance' => $triggerBalance,
            'threshold_configured' => $threshold,
            'trigger_action' => $triggerAction,
            'package_id_used' => $packageId,
            'amount_charged' => $amountToCharge,
            'currency' => 'EUR',
            'status' => self::STATUS_TRIGGERED,
            'triggered_at' => now(),
            'monthly_limit_configured' => $userCredit->auto_recharge_max_per_month,
            'monthly_usage_before' => $monthlyUsage,
            'month_year' => $monthYear,
            'balance_before_recharge' => $triggerBalance,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Obtenir l'historique pour un utilisateur
     */
    public static function getHistoryForUser(int $userId, int $limit = 20): array
    {
        return self::forUser($userId)
            ->with(['creditPackage'])
            ->latest('triggered_at')
            ->limit($limit)
            ->get()
            ->map(fn($log) => $log->toFrontendArray())
            ->toArray();
    }

    /**
     * Obtenir les statistiques de recharge pour un utilisateur
     */
    public static function getStatsForUser(int $userId, int $months = 6): array
    {
        $startDate = now()->subMonths($months)->startOfMonth();
        
        $logs = self::forUser($userId)
            ->where('triggered_at', '>=', $startDate)
            ->get();

        return [
            'totalRecharges' => $logs->count(),
            'totalAmountCharged' => $logs->sum('amount_charged'),
            'totalCreditsAdded' => $logs->sum('credits_recharged'),
            'successRate' => $logs->count() > 0 
                ? round(($logs->where('status', self::STATUS_COMPLETED)->count() / $logs->count()) * 100, 1)
                : 0,
            'averageAmount' => $logs->count() > 0 
                ? round($logs->avg('amount_charged'), 2)
                : 0,
            'byMonth' => $logs->groupBy(function ($log) {
                return $log->triggered_at->format('Y-m');
            })->map(function ($monthLogs) {
                return [
                    'count' => $monthLogs->count(),
                    'amount' => $monthLogs->sum('amount_charged'),
                    'credits' => $monthLogs->sum('credits_recharged'),
                ];
            }),
            'byStatus' => $logs->groupBy('status')->map->count(),
        ];
    }

    /**
     * Obtenir les recharges nécessitant un retry
     */
    public static function getLogsNeedingRetry(): \Illuminate\Database\Eloquent\Collection
    {
        return self::needingRetry()
            ->with(['user', 'creditPackage'])
            ->oldest('next_retry_at')
            ->get();
    }

    /**
     * ✅ ÉVÉNEMENTS DE MODÈLE
     */
    protected static function booted()
    {
        // Vérifier les limites lors de la création
        static::creating(function ($log) {
            $log->checkMonthlyLimits();
        });
    }
}