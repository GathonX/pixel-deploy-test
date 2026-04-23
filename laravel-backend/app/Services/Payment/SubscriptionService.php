<?php
// laravel-backend/app/Services/Payment/SubscriptionService.php
// ✅ SERVICE : Gestion centralisée des abonnements
// ✅ COMPATIBLE : Avec votre système d'abonnements frontend

namespace App\Services\Payment;

use App\Models\UserSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\PaymentTransaction;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SubscriptionService
{
    /**
     * ✅ MÉTHODES - GESTION DES ABONNEMENTS
     */

    /**
     * Créer ou mettre à jour un abonnement utilisateur
     */
    public function createOrUpdateUserSubscription(
        int $userId,
        string $planKey,
        string $billingCycle,
        string $paypalSubscriptionId = null,
        string $paypalPlanId = null
    ): UserSubscription {
        $plan = SubscriptionPlan::findByKey($planKey);
        
        if (!$plan || !$plan->is_active) {
            throw new Exception("Plan d'abonnement non trouvé ou inactif: {$planKey}");
        }

        if (!in_array($billingCycle, ['monthly', 'yearly'])) {
            throw new Exception("Cycle de facturation invalide: {$billingCycle}");
        }

        try {
            DB::beginTransaction();

            // Annuler l'abonnement actuel s'il existe
            $existingSubscription = UserSubscription::getActiveForUser($userId);
            if ($existingSubscription) {
                $this->cancelSubscription($existingSubscription->id, false);
            }

            // Calculer les dates
            $startDate = now();
            $nextBillingDate = $billingCycle === 'yearly' 
                ? $startDate->copy()->addYear()
                : $startDate->copy()->addMonth();

            // Créer le nouvel abonnement
            $subscription = UserSubscription::create([
                'user_id' => $userId,
                'subscription_plan_id' => $plan->id,
                'paypal_subscription_id' => $paypalSubscriptionId ?: 'SUB_' . time() . '_' . $userId,
                'billing_cycle' => $billingCycle,
                'status' => UserSubscription::STATUS_ACTIVE,
                'paypal_plan_id' => $paypalPlanId ?: $plan->getPayPalPlanId($billingCycle),
                'subscriber_info' => [
                    'user_id' => $userId,
                    'plan_key' => $planKey,
                    'created_via' => 'api',
                    'ip_address' => request()->ip(),
                ],
                'started_at' => $startDate,
                'next_billing_date' => $nextBillingDate,
                'amount' => $plan->getPrice($billingCycle),
                'currency' => 'EUR',
                'failed_payments_count' => 0,
                'last_payment_at' => $startDate,
            ]);

            DB::commit();

            Log::info('User subscription created/updated', [
                'subscription_id' => $subscription->id,
                'user_id' => $userId,
                'plan_key' => $planKey,
                'billing_cycle' => $billingCycle,
                'amount' => $subscription->amount,
                'next_billing_date' => $nextBillingDate->toDateString(),
            ]);

            return $subscription;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Subscription creation/update failed', [
                'user_id' => $userId,
                'plan_key' => $planKey,
                'billing_cycle' => $billingCycle,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Annuler un abonnement
     */
    public function cancelSubscription(
        int $subscriptionId,
        bool $atPeriodEnd = true,
        string $reason = 'Demande utilisateur'
    ): bool {
        $subscription = UserSubscription::findOrFail($subscriptionId);

        if (!$subscription->isActive()) {
            throw new Exception('Cet abonnement n\'est pas actif');
        }

        try {
            DB::beginTransaction();

            $success = $subscription->cancel($atPeriodEnd);

            // Log de l'annulation
            Log::info('Subscription cancelled', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
                'plan_key' => $subscription->subscriptionPlan->plan_key ?? null,
                'at_period_end' => $atPeriodEnd,
                'reason' => $reason,
                'expires_at' => $subscription->expires_at?->toDateString(),
            ]);

            DB::commit();
            return $success;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Subscription cancellation failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Suspendre un abonnement
     */
    public function suspendSubscription(int $subscriptionId, string $reason = 'Échec de paiement'): bool
    {
        $subscription = UserSubscription::findOrFail($subscriptionId);

        if (!$subscription->isActive()) {
            throw new Exception('Cet abonnement n\'est pas actif');
        }

        try {
            $success = $subscription->suspend();

            Log::info('Subscription suspended', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
                'reason' => $reason,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Subscription suspension failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Reprendre un abonnement suspendu
     */
    public function resumeSubscription(int $subscriptionId): bool
    {
        $subscription = UserSubscription::findOrFail($subscriptionId);

        if (!$subscription->isSuspended()) {
            throw new Exception('Cet abonnement n\'est pas suspendu');
        }

        try {
            $success = $subscription->resume();

            Log::info('Subscription resumed', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Subscription resumption failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - CHANGEMENTS DE PLAN
     */

    /**
     * Changer le plan d'un abonnement
     */
    public function changePlan(
        int $subscriptionId,
        string $newPlanKey,
        string $newBillingCycle = null,
        bool $prorated = true
    ): UserSubscription {
        $subscription = UserSubscription::findOrFail($subscriptionId);
        $newPlan = SubscriptionPlan::findByKey($newPlanKey);

        if (!$newPlan || !$newPlan->is_active) {
            throw new Exception("Nouveau plan non trouvé ou inactif: {$newPlanKey}");
        }

        if (!$subscription->isActive()) {
            throw new Exception('Cet abonnement n\'est pas actif');
        }

        $currentPlan = $subscription->subscriptionPlan;
        $billingCycle = $newBillingCycle ?: $subscription->billing_cycle;

        try {
            DB::beginTransaction();

            // Calculer le prorata si nécessaire
            $proratedAmount = 0;
            if ($prorated) {
                $proratedAmount = $this->calculateProration(
                    $subscription,
                    $currentPlan,
                    $newPlan,
                    $billingCycle
                );
            }

            // Mettre à jour l'abonnement
            $subscription->update([
                'subscription_plan_id' => $newPlan->id,
                'billing_cycle' => $billingCycle,
                'amount' => $newPlan->getPrice($billingCycle),
                'paypal_plan_id' => $newPlan->getPayPalPlanId($billingCycle),
            ]);

            // Créer une transaction pour le prorata si nécessaire
            if ($proratedAmount != 0) {
                $this->createProratedTransaction($subscription, $proratedAmount, $currentPlan, $newPlan);
            }

            DB::commit();

            Log::info('Subscription plan changed', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
                'old_plan' => $currentPlan->plan_key,
                'new_plan' => $newPlanKey,
                'new_billing_cycle' => $billingCycle,
                'prorated_amount' => $proratedAmount,
            ]);

            return $subscription->fresh();

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Plan change failed', [
                'subscription_id' => $subscriptionId,
                'new_plan' => $newPlanKey,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - GESTION DES PAIEMENTS
     */

    /**
     * Enregistrer un paiement réussi
     */
    public function recordSuccessfulPayment(
        int $subscriptionId,
        float $amount,
        string $paypalTransactionId = null
    ): bool {
        $subscription = UserSubscription::findOrFail($subscriptionId);

        try {
            // Calculer la prochaine date de facturation
            $nextBillingDate = $subscription->billing_cycle === 'yearly'
                ? now()->addYear()
                : now()->addMonth();

            $success = $subscription->recordSuccessfulPayment($amount, $nextBillingDate);

            Log::info('Subscription payment recorded', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
                'amount' => $amount,
                'next_billing_date' => $nextBillingDate->toDateString(),
                'paypal_transaction_id' => $paypalTransactionId,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Payment recording failed', [
                'subscription_id' => $subscriptionId,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Enregistrer un échec de paiement
     */
    public function recordFailedPayment(int $subscriptionId): bool
    {
        $subscription = UserSubscription::findOrFail($subscriptionId);

        try {
            $success = $subscription->recordFailedPayment();

            // Suspendre après 3 échecs
            if ($subscription->failed_payments_count >= 3) {
                $this->suspendSubscription($subscriptionId, 'Trop d\'échecs de paiement');
            }

            Log::info('Subscription payment failed', [
                'subscription_id' => $subscriptionId,
                'user_id' => $subscription->user_id,
                'failed_count' => $subscription->failed_payments_count,
                'suspended' => $subscription->failed_payments_count >= 3,
            ]);

            return $success;

        } catch (Exception $e) {
            Log::error('Failed payment recording failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - UTILITAIRES
     */

    /**
     * Obtenir l'abonnement actif d'un utilisateur
     */
    public function getUserActiveSubscription(int $userId): ?UserSubscription
    {
        return UserSubscription::getActiveForUser($userId);
    }

    /**
     * Vérifier si un utilisateur a un abonnement actif
     */
    public function userHasActiveSubscription(int $userId): bool
    {
        return UserSubscription::userHasActiveSubscription($userId);
    }

    /**
     * Obtenir l'historique des abonnements d'un utilisateur
     */
    public function getUserSubscriptionHistory(int $userId): array
    {
        $subscriptions = UserSubscription::forUser($userId)
            ->with('subscriptionPlan')
            ->latest('created_at')
            ->get();

        return $subscriptions->map(function ($subscription) {
            return $subscription->toFrontendArray();
        })->toArray();
    }

    /**
     * Obtenir les abonnements expirant bientôt
     */
    public function getExpiringSubscriptions(int $days = 7): array
    {
        $subscriptions = UserSubscription::expiringIn($days)
            ->with(['user', 'subscriptionPlan'])
            ->get();

        return $subscriptions->map(function ($subscription) {
            return [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'user_name' => $subscription->user->name,
                'user_email' => $subscription->user->email,
                'plan_name' => $subscription->subscriptionPlan->name,
                'expires_at' => $subscription->expires_at?->toDateString(),
                'days_until_expiration' => $subscription->days_until_expiration,
                'amount' => $subscription->amount,
                'billing_cycle' => $subscription->billing_cycle,
            ];
        })->toArray();
    }

    /**
     * Calculer le prorata lors d'un changement de plan
     */
    private function calculateProration(
        UserSubscription $subscription,
        SubscriptionPlan $currentPlan,
        SubscriptionPlan $newPlan,
        string $billingCycle
    ): float {
        $currentPrice = $currentPlan->getPrice($subscription->billing_cycle);
        $newPrice = $newPlan->getPrice($billingCycle);

        // Calculer les jours restants dans la période actuelle
        $daysInPeriod = $subscription->billing_cycle === 'yearly' ? 365 : 30;
        $daysRemaining = $subscription->next_billing_date
            ? now()->diffInDays($subscription->next_billing_date, false)
            : 0;

        if ($daysRemaining <= 0) {
            return 0;
        }

        // Calcul du prorata
        $unusedAmount = ($currentPrice / $daysInPeriod) * $daysRemaining;
        $newProratedAmount = ($newPrice / $daysInPeriod) * $daysRemaining;

        return $newProratedAmount - $unusedAmount;
    }

    /**
 * Calculer le montant prorata pour un changement de plan (méthode publique)
 * Accessible depuis les controllers
 */
public function calculateProratedAmount(
    UserSubscription $subscription,
    SubscriptionPlan $currentPlan,
    SubscriptionPlan $newPlan,
    string $billingCycle
): float {
    return $this->calculateProration(
        $subscription,
        $currentPlan,
        $newPlan,
        $billingCycle
    );
}

    /**
     * Créer une transaction pour le prorata
     */
    private function createProratedTransaction(
        UserSubscription $subscription,
        float $proratedAmount,
        SubscriptionPlan $oldPlan,
        SubscriptionPlan $newPlan
    ): void {
        if ($proratedAmount == 0) {
            return;
        }

        $type = $proratedAmount > 0 
            ? PaymentTransaction::TYPE_SUBSCRIPTION 
            : PaymentTransaction::TYPE_SUBSCRIPTION;

        PaymentTransaction::create([
            'user_id' => $subscription->user_id,
            'type' => $type,
            'amount' => abs($proratedAmount),
            'currency' => 'EUR',
            'status' => PaymentTransaction::STATUS_COMPLETED,
            'plan_id' => $newPlan->plan_key,
            'completed_at' => now(),
            'metadata' => [
                'prorated_change' => true,
                'old_plan' => $oldPlan->plan_key,
                'new_plan' => $newPlan->plan_key,
                'prorated_amount' => $proratedAmount,
                'subscription_id' => $subscription->id,
            ],
        ]);
    }

    /**
     * Marquer les abonnements expirés
     */
    public function markExpiredSubscriptions(): int
    {
        $expiredCount = 0;

        $expiredSubscriptions = UserSubscription::where('expires_at', '<', now())
            ->where('status', '!=', UserSubscription::STATUS_EXPIRED)
            ->get();

        foreach ($expiredSubscriptions as $subscription) {
            try {
                $subscription->markAsExpired();
                $expiredCount++;

                Log::info('Subscription marked as expired', [
                    'subscription_id' => $subscription->id,
                    'user_id' => $subscription->user_id,
                    'expired_at' => $subscription->expires_at,
                ]);

            } catch (Exception $e) {
                Log::error('Failed to mark subscription as expired', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($expiredCount > 0) {
            Log::info('Expired subscriptions processed', [
                'count' => $expiredCount,
            ]);
        }

        return $expiredCount;
    }

    /**
     * Générer des statistiques d'abonnements
     */
    public function getSubscriptionStats(): array
    {
        $total = UserSubscription::count();
        $active = UserSubscription::active()->count();
        $cancelled = UserSubscription::cancelled()->count();
        $expired = UserSubscription::expired()->count();
        $suspended = UserSubscription::suspended()->count();

        return [
            'total_subscriptions' => $total,
            'active_subscriptions' => $active,
            'cancelled_subscriptions' => $cancelled,
            'expired_subscriptions' => $expired,
            'suspended_subscriptions' => $suspended,
            'active_rate' => $total > 0 ? round(($active / $total) * 100, 2) : 0,
            'churn_rate' => $total > 0 ? round((($cancelled + $expired) / $total) * 100, 2) : 0,
            'by_plan' => UserSubscription::active()
                ->with('subscriptionPlan')
                ->get()
                ->groupBy('subscriptionPlan.plan_key')
                ->map->count(),
            'by_billing_cycle' => UserSubscription::active()
                ->get()
                ->groupBy('billing_cycle')
                ->map->count(),
        ];
    }
}