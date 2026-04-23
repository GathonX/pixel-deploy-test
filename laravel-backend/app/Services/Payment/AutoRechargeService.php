<?php
// laravel-backend/app/Services/Payment/AutoRechargeService.php
// ✅ SERVICE : Gestion centralisée des recharges automatiques
// ✅ COMPATIBLE : Avec votre système d'auto-recharge frontend

namespace App\Services\Payment;

use App\Models\AutoRechargeLog;
use App\Models\UserCredit;
use App\Models\CreditPackage;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\Payment\PaymentService;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Carbon\Carbon;

class AutoRechargeService
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * ✅ MÉTHODES - DÉCLENCHEMENT AUTO-RECHARGE
     */

    /**
     * Créer un log de recharge automatique
     */
    public function createAutoRechargeLog(
        int $userId,
        int $triggerBalance,
        int $threshold,
        string $packageId,
        float $amountToCharge,
        string $triggerAction = null
    ): AutoRechargeLog {
        try {
            $log = AutoRechargeLog::createTrigger(
                $userId,
                $triggerBalance,
                $threshold,
                $packageId,
                $amountToCharge,
                $triggerAction
            );

            Log::info('Auto-recharge log created', [
                'log_id' => $log->id,
                'user_id' => $userId,
                'trigger_balance' => $triggerBalance,
                'threshold' => $threshold,
                'package_id' => $packageId,
                'amount_to_charge' => $amountToCharge,
            ]);

            return $log;

        } catch (Exception $e) {
            Log::error('Auto-recharge log creation failed', [
                'user_id' => $userId,
                'package_id' => $packageId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Traiter une recharge automatique complète
     */
    public function processAutoRecharge(AutoRechargeLog $log): bool
    {
        if (!$log->isTriggered()) {
            throw new Exception('Ce log de recharge automatique n\'est pas en statut triggered');
        }

        try {
            DB::beginTransaction();

            // Marquer comme en cours de traitement
            $log->markAsProcessing();

            // Vérifier les limites mensuelles
            $limitCheck = $log->checkMonthlyLimits();
            if (!$limitCheck['passed']) {
                $log->markAsFailed(
                    'MONTHLY_LIMIT_EXCEEDED',
                    'Limite mensuelle dépassée',
                    $limitCheck
                );
                
                DB::commit();
                return false;
            }

            // Traiter le paiement PayPal (simulation pour le moment)
            $paymentResult = $this->processPayPalPayment($log);
            
            if ($paymentResult['success']) {
                // Compléter la recharge
                $this->completeAutoRecharge($log, $paymentResult);
                
                DB::commit();
                
                Log::info('Auto-recharge completed successfully', [
                    'log_id' => $log->id,
                    'user_id' => $log->user_id,
                    'credits_added' => $log->credits_recharged,
                    'amount_charged' => $log->amount_charged,
                ]);

                return true;
            } else {
                // Marquer comme échouée
                $log->markAsFailed(
                    $paymentResult['error_code'],
                    $paymentResult['error_message'],
                    $paymentResult
                );
                
                DB::commit();
                return false;
            }

        } catch (Exception $e) {
            DB::rollBack();
            
            $log->markAsFailed('PROCESSING_ERROR', $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);

            Log::error('Auto-recharge processing failed', [
                'log_id' => $log->id,
                'user_id' => $log->user_id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Compléter une recharge automatique
     */
    private function completeAutoRecharge(AutoRechargeLog $log, array $paymentResult): void
    {
        $package = CreditPackage::findByKey($log->package_id_used);
        if (!$package) {
            throw new Exception("Package non trouvé: {$log->package_id_used}");
        }

        // Mettre à jour le log
        $log->markAsCompleted($package->total_credits, $log->balance_before_recharge + $package->total_credits);
        
        // Mettre à jour PayPal info
        $log->update([
            'paypal_order_id' => $paymentResult['order_id'] ?? null,
            'paypal_response' => $paymentResult,
        ]);

        // Ajouter les crédits à l'utilisateur
        $userCredit = UserCredit::getOrCreateForUser($log->user_id);
        $userCredit->recordAutoRecharge($package->total_credits, $log->amount_charged);

        // Notifier l'utilisateur
        $this->notifyUserOfSuccessfulRecharge($log);
    }

    /**
     * ✅ MÉTHODES - INTÉGRATION PAYPAL
     */

    /**
     * Traiter le paiement PayPal (simulation pour développement)
     */
    private function processPayPalPayment(AutoRechargeLog $log): array
    {
        try {
            // Simulation du processus PayPal
            // En production, ceci ferait appel à l'API PayPal réelle
            
            // Simuler un délai de traitement
            sleep(1);
            
            // Simuler un succès (95% de succès)
            $success = rand(1, 100) <= 95;
            
            if ($success) {
                return [
                    'success' => true,
                    'order_id' => 'ORDER_' . time() . '_' . $log->user_id,
                    'transaction_id' => 'TXN_' . uniqid(),
                    'amount' => $log->amount_charged,
                    'currency' => $log->currency,
                    'status' => 'COMPLETED',
                    'payment_method' => 'paypal',
                    'processed_at' => now()->toISOString(),
                ];
            } else {
                // Simuler différents types d'erreurs
                $errors = [
                    ['code' => 'INSUFFICIENT_FUNDS', 'message' => 'Fonds insuffisants'],
                    ['code' => 'CARD_DECLINED', 'message' => 'Carte déclinée'],
                    ['code' => 'PAYMENT_TIMEOUT', 'message' => 'Timeout de paiement'],
                ];
                
                $error = $errors[array_rand($errors)];
                
                return [
                    'success' => false,
                    'error_code' => $error['code'],
                    'error_message' => $error['message'],
                    'processed_at' => now()->toISOString(),
                ];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'error_code' => 'PROCESSING_ERROR',
                'error_message' => $e->getMessage(),
                'processed_at' => now()->toISOString(),
            ];
        }
    }

    /**
     * ✅ MÉTHODES - RETRY ET RÉCUPÉRATION
     */

    /**
     * Traiter les recharges échouées qui peuvent être retentées
     */
    public function processFailedRecharges(): int
    {
        $processedCount = 0;
        $failedLogs = AutoRechargeLog::getLogsNeedingRetry();

        foreach ($failedLogs as $log) {
            try {
                $log->incrementRetryCount();
                
                // Remettre en statut triggered pour retry
                $log->update(['status' => AutoRechargeLog::STATUS_TRIGGERED]);
                
                // Traiter la recharge
                if ($this->processAutoRecharge($log)) {
                    $processedCount++;
                    
                    Log::info('Failed auto-recharge successfully retried', [
                        'log_id' => $log->id,
                        'user_id' => $log->user_id,
                        'retry_count' => $log->retry_count,
                    ]);
                }

            } catch (Exception $e) {
                Log::error('Auto-recharge retry failed', [
                    'log_id' => $log->id,
                    'retry_count' => $log->retry_count,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($processedCount > 0) {
            Log::info('Failed auto-recharges processed', [
                'total_processed' => $processedCount,
                'total_attempted' => $failedLogs->count(),
            ]);
        }

        return $processedCount;
    }

    /**
     * ✅ MÉTHODES - NOTIFICATIONS
     */

    /**
     * Notifier l'utilisateur d'une recharge réussie
     */
    private function notifyUserOfSuccessfulRecharge(AutoRechargeLog $log): void
    {
        try {
            $user = User::find($log->user_id);
            $package = CreditPackage::findByKey($log->package_id_used);

            $notificationData = [
                'type' => 'auto_recharge_success',
                'credits_added' => $log->credits_recharged,
                'package_name' => $package->name ?? $log->package_id_used,
                'amount_charged' => $log->amount_charged,
                'currency' => $log->currency,
                'new_balance' => $log->balance_after_recharge,
                'processed_at' => $log->completed_at->toDateString(),
            ];

            // Marquer comme notifié
            $log->markUserNotified($notificationData);

            // TODO: Intégrer avec votre système de notification
            // Mail::to($user->email)->send(new AutoRechargeSuccessNotification($log, $notificationData));

            Log::info('Auto-recharge notification sent', [
                'log_id' => $log->id,
                'user_id' => $log->user_id,
                'user_email' => $user->email,
            ]);

        } catch (Exception $e) {
            Log::error('Auto-recharge notification failed', [
                'log_id' => $log->id,
                'user_id' => $log->user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifier l'utilisateur d'un échec de recharge
     */
    public function notifyUserOfFailedRecharge(AutoRechargeLog $log): void
    {
        try {
            $user = User::find($log->user_id);

            $notificationData = [
                'type' => 'auto_recharge_failed',
                'error_message' => $log->error_message,
                'amount_attempted' => $log->amount_charged,
                'currency' => $log->currency,
                'retry_count' => $log->retry_count,
                'next_retry' => $log->next_retry_at?->toDateString(),
                'failed_at' => $log->failed_at->toDateString(),
            ];

            // TODO: Intégrer avec votre système de notification
            // Mail::to($user->email)->send(new AutoRechargeFailedNotification($log, $notificationData));

            Log::info('Auto-recharge failure notification sent', [
                'log_id' => $log->id,
                'user_id' => $log->user_id,
                'user_email' => $user->email,
                'error_code' => $log->error_code,
            ]);

        } catch (Exception $e) {
            Log::error('Auto-recharge failure notification failed', [
                'log_id' => $log->id,
                'user_id' => $log->user_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * ✅ MÉTHODES - STATISTIQUES ET GESTION
     */

    /**
     * Obtenir l'historique des recharges automatiques d'un utilisateur
     */
    public function getUserAutoRechargeHistory(int $userId, int $limit = 20): array
    {
        return AutoRechargeLog::getHistoryForUser($userId, $limit);
    }

    /**
     * Obtenir les statistiques de recharge automatique d'un utilisateur
     */
    public function getUserAutoRechargeStats(int $userId, int $months = 6): array
    {
        return AutoRechargeLog::getStatsForUser($userId, $months);
    }

    /**
     * Obtenir les statistiques globales des recharges automatiques
     */
    public function getGlobalAutoRechargeStats(): array
    {
        $totalLogs = AutoRechargeLog::count();
        $completedLogs = AutoRechargeLog::completed()->count();
        $failedLogs = AutoRechargeLog::failed()->count();

        return [
            'total_attempts' => $totalLogs,
            'successful_recharges' => $completedLogs,
            'failed_recharges' => $failedLogs,
            'success_rate' => $totalLogs > 0 ? round(($completedLogs / $totalLogs) * 100, 1) : 0,
            'total_amount_processed' => AutoRechargeLog::completed()->sum('amount_charged'),
            'total_credits_distributed' => AutoRechargeLog::completed()->sum('credits_recharged'),
            'average_recharge_amount' => AutoRechargeLog::completed()->avg('amount_charged'),
            'by_package' => AutoRechargeLog::completed()
                ->get()
                ->groupBy('package_id_used')
                ->map(function ($packageLogs) {
                    return [
                        'count' => $packageLogs->count(),
                        'total_amount' => $packageLogs->sum('amount_charged'),
                        'total_credits' => $packageLogs->sum('credits_recharged'),
                    ];
                }),
            'by_month' => AutoRechargeLog::completed()
                ->where('triggered_at', '>=', now()->subYear())
                ->get()
                ->groupBy(function ($log) {
                    return $log->triggered_at->format('Y-m');
                })
                ->map(function ($monthLogs) {
                    return [
                        'count' => $monthLogs->count(),
                        'total_amount' => $monthLogs->sum('amount_charged'),
                        'total_credits' => $monthLogs->sum('credits_recharged'),
                    ];
                }),
            'error_breakdown' => AutoRechargeLog::failed()
                ->get()
                ->groupBy('error_code')
                ->map->count(),
        ];
    }

    /**
     * Obtenir les utilisateurs avec auto-recharge activée et solde bas
     */
    public function getUsersNeedingAutoRecharge(): array
    {
        $usersWithLowBalance = UserCredit::where('auto_recharge_enabled', true)
            ->whereColumn('current_balance', '<=', 'auto_recharge_threshold')
            ->with('user')
            ->get();

        return $usersWithLowBalance->filter(function ($userCredit) {
            return $userCredit->canTriggerAutoRecharge();
        })->map(function ($userCredit) {
            return [
                'user_id' => $userCredit->user_id,
                'user_name' => $userCredit->user->name,
                'user_email' => $userCredit->user->email,
                'current_balance' => $userCredit->current_balance,
                'threshold' => $userCredit->auto_recharge_threshold,
                'package_id' => $userCredit->auto_recharge_package_id,
                'monthly_usage' => $userCredit->auto_recharge_used_this_month,
                'monthly_limit' => $userCredit->auto_recharge_max_per_month,
                'last_recharge' => $userCredit->last_auto_recharge_at?->toDateString(),
            ];
        })->values()->toArray();
    }

    /**
     * ✅ MÉTHODES - ADMINISTRATION
     */

    /**
     * Désactiver l'auto-recharge pour un utilisateur
     */
    public function disableAutoRechargeForUser(int $userId, string $reason = null): bool
    {
        try {
            $userCredit = UserCredit::getOrCreateForUser($userId);
            $success = $userCredit->disableAutoRecharge();

            Log::info('Auto-recharge disabled for user', [
                'user_id' => $userId,
                'reason' => $reason,
                'disabled_by' => 'admin',
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Auto-recharge disable failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Forcer une recharge automatique (admin)
     */
    public function forceAutoRecharge(int $userId, string $packageId, string $reason = 'Force admin'): AutoRechargeLog
    {
        try {
            $userCredit = UserCredit::getOrCreateForUser($userId);
            $package = CreditPackage::findByKey($packageId);
            
            if (!$package) {
                throw new Exception("Package non trouvé: {$packageId}");
            }

            $log = $this->createAutoRechargeLog(
                $userId,
                $userCredit->current_balance,
                0, // Pas de seuil pour forçage admin
                $packageId,
                $package->price,
                $reason
            );

            // Marquer comme forcé dans les métadonnées
            $log->update([
                'metadata' => array_merge($log->metadata ?? [], [
                    'forced_by_admin' => true,
                    'force_reason' => $reason,
                ])
            ]);

            // Traiter immédiatement
            $this->processAutoRecharge($log);

            Log::info('Auto-recharge forced by admin', [
                'log_id' => $log->id,
                'user_id' => $userId,
                'package_id' => $packageId,
                'reason' => $reason,
            ]);

            return $log;

        } catch (Exception $e) {
            Log::error('Forced auto-recharge failed', [
                'user_id' => $userId,
                'package_id' => $packageId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Nettoyer les anciens logs de recharge automatique
     */
    public function cleanupOldLogs(int $daysOld = 365): int
    {
        $deletedCount = 0;
        $cutoffDate = now()->subDays($daysOld);

        try {
            $deletedCount = AutoRechargeLog::where('created_at', '<', $cutoffDate)
                ->where('status', '!=', AutoRechargeLog::STATUS_PROCESSING)
                ->delete();

            if ($deletedCount > 0) {
                Log::info('Old auto-recharge logs cleaned up', [
                    'deleted_count' => $deletedCount,
                    'cutoff_date' => $cutoffDate->toDateString(),
                ]);
            }

        } catch (Exception $e) {
            Log::error('Auto-recharge logs cleanup failed', [
                'cutoff_date' => $cutoffDate->toDateString(),
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }

        return $deletedCount;
    }
}