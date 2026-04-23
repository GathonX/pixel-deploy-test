<?php
// laravel-backend/app/Services/Payment/PaymentService.php
namespace App\Services\Payment;

use App\Models\PaymentTransaction;
use App\Models\CreditPackage;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\UserCredit;
use App\Models\PaymentInvoice;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PayPalCheckoutSdk\Core\PayPalHttpClient;
use PayPalCheckoutSdk\Core\SandboxEnvironment;
use PayPalCheckoutSdk\Core\ProductionEnvironment;
use PayPalCheckoutSdk\Orders\OrdersCreateRequest;

class PaymentService
{

    protected $paypalClient;

    public function __construct()
    {
        // Initialiser le client PayPal
        $environment = env('PAYPAL_MODE') === 'live'
            ? new ProductionEnvironment(env('PAYPAL_CLIENT_ID'), env('PAYPAL_CLIENT_SECRET'))
            : new SandboxEnvironment(env('PAYPAL_CLIENT_ID'), env('PAYPAL_CLIENT_SECRET'));
        $this->paypalClient = new PayPalHttpClient($environment);
    }

    /**
     * ✅ MÉTHODES - ACHAT DE CRÉDITS
     */

    /**
     * Créer une transaction d'achat de crédits
     */
        public function createCreditPurchaseTransaction(
    int $userId,
    string $packageId,
    array $billingInfo = [],
    string $source = 'web',
    string $paymentMethod = 'paypal'
): array {
    $package = CreditPackage::findByKey($packageId);
    
    if (!$package || !$package->is_active) {
        throw new Exception("Package de crédits non trouvé ou inactif: {$packageId}");
    }

    try {
        DB::beginTransaction();

        // Créer la transaction locale
        $transaction = PaymentTransaction::create([
            'user_id' => $userId,
            'type' => PaymentTransaction::TYPE_CREDIT_PURCHASE,
            'amount' => $package->price,
            'currency' => 'EUR',
            'status' => PaymentTransaction::STATUS_PENDING,
            'package_id' => $packageId,
            'metadata' => [
                'package_name' => $package->name,
                'credits_amount' => $package->credits,
                'bonus_credits' => $package->bonus_credits,
                'billing_info' => $billingInfo,
                'source' => $source,
                'payment_method' => $paymentMethod,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        $paypalOrderId = null;
        $approvalUrl = null; // Initialisation de $approvalUrl pour éviter l'erreur

        // ✅ NOUVEAUTÉ : Support des deux méthodes de paiement
        if ($paymentMethod === 'paypal' || $paymentMethod === 'card') {
            // Créer l'ordre PayPal (même API pour PayPal et cartes)
            $orderRequest = new OrdersCreateRequest();
            $orderRequest->prefer('return=representation');
            
            // ✅ CONFIGURATION UNIVERSELLE : PayPal + Cartes bancaires
            $orderRequest->body = [
                'intent' => 'CAPTURE',
                'purchase_units' => [
                    [
                        'amount' => [
                            'currency_code' => 'EUR',
                            'value' => number_format($package->price, 2, '.', '')
                        ],
                        'description' => "{$package->name} - {$package->credits} crédits",
                        'custom_id' => "CREDIT_{$transaction->id}"
                    ]
                ],
                'application_context' => [
                    'brand_name' => env('COMPANY_NAME', 'PixelRise AI'),
                    'landing_page' => 'BILLING',
                    'user_action' => 'PAY_NOW',
                    'return_url' => env('PAYPAL_SUCCESS_URL', env('APP_URL', 'http://localhost:3000') . '/payment/success'),
                    'cancel_url' => env('PAYPAL_CANCEL_URL', env('APP_URL', 'http://localhost:3000') . '/payment/cancel'),
                    // ✅ ACTIVATION CARTES : Permet PayPal + cartes bancaires
                    'payment_method' => [
                        'payee_preferred' => 'UNRESTRICTED', // Accepte PayPal ET cartes
                    ]
                ]
            ];

            try {
                $response = $this->paypalClient->execute($orderRequest);
                $paypalOrderId = $response->result->id;
                
                // ✅ EXTRACTION URL D'APPROBATION
                $approvalUrl = collect($response->result->links)
                    ->where('rel', 'approve')
                    ->pluck('href')
                    ->first();

                // ✅ VALIDATION : S'assurer que l'URL existe
                if (!$approvalUrl) {
                    throw new Exception('URL d\'approbation PayPal manquante dans la réponse');
                }

                // Ajouter useraction=commit si absent
                if ($approvalUrl && !str_contains($approvalUrl, 'useraction=commit')) {
                    $approvalUrl .= '&useraction=commit';
                }

                // Mettre à jour la transaction avec l'ID de l'ordre PayPal
                $transaction->update(['paypal_order_id' => $paypalOrderId]);

                Log::info('PayPal order created successfully', [
                    'transaction_id' => $transaction->id,
                    'paypal_order_id' => $paypalOrderId,
                    'payment_method' => $paymentMethod,
                    'approval_url' => $approvalUrl
                ]);

            } catch (Exception $e) {
                Log::error('PayPal order creation failed', [
                    'transaction_id' => $transaction->id,
                    'payment_method' => $paymentMethod,
                    'error' => $e->getMessage()
                ]);
                throw new Exception('Erreur lors de la création de l\'ordre PayPal: ' . $e->getMessage());
            }
        } else {
            throw new Exception("Méthode de paiement non supportée: {$paymentMethod}");
        }

        DB::commit();

        Log::info('Credit purchase transaction created', [
            'transaction_id' => $transaction->id,
            'user_id' => $userId,
            'package_id' => $packageId,
            'amount' => $package->price,
            'payment_method' => $paymentMethod,
            'paypal_order_id' => $paypalOrderId,
            'approval_url' => $approvalUrl
        ]);

        return [
            'transaction' => $transaction,
            'paypal_order_id' => $paypalOrderId,
            'approval_url' => $approvalUrl
        ];

    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Credit purchase transaction creation failed', [
            'user_id' => $userId,
            'package_id' => $packageId,
            'payment_method' => $paymentMethod,
            'error' => $e->getMessage(),
        ]);
        throw $e;
    }
}


    /**
     * Compléter un achat de crédits
     */
          public function completeCreditPurchase(
        PaymentTransaction $transaction,
        string $paypalOrderId = null
    ): bool {
        if (!$transaction->isCreditPurchase() || !$transaction->isPending()) {
            throw new Exception('Transaction invalide pour complétion d\'achat de crédits');
        }

        try {
            DB::beginTransaction();

            // Vérifier l'ordre PayPal
            if ($paypalOrderId && $paypalOrderId !== $transaction->paypal_order_id) {
                throw new Exception('ID de l\'ordre PayPal invalide');
            }

            // Marquer la transaction comme complétée
            $transaction->markAsCompleted();
            
            if ($paypalOrderId) {
                $transaction->update(['paypal_order_id' => $paypalOrderId]);
            }

            // Ajouter les crédits à l'utilisateur
            $package = CreditPackage::findByKey($transaction->package_id);
            if ($package) {
                $this->addCreditsToUser(
                    $transaction->user_id,
                    $package->total_credits,
                    $transaction->id,
                    "Achat package: {$package->name}"
                );
            }

            // Générer la facture
            $invoice = PaymentInvoice::createFromTransaction($transaction);
            $invoice->markAsPaid();

            DB::commit();

            Log::info('Credit purchase completed', [
                'transaction_id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'credits_added' => $package->total_credits ?? 0,
                'invoice_id' => $invoice->id,
                'payment_method' => $transaction->metadata['payment_method']
            ]);

            return true;

        } catch (Exception $e) {
            DB::rollBack();
            
            $transaction->markAsFailed($e->getMessage());
            
            Log::error('Credit purchase completion failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }


    /**
     * ✅ MÉTHODES - ABONNEMENTS
     */
/**
     * Créer une transaction d'abonnement
     */
   public function createSubscriptionTransaction(
    int $userId,
    string $planId,
    string $billingCycle,
    array $billingInfo = [],
    string $source = 'web'
): array {
    $plan = SubscriptionPlan::findByKey($planId);
    if (!$plan || !$plan->is_active) {
        throw new Exception("Plan d'abonnement non trouvé ou inactif: {$planId}");
    }

    if (!in_array($billingCycle, ['monthly', 'yearly'])) {
        throw new Exception("Cycle de facturation invalide: {$billingCycle}");
    }

    try {
        DB::beginTransaction();

        $amount = $plan->getPrice($billingCycle);
        $paypalPlanId = $plan->getPayPalPlanId($billingCycle);

        $transaction = PaymentTransaction::create([
            'user_id' => $userId,
            'type' => PaymentTransaction::TYPE_SUBSCRIPTION,
            'amount' => $amount,
            'currency' => 'EUR',
            'status' => PaymentTransaction::STATUS_PENDING,
            'plan_id' => $planId,
            'metadata' => [
                'plan_name' => $plan->name,
                'billing_cycle' => $billingCycle,
                'paypal_plan_id' => $paypalPlanId,
                'billing_info' => $billingInfo,
                'source' => $source,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ],
        ]);

        // Créer l'ordre PayPal pour l'abonnement
        $orderRequest = new OrdersCreateRequest();
        $orderRequest->prefer('return=representation');
        $orderRequest->body = [
            'intent' => 'SUBSCRIBE',
            'purchase_units' => [
                [
                    'amount' => [
                        'currency_code' => 'EUR',
                        'value' => number_format($amount, 2, '.', '')
                    ],
                    'description' => "{$plan->name} - Abonnement {$billingCycle}",
                    'custom_id' => "SUB_{$transaction->id}"
                ]
            ],
            'application_context' => [
                'brand_name' => env('COMPANY_NAME', 'PixelRise AI'),
                'landing_page' => 'BILLING',
                'user_action' => 'SUBSCRIBE_NOW',
                'return_url' => env('PAYPAL_SUCCESS_URL', env('APP_URL', 'http://localhost:3000') . '/payment/success'),
                'cancel_url' => env('PAYPAL_CANCEL_URL', env('APP_URL', 'http://localhost:3000') . '/payment/cancel'),
                'payment_method' => [
                    'payee_preferred' => 'UNRESTRICTED',
                ]
            ],
            'plan_id' => $paypalPlanId,
        ];

        $response = $this->paypalClient->execute($orderRequest);
        $paypalOrderId = $response->result->id;
        $approvalUrl = collect($response->result->links)
            ->where('rel', 'approve')
            ->pluck('href')
            ->first();

        if ($approvalUrl && !str_contains($approvalUrl, 'useraction=commit')) {
            $approvalUrl .= '&useraction=commit';
        }

        $transaction->update(['paypal_order_id' => $paypalOrderId]);

        DB::commit();

        Log::info('Subscription transaction created', [
            'transaction_id' => $transaction->id,
            'user_id' => $userId,
            'plan_id' => $planId,
            'billing_cycle' => $billingCycle,
            'amount' => $amount,
            'paypal_order_id' => $paypalOrderId,
            'approval_url' => $approvalUrl
        ]);

        return [
            'transaction' => $transaction,
            'paypal_subscription_id' => $paypalPlanId,
            'approval_url' => $approvalUrl
        ];

    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Subscription transaction creation failed', [
            'transaction_id' => $transaction->id ?? null,
            'user_id' => $userId,
            'plan_id' => $planId,
            'error' => $e->getMessage(),
        ]);
        throw $e;
    }
}

    /**
     * Compléter un abonnement
     */
    public function completeSubscription(
        PaymentTransaction $transaction,
        string $paypalSubscriptionId = null
    ): bool {
        if (!$transaction->isSubscription() || !$transaction->isPending()) {
            throw new Exception('Transaction invalide pour complétion d\'abonnement');
        }

        try {
            DB::beginTransaction();

            // Marquer la transaction comme complétée
            $transaction->markAsCompleted();
            
            if ($paypalSubscriptionId) {
                $transaction->update(['paypal_subscription_id' => $paypalSubscriptionId]);
            }

            // Créer ou mettre à jour l'abonnement utilisateur
            $subscriptionService = app(SubscriptionService::class);
            $subscription = $subscriptionService->createOrUpdateUserSubscription(
                $transaction->user_id,
                $transaction->plan_id,
                $transaction->metadata['billing_cycle'],
                $paypalSubscriptionId,
                $transaction->metadata['paypal_plan_id']
            );

            // Générer la facture
            $invoice = PaymentInvoice::createFromTransaction($transaction);
            $invoice->markAsPaid();

            DB::commit();

            Log::info('Subscription completed', [
                'transaction_id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'subscription_id' => $subscription->id,
                'invoice_id' => $invoice->id,
            ]);

            return true;

        } catch (Exception $e) {
            DB::rollBack();
            
            $transaction->markAsFailed($e->getMessage());
            
            Log::error('Subscription completion failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
    /**
     * ✅ MÉTHODES - RECHARGE AUTOMATIQUE
     */

    /**
     * Traiter une recharge automatique
     */
    public function processAutoRecharge(
        int $userId,
        string $packageId,
        int $triggerBalance,
        string $triggerAction = null
    ): ?PaymentTransaction {
        try {
            DB::beginTransaction();

            $userCredit = UserCredit::getOrCreateForUser($userId);
            
            // Vérifier si l'auto-recharge peut être déclenchée
            if (!$userCredit->canTriggerAutoRecharge()) {
                Log::warning('Auto-recharge cannot be triggered', [
                    'user_id' => $userId,
                    'balance' => $userCredit->current_balance,
                    'threshold' => $userCredit->auto_recharge_threshold,
                    'monthly_usage' => $userCredit->auto_recharge_used_this_month,
                    'monthly_limit' => $userCredit->auto_recharge_max_per_month,
                ]);
                
                DB::rollBack();
                return null;
            }

            $package = CreditPackage::findByKey($packageId);
            if (!$package || !$package->is_active) {
                throw new Exception("Package auto-recharge non trouvé: {$packageId}");
            }

            // Créer la transaction de recharge automatique
            $transaction = PaymentTransaction::create([
                'user_id' => $userId,
                'type' => PaymentTransaction::TYPE_AUTO_RECHARGE,
                'amount' => $package->price,
                'currency' => 'EUR',
                'status' => PaymentTransaction::STATUS_PENDING,
                'package_id' => $packageId,
                'metadata' => [
                    'package_name' => $package->name,
                    'credits_amount' => $package->credits,
                    'trigger_balance' => $triggerBalance,
                    'trigger_action' => $triggerAction,
                    'auto_recharge' => true,
                    'source' => 'auto_recharge',
                ],
            ]);

            // Créer le log de recharge automatique
            $autoRechargeService = app(AutoRechargeService::class);
            $autoRechargeLog = $autoRechargeService->createAutoRechargeLog(
                $userId,
                $triggerBalance,
                $userCredit->auto_recharge_threshold,
                $packageId,
                $package->price,
                $triggerAction
            );

            // Associer la transaction au log
            $autoRechargeLog->update(['payment_transaction_id' => $transaction->id]);

            DB::commit();

            Log::info('Auto-recharge transaction created', [
                'transaction_id' => $transaction->id,
                'user_id' => $userId,
                'package_id' => $packageId,
                'trigger_balance' => $triggerBalance,
                'auto_recharge_log_id' => $autoRechargeLog->id,
            ]);

            return $transaction;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Auto-recharge processing failed', [
                'user_id' => $userId,
                'package_id' => $packageId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - GESTION DES CRÉDITS
     */

    /**
     * Ajouter des crédits à un utilisateur
     */
     public function addCreditsToUser(
        int $userId,
        int $creditsAmount,
        int $transactionId = null,
        string $description = 'Crédits ajoutés'
    ): bool {
        try {
            $userCredit = UserCredit::getOrCreateForUser($userId);
            
            // Ajouter les crédits
            $userCredit->addCredits($creditsAmount, 'purchase');

            // Créer la transaction de crédit
            $creditService = app(CreditService::class);
            $creditService->createEarningTransaction(
                $userId,
                $creditsAmount,
                $description,
                'purchase',
                [
                    'payment_transaction_id' => $transactionId,
                    'source' => 'payment_completion',
                ]
            );

            Log::info('Credits added to user', [
                'user_id' => $userId,
                'credits_amount' => $creditsAmount,
                'new_balance' => $userCredit->current_balance,
                'transaction_id' => $transactionId,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Failed to add credits to user', [
                'user_id' => $userId,
                'credits_amount' => $creditsAmount,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * ✅ MÉTHODES - UTILITAIRES
     */

    /**
     * Obtenir l'historique des transactions d'un utilisateur
     */
    public function getUserTransactionHistory(int $userId, int $limit = 20): array
    {
        $transactions = PaymentTransaction::forUser($userId)
            ->with(['creditTransactions', 'invoice'])
            ->latest()
            ->limit($limit)
            ->get();

        return $transactions->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'type' => $transaction->type,
                'typeDescription' => $transaction->type_description,
                'amount' => $transaction->amount,
                'amountWithTax' => $transaction->amount_with_tax,
                'currency' => $transaction->currency,
                'status' => $transaction->status,
                'statusDescription' => $transaction->status_description,
                'packageId' => $transaction->package_id,
                'planId' => $transaction->plan_id,
                'createdAt' => $transaction->created_at->toDateString(),
                'createdAtTime' => $transaction->created_at->format('H:i'),
                'completedAt' => $transaction->completed_at?->toDateString(),
                'paypalOrderId' => $transaction->paypal_order_id,
                'paypalSubscriptionId' => $transaction->paypal_subscription_id,
                'hasInvoice' => $transaction->invoice !== null,
                'invoiceNumber' => $transaction->invoice?->invoice_number,
            ];
        })->toArray();
    }

    /**
     * Obtenir les statistiques de paiement d'un utilisateur
     */
    public function getUserPaymentStats(int $userId): array
    {
        $transactions = PaymentTransaction::forUser($userId)->get();
        
        return [
            'total_transactions' => $transactions->count(),
            'total_spent' => $transactions->where('status', PaymentTransaction::STATUS_COMPLETED)
                                       ->sum('amount'),
            'total_credit_purchases' => $transactions->where('type', PaymentTransaction::TYPE_CREDIT_PURCHASE)
                                                   ->where('status', PaymentTransaction::STATUS_COMPLETED)
                                                   ->count(),
            'total_subscriptions' => $transactions->where('type', PaymentTransaction::TYPE_SUBSCRIPTION)
                                                 ->where('status', PaymentTransaction::STATUS_COMPLETED)
                                                 ->count(),
            'total_auto_recharges' => $transactions->where('type', PaymentTransaction::TYPE_AUTO_RECHARGE)
                                                  ->where('status', PaymentTransaction::STATUS_COMPLETED)
                                                  ->count(),
            'by_month' => $transactions->where('status', PaymentTransaction::STATUS_COMPLETED)
                                     ->groupBy(function ($transaction) {
                                         return $transaction->created_at->format('Y-m');
                                     })
                                     ->map(function ($monthTransactions) {
                                         return [
                                             'count' => $monthTransactions->count(),
                                             'amount' => $monthTransactions->sum('amount'),
                                         ];
                                     }),
        ];
    }

    /**
     * Vérifier si une transaction peut être remboursée
     */
    public function canRefundTransaction(PaymentTransaction $transaction): bool
    {
        // Ne peut rembourser que les transactions complétées
        if (!$transaction->isCompleted()) {
            return false;
        }

        // Limite de 30 jours pour les remboursements
        $refundDeadline = $transaction->completed_at->addDays(30);
        if (now()->gt($refundDeadline)) {
            return false;
        }

        // Pas déjà remboursée
        if ($transaction->isRefunded()) {
            return false;
        }

        return true;
    }

    /**
     * Traiter un remboursement
     */
    public function processRefund(
        PaymentTransaction $transaction,
        string $reason = 'Demande de remboursement'
    ): bool {
        if (!$this->canRefundTransaction($transaction)) {
            throw new Exception('Cette transaction ne peut pas être remboursée');
        }

        try {
            DB::beginTransaction();

            // Marquer la transaction comme remboursée
            $transaction->markAsRefunded();

            // Si c'est un achat de crédits, retirer les crédits
            if ($transaction->isCreditPurchase()) {
                $package = CreditPackage::findByKey($transaction->package_id);
                if ($package) {
                    $creditService = app(CreditService::class);
                    $creditService->createSpendingTransaction(
                        $transaction->user_id,
                        $package->total_credits,
                        "Remboursement: {$package->name}",
                        'refund',
                        ['payment_transaction_id' => $transaction->id]
                    );
                }
            }

            // Marquer la facture comme remboursée
            if ($transaction->invoice) {
                $transaction->invoice->markAsRefunded();
            }

            DB::commit();

            Log::info('Transaction refunded', [
                'transaction_id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'amount' => $transaction->amount,
                'reason' => $reason,
            ]);

            return true;

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('Refund processing failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}