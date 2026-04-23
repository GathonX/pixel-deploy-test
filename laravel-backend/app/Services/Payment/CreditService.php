<?php
// laravel-backend/app/Services/Payment/CreditService.php
// ✅ SERVICE : Gestion centralisée des crédits
// ✅ COMPATIBLE : Avec votre système de crédits frontend

namespace App\Services\Payment;

use App\Models\UserCredit;
use App\Models\CreditTransaction;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CreditService
{
    /**
     * ✅ MÉTHODES - GESTION DU SOLDE
     */

    /**
     * Obtenir ou créer le solde de crédits d'un utilisateur
     */
    public function getUserCredit(int $userId): UserCredit
    {
        return UserCredit::getOrCreateForUser($userId);
    }

    /**
     * Obtenir le solde actuel d'un utilisateur
     */
    public function getCurrentBalance(int $userId): int
    {
        return $this->getUserCredit($userId)->current_balance;
    }

    /**
     * Vérifier si un utilisateur a suffisamment de crédits
     */
    public function hasEnoughCredits(int $userId, int $amount): bool
    {
        return $this->getCurrentBalance($userId) >= $amount;
    }

    /**
     * Vérifier si un utilisateur peut dépenser des crédits (limite quotidienne)
     */
    public function canSpendCredits(int $userId, int $amount): array
    {
        $userCredit = $this->getUserCredit($userId);
        
        // Vérifier le solde
        if (!$userCredit->hasEnoughCredits($amount)) {
            return [
                'can_spend' => false,
                'reason' => 'insufficient_balance',
                'message' => 'Solde de crédits insuffisant',
                'current_balance' => $userCredit->current_balance,
                'required' => $amount,
                'missing' => $amount - $userCredit->current_balance,
            ];
        }

        // Vérifier la limite quotidienne
        if ($userCredit->isDailyLimitReached()) {
            return [
                'can_spend' => false,
                'reason' => 'daily_limit_reached',
                'message' => 'Limite quotidienne de crédits atteinte',
                'daily_limit' => $userCredit->daily_usage_limit,
                'daily_used' => $userCredit->daily_usage_count,
            ];
        }

        // Vérifier si l'usage quotidien + nouveau montant dépasse la limite
        if (($userCredit->daily_usage_count + $amount) > $userCredit->daily_usage_limit) {
            $allowedAmount = $userCredit->daily_usage_limit - $userCredit->daily_usage_count;
            
            return [
                'can_spend' => false,
                'reason' => 'daily_limit_exceeded',
                'message' => 'Cette dépense dépasserait la limite quotidienne',
                'allowed_amount' => $allowedAmount,
                'requested_amount' => $amount,
                'daily_limit' => $userCredit->daily_usage_limit,
            ];
        }

        return [
            'can_spend' => true,
            'current_balance' => $userCredit->current_balance,
            'balance_after' => $userCredit->current_balance - $amount,
            'daily_usage_after' => $userCredit->daily_usage_count + $amount,
            'daily_limit' => $userCredit->daily_usage_limit,
        ];
    }

    /**
     * ✅ MÉTHODES - TRANSACTIONS DE CRÉDITS
     */

    /**
     * Créer une transaction de gain de crédits
     */
    public function createEarningTransaction(
        int $userId,
        int $amount,
        string $description,
        string $type = CreditTransaction::TYPE_EARNED_BONUS,
        array $options = []
    ): CreditTransaction {
        if ($amount <= 0) {
            throw new Exception('Le montant de crédits doit être positif');
        }

        try {
            DB::beginTransaction();

            $userCredit = $this->getUserCredit($userId);
            $balanceBefore = $userCredit->current_balance;

            // Créer la transaction
            $transaction = CreditTransaction::createEarning(
                $userId,
                $type,
                $amount,
                $description,
                array_merge($options, [
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceBefore + $amount,
                ])
            );

            // Mettre à jour le solde utilisateur
            $userCredit->addCredits($amount, $options['source'] ?? 'system');

            DB::commit();

            Log::info('Credit earning transaction created', [
                'transaction_id' => $transaction->id,
                'user_id' => $userId,
                'amount' => $amount,
                'type' => $type,
                'balance_before' => $balanceBefore,
                'balance_after' => $userCredit->current_balance,
            ]);

            return $transaction;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Credit earning transaction failed', [
                'user_id' => $userId,
                'amount' => $amount,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Créer une transaction de dépense de crédits
     */
    public function createSpendingTransaction(
        int $userId,
        int $amount,
        string $description,
        string $type = CreditTransaction::TYPE_SPENT_GENERATION,
        array $options = []
    ): CreditTransaction {
        if ($amount <= 0) {
            throw new Exception('Le montant de crédits doit être positif');
        }

        // Vérifier si l'utilisateur peut dépenser ces crédits
        $canSpend = $this->canSpendCredits($userId, $amount);
        if (!$canSpend['can_spend']) {
            throw new Exception($canSpend['message']);
        }

        try {
            DB::beginTransaction();

            $userCredit = $this->getUserCredit($userId);
            $balanceBefore = $userCredit->current_balance;

            // Créer la transaction
            $transaction = CreditTransaction::createSpending(
                $userId,
                $type,
                $amount,
                $description,
                array_merge($options, [
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceBefore - $amount,
                ])
            );

            // Mettre à jour le solde utilisateur
            $userCredit->spendCredits($amount, $options['purpose'] ?? 'usage');

            DB::commit();

            Log::info('Credit spending transaction created', [
                'transaction_id' => $transaction->id,
                'user_id' => $userId,
                'amount' => $amount,
                'type' => $type,
                'balance_before' => $balanceBefore,
                'balance_after' => $userCredit->current_balance,
            ]);

            // Vérifier si une auto-recharge doit être déclenchée
            $this->checkAutoRecharge($userId, $userCredit->current_balance, $type);

            return $transaction;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Credit spending transaction failed', [
                'user_id' => $userId,
                'amount' => $amount,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - AUTO-RECHARGE
     */

    /**
     * Vérifier et déclencher l'auto-recharge si nécessaire
     */
    public function checkAutoRecharge(int $userId, int $currentBalance, string $triggerAction = null): ?bool
    {
        $userCredit = $this->getUserCredit($userId);

        if (!$userCredit->canTriggerAutoRecharge()) {
            return false;
        }

        try {
            $paymentService = app(PaymentService::class);
            
            $transaction = $paymentService->processAutoRecharge(
                $userId,
                $userCredit->auto_recharge_package_id,
                $currentBalance,
                $triggerAction
            );

            if ($transaction) {
                Log::info('Auto-recharge triggered', [
                    'user_id' => $userId,
                    'current_balance' => $currentBalance,
                    'threshold' => $userCredit->auto_recharge_threshold,
                    'package_id' => $userCredit->auto_recharge_package_id,
                    'transaction_id' => $transaction->id,
                ]);

                return true;
            }

            return false;

        } catch (Exception $e) {
            Log::error('Auto-recharge check failed', [
                'user_id' => $userId,
                'current_balance' => $currentBalance,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Configurer l'auto-recharge pour un utilisateur
     */
    public function configureAutoRecharge(
        int $userId,
        bool $enabled,
        int $threshold = 5,
        string $packageId = 'power_pack',
        int $maxPerMonth = 100
    ): bool {
        try {
            $userCredit = $this->getUserCredit($userId);

            if ($enabled) {
                $success = $userCredit->enableAutoRecharge($threshold, $packageId, $maxPerMonth);
            } else {
                $success = $userCredit->disableAutoRecharge();
            }

            Log::info('Auto-recharge configuration updated', [
                'user_id' => $userId,
                'enabled' => $enabled,
                'threshold' => $threshold,
                'package_id' => $packageId,
                'max_per_month' => $maxPerMonth,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Auto-recharge configuration failed', [
                'user_id' => $userId,
                'enabled' => $enabled,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - STATISTIQUES ET HISTORIQUE
     */

    /**
     * Obtenir les statistiques de crédits d'un utilisateur
     */
    public function getUserCreditStats(int $userId): array
    {
        $userCredit = $this->getUserCredit($userId);
        $userCredit->resetDailyCounterIfNeeded();
        $userCredit->resetMonthlyCounterIfNeeded();

        $transactions = CreditTransaction::getUserStats($userId, 30);

        return [
            'balance' => [
                'current' => $userCredit->current_balance,
                'lifetime_earned' => $userCredit->lifetime_earned,
                'lifetime_spent' => $userCredit->lifetime_spent,
                'monthly_earned' => $userCredit->monthly_earned,
                'monthly_spent' => $userCredit->monthly_spent,
                'monthly_net' => $userCredit->monthly_earned - $userCredit->monthly_spent,
            ],
            'usage' => [
                'daily_count' => $userCredit->daily_usage_count,
                'daily_limit' => $userCredit->daily_usage_limit,
                'daily_percentage' => $userCredit->daily_usage_percentage,
                'can_use_more' => !$userCredit->isDailyLimitReached(),
                'remaining_today' => max(0, $userCredit->daily_usage_limit - $userCredit->daily_usage_count),
            ],
            'auto_recharge' => [
                'enabled' => $userCredit->auto_recharge_enabled,
                'threshold' => $userCredit->auto_recharge_threshold,
                'package_id' => $userCredit->auto_recharge_package_id,
                'max_per_month' => $userCredit->auto_recharge_max_per_month,
                'used_this_month' => $userCredit->auto_recharge_used_this_month,
                'remaining_budget' => max(0, $userCredit->auto_recharge_max_per_month - $userCredit->auto_recharge_used_this_month),
                'can_trigger' => $userCredit->canTriggerAutoRecharge(),
                'is_low_balance' => $userCredit->isLowBalance(),
            ],
            'transactions' => $transactions,
            'earning_sources' => $userCredit->earning_sources ?? [],
            'usage_history' => $userCredit->usage_history ?? [],
        ];
    }

    /**
     * Obtenir l'historique des transactions de crédits
     */
    public function getUserCreditHistory(int $userId, int $limit = 50): array
    {
        return CreditTransaction::getHistoryForUser($userId, $limit);
    }

    /**
     * ✅ MÉTHODES - UTILITAIRES AVANCÉES
     */

    /**
     * Transférer des crédits entre utilisateurs (admin seulement)
     */
    public function transferCredits(
        int $fromUserId,
        int $toUserId,
        int $amount,
        string $reason = 'Transfert de crédits',
        int $adminId = null
    ): bool {
        if ($amount <= 0) {
            throw new Exception('Le montant de transfert doit être positif');
        }

        if ($fromUserId === $toUserId) {
            throw new Exception('Impossible de transférer des crédits vers le même utilisateur');
        }

        // Vérifier que l'utilisateur source a suffisamment de crédits
        if (!$this->hasEnoughCredits($fromUserId, $amount)) {
            throw new Exception('Solde insuffisant pour le transfert');
        }

        try {
            DB::beginTransaction();

            // Retirer les crédits de l'utilisateur source
            $this->createSpendingTransaction(
                $fromUserId,
                $amount,
                "Transfert vers utilisateur #{$toUserId}: {$reason}",
                CreditTransaction::TYPE_ADMIN_ADJUSTMENT,
                [
                    'transfer_to' => $toUserId,
                    'admin_id' => $adminId,
                    'source' => 'admin_transfer',
                ]
            );

            // Ajouter les crédits à l'utilisateur destination
            $this->createEarningTransaction(
                $toUserId,
                $amount,
                "Transfert depuis utilisateur #{$fromUserId}: {$reason}",
                CreditTransaction::TYPE_ADMIN_ADJUSTMENT,
                [
                    'transfer_from' => $fromUserId,
                    'admin_id' => $adminId,
                    'source' => 'admin_transfer',
                ]
            );

            DB::commit();

            Log::info('Credits transferred between users', [
                'from_user_id' => $fromUserId,
                'to_user_id' => $toUserId,
                'amount' => $amount,
                'reason' => $reason,
                'admin_id' => $adminId,
            ]);

            return true;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Credit transfer failed', [
                'from_user_id' => $fromUserId,
                'to_user_id' => $toUserId,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Ajuster le solde d'un utilisateur (admin seulement)
     */
    public function adjustUserBalance(
        int $userId,
        int $adjustment,
        string $reason,
        int $adminId = null
    ): CreditTransaction {
        if ($adjustment === 0) {
            throw new Exception('L\'ajustement ne peut pas être zéro');
        }

        try {
            if ($adjustment > 0) {
                // Ajustement positif = ajout de crédits
                $transaction = $this->createEarningTransaction(
                    $userId,
                    $adjustment,
                    "Ajustement admin: {$reason}",
                    CreditTransaction::TYPE_ADMIN_ADJUSTMENT,
                    [
                        'admin_id' => $adminId,
                        'source' => 'admin_adjustment',
                    ]
                );
            } else {
                // Ajustement négatif = retrait de crédits
                $transaction = $this->createSpendingTransaction(
                    $userId,
                    abs($adjustment),
                    "Ajustement admin: {$reason}",
                    CreditTransaction::TYPE_ADMIN_ADJUSTMENT,
                    [
                        'admin_id' => $adminId,
                        'source' => 'admin_adjustment',
                    ]
                );
            }

            Log::info('User balance adjusted by admin', [
                'user_id' => $userId,
                'adjustment' => $adjustment,
                'reason' => $reason,
                'admin_id' => $adminId,
                'transaction_id' => $transaction->id,
            ]);

            return $transaction;

        } catch (Exception $e) {
            Log::error('Balance adjustment failed', [
                'user_id' => $userId,
                'adjustment' => $adjustment,
                'reason' => $reason,
                'admin_id' => $adminId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Obtenir les utilisateurs avec solde bas
     */
    public function getUsersWithLowBalance(): array
    {
        $users = UserCredit::getUsersWithLowBalance();

        return $users->map(function ($userCredit) {
            return [
                'user_id' => $userCredit->user_id,
                'user_name' => $userCredit->user->name,
                'user_email' => $userCredit->user->email,
                'current_balance' => $userCredit->current_balance,
                'threshold' => $userCredit->auto_recharge_threshold,
                'auto_recharge_enabled' => $userCredit->auto_recharge_enabled,
                'can_trigger_auto_recharge' => $userCredit->canTriggerAutoRecharge(),
                'last_auto_recharge' => $userCredit->last_auto_recharge_at?->toDateString(),
            ];
        })->toArray();
    }

    /**
     * Générer un rapport de crédits pour une période
     */
    public function generateCreditReport(string $startDate, string $endDate): array
    {
        $transactions = CreditTransaction::whereBetween('created_at', [$startDate, $endDate])
            ->completed()
            ->get();

        $totalEarnings = $transactions->where('amount', '>', 0)->sum('amount');
        $totalSpendings = abs($transactions->where('amount', '<', 0)->sum('amount'));

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'summary' => [
                'total_transactions' => $transactions->count(),
                'total_earnings' => $totalEarnings,
                'total_spendings' => $totalSpendings,
                'net_change' => $totalEarnings - $totalSpendings,
            ],
            'by_type' => $transactions->groupBy('type')->map(function ($typeTransactions) {
                return [
                    'count' => $typeTransactions->count(),
                    'total_amount' => $typeTransactions->sum('amount'),
                ];
            }),
            'by_user' => $transactions->groupBy('user_id')->map(function ($userTransactions) {
                $userId = $userTransactions->first()->user_id;
                return [
                    'user_id' => $userId,
                    'user_name' => $userTransactions->first()->user->name ?? 'Unknown',
                    'transactions_count' => $userTransactions->count(),
                    'total_earnings' => $userTransactions->where('amount', '>', 0)->sum('amount'),
                    'total_spendings' => abs($userTransactions->where('amount', '<', 0)->sum('amount')),
                ];
            }),
        ];
    }
}