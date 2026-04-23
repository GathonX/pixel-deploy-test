<?php

namespace App\Models;

use App\Notifications\CustomVerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Image;
use App\Traits\ProtectedFileFields;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, ProtectedFileFields;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'address',
        'bio',
        'website',
        'avatar',
        'language',
        'is_admin',
        'plan',
        'email_verified_at',
        // PayPal fields
        'paypal_customer_id',
        'paypal_email',
        'subscription_status',
        'subscription_plan',
        'subscription_started_at',
        'subscription_ends_at',
        'trial_ends_at',
        'billing_address',
        'company_name',
        'vat_number',
        'auto_renewal',
        'marketing_emails',
        'preferred_currency',
    ];

    /**
     * Champs de fichiers protégés contre la corruption lors des mises à jour en masse
     */
    protected array $protectedFileFields = [
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        // PayPal sensitive fields
        'paypal_customer_id',
        'vat_number',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string,string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
        // PayPal casts
        'subscription_started_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
        'trial_ends_at' => 'datetime',
        'billing_address' => 'array',
        'auto_renewal' => 'boolean',
        'marketing_emails' => 'boolean',
    ];

    /**
     * ✅ Attributs à ajouter automatiquement lors de la sérialisation
     */
    protected $appends = ['is_premium'];

    // ===== PAYPAL CONSTANTS =====

    public const SUBSCRIPTION_STATUS_NONE = 'none';
    public const SUBSCRIPTION_STATUS_TRIAL = 'trial';
    public const SUBSCRIPTION_STATUS_ACTIVE = 'active';
    public const SUBSCRIPTION_STATUS_PAST_DUE = 'past_due';
    public const SUBSCRIPTION_STATUS_CANCELLED = 'cancelled';
    public const SUBSCRIPTION_STATUS_SUSPENDED = 'suspended';
    public const SUBSCRIPTION_STATUS_EXPIRED = 'expired';

    public const PLAN_STARTER = 'starter';
    public const PLAN_PRO = 'pro';
    public const PLAN_ENTERPRISE = 'enterprise';

    /**
     * Override pour utiliser notre notification personnalisée.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new CustomVerifyEmail());
    }

    // ===== RELATIONS EXISTANTES =====

    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    public function images()
    {
        return $this->hasMany(Image::class);
    }

    /**
     * ✅ Relations manquantes nécessaires pour le UserObserver
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(UserSchedule::class);
    }

public function socialMediaPosts(): HasMany
{
    return $this->hasMany(SocialMediaPost::class, 'user_id'); // ✅ CORRECTION: user_id au lieu de author_id
}

    /**
     * Get a specific schedule by type
     */
    public function schedule(string $type)
    {
        return $this->schedules()->where('type', $type)->first();
    }

    /**
     * Les billets de blog de l'utilisateur
     */
    public function blogPosts()
    {
        return $this->hasMany(BlogPost::class);
    }

    // ===== SECTION FOLLOW - NOUVEAU SYSTÈME USERFOLLOW =====

      /**
     * Obtenir le nombre de followers - CORRECTION
     */
    public function getFollowersCount(): int
    {
        try {
            // ✅ UTILISER LA VRAIE TABLE user_follows
            return DB::table('user_follows')
                ->where('following_id', $this->id)
                ->count();
        } catch (\Exception $e) {
            Log::error("Erreur calcul followers count pour user {$this->id}: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Obtenir le nombre d'utilisateurs suivis - CORRECTION
     */
    public function getFollowingCount(): int
    {
        try {
            // ✅ UTILISER LA VRAIE TABLE user_follows
            return DB::table('user_follows')
                ->where('follower_id', $this->id)
                ->count();
        } catch (\Exception $e) {
            Log::error("Erreur calcul following count pour user {$this->id}: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * Vérifier si cet utilisateur suit un autre utilisateur - CORRECTION
     */
    public function isFollowing(int $userId): bool
    {
        try {
            // ✅ UTILISER UserFollow::isFollowing qui utilise déjà la bonne table
            return \App\Models\UserFollow::isFollowing($this->id, $userId);
        } catch (\Exception $e) {
            Log::error("Erreur vérification isFollowing pour user {$this->id} -> {$userId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Vérifier si cet utilisateur est suivi par un autre utilisateur - CORRECTION
     */
    public function isFollowedBy(int $userId): bool
    {
        try {
            // ✅ UTILISER UserFollow::isFollowing qui utilise déjà la bonne table
            return \App\Models\UserFollow::isFollowing($userId, $this->id);
        } catch (\Exception $e) {
            Log::error("Erreur vérification isFollowedBy pour user {$this->id} <- {$userId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Suivre un utilisateur - CORRECTION
     */
    public function followUser(int $userId): bool
    {
        try {
            // ✅ UTILISER UserFollow::createFollow qui utilise déjà la bonne table
            return \App\Models\UserFollow::createFollow($this->id, $userId);
        } catch (\Exception $e) {
            Log::error("Erreur followUser pour user {$this->id} -> {$userId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Ne plus suivre un utilisateur - CORRECTION
     */
    public function unfollowUser(int $userId): bool
    {
        try {
            // ✅ UTILISER UserFollow::removeFollow qui utilise déjà la bonne table
            return \App\Models\UserFollow::removeFollow($this->id, $userId);
        } catch (\Exception $e) {
            Log::error("Erreur unfollowUser pour user {$this->id} -> {$userId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * ✅ CORRIGÉ : Toggle follow/unfollow avec Log import correct
     */
    public function toggleFollow(int $userId): array
    {
        try {
            Log::info("Toggle follow: user {$this->id} -> user {$userId}");

            $isFollowing = $this->isFollowing($userId);
            Log::info("État actuel isFollowing: " . ($isFollowing ? 'true' : 'false'));

            if ($isFollowing) {
                $success = $this->unfollowUser($userId);
                $newFollowersCount = \App\Models\User::find($userId)->getFollowersCount();

                Log::info("Unfollow résultat:", [
                    'success' => $success,
                    'new_followers_count' => $newFollowersCount
                ]);

                return [
                    'action' => 'unfollowed',
                    'success' => $success,
                    'is_following' => false,
                    'followers_count' => $newFollowersCount
                ];
            } else {
                $success = $this->followUser($userId);
                $newFollowersCount = \App\Models\User::find($userId)->getFollowersCount();

                Log::info("Follow résultat:", [
                    'success' => $success,
                    'new_followers_count' => $newFollowersCount
                ]);

                return [
                    'action' => 'followed',
                    'success' => $success,
                    'is_following' => true,
                    'followers_count' => $newFollowersCount
                ];
            }
        } catch (\Exception $e) {
            Log::error("Erreur toggleFollow pour user {$this->id} -> {$userId}: " . $e->getMessage());

            return [
                'action' => 'error',
                'success' => false,
                'is_following' => false,
                'followers_count' => 0
            ];
        }
    }

    /**
     * ✅ CORRIGÉ : Get the count of blog posts for this user - Version simple
     */
    public function getArticlesCount(): int
    {
        return $this->blogPosts()->where('status', 'published')->count();
    }

    // ===== 🆕 NOUVELLES RELATIONS PAYMENT SYSTEM =====

    /**
     * ✅ NOUVEAU : Relations pour le système de paiement complet
     */

    /**
     * Utilisateur a plusieurs transactions de paiement
     */
    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    /**
     * Utilisateur a un solde de crédits unique
     */
    public function userCredit(): HasOne
    {
        return $this->hasOne(UserCredit::class);
    }

    /**
     * Utilisateur a plusieurs transactions de crédits
     */
    public function creditTransactions(): HasMany
    {
        return $this->hasMany(CreditTransaction::class);
    }

    /**
     * Utilisateur peut avoir plusieurs abonnements
     */
    public function userSubscriptions(): HasMany
    {
        return $this->hasMany(UserSubscription::class);
    }

    /**
     * Utilisateur a un abonnement actif (relation unique)
     */
    public function activeSubscription(): HasOne
    {
        return $this->hasOne(UserSubscription::class)
                    ->where('status', UserSubscription::STATUS_ACTIVE);
    }

    /**
     * Utilisateur a plusieurs complétions d'actions
     */
    public function actionCompletions(): HasMany
    {
        return $this->hasMany(UserActionCompletion::class);
    }

    /**
     * Utilisateur a plusieurs factures de paiement
     */
    public function paymentInvoices(): HasMany
    {
        return $this->hasMany(PaymentInvoice::class);
    }

    /**
     * Utilisateur a plusieurs logs de recharge automatique
     */
    public function autoRechargeLogs(): HasMany
    {
        return $this->hasMany(AutoRechargeLog::class);
    }

    /**
     * ✅ NOUVELLES MÉTHODES PAYMENT SYSTEM
     */

    /**
     * Obtenir ou créer le solde de crédits de l'utilisateur
     */
    public function getOrCreateUserCredit(): UserCredit
    {
        return UserCredit::getOrCreateForUser($this->id);
    }

    /**
     * Obtenir le solde actuel de crédits
     */
    public function getCurrentCreditBalance(): int
    {
        return $this->getOrCreateUserCredit()->current_balance;
    }

    /**
     * Vérifier si l'utilisateur a suffisamment de crédits
     */
    public function hasEnoughCredits(int $amount): bool
    {
        return $this->getCurrentCreditBalance() >= $amount;
    }

    /**
     * Obtenir l'abonnement actif actuel
     */
    public function getCurrentSubscription(): ?UserSubscription
    {
        return $this->activeSubscription;
    }

    /**
     * Vérifier si l'utilisateur a un abonnement actif
     */
    public function hasActivePaymentSubscription(): bool
    {
        return $this->activeSubscription !== null &&
               $this->activeSubscription->isActive();
    }

    /**
     * Obtenir le plan d'abonnement actuel
     */
    public function getCurrentPaymentPlan(): ?string
    {
        $subscription = $this->getCurrentSubscription();
        return $subscription ? $subscription->subscriptionPlan->plan_key : null;
    }

    /**
     * Vérifier si l'auto-recharge est activée
     */
    public function hasAutoRechargeEnabled(): bool
    {
        return $this->getOrCreateUserCredit()->auto_recharge_enabled;
    }

    /**
     * Obtenir les statistiques de paiement
     */
    public function getPaymentStats(): array
    {
        $userCredit = $this->getOrCreateUserCredit();
        $activeSubscription = $this->getCurrentSubscription();

        return [
            'credits' => [
                'current_balance' => $userCredit->current_balance,
                'lifetime_earned' => $userCredit->lifetime_earned,
                'lifetime_spent' => $userCredit->lifetime_spent,
                'monthly_earned' => $userCredit->monthly_earned,
                'monthly_spent' => $userCredit->monthly_spent,
                'auto_recharge_enabled' => $userCredit->auto_recharge_enabled,
                'is_low_balance' => $userCredit->isLowBalance(),
            ],
            'subscription' => [
                'has_active' => $this->hasActivePaymentSubscription(),
                'current_plan' => $this->getCurrentPaymentPlan(),
                'status' => $activeSubscription?->status,
                'billing_cycle' => $activeSubscription?->billing_cycle,
                'next_billing_date' => $activeSubscription?->next_billing_date?->toDateString(),
                'days_until_next_billing' => $activeSubscription?->days_until_next_billing,
            ],
            'transactions' => [
                'total_transactions' => $this->paymentTransactions()->count(),
                'total_spent' => $this->paymentTransactions()
                                    ->completed()
                                    ->sum('amount'),
                'recent_transactions' => $this->paymentTransactions()
                                           ->completed()
                                           ->latest()
                                           ->limit(5)
                                           ->count(),
            ],
            'actions' => [
                'total_completed' => $this->actionCompletions()
                                        ->approved()
                                        ->count(),
                'pending_validation' => $this->actionCompletions()
                                           ->pending()
                                           ->count(),
                'credits_from_actions' => $this->actionCompletions()
                                             ->approved()
                                             ->sum('credits_earned'),
            ]
        ];
    }

    /**
     * Obtenir les données de paiement pour le frontend
     */
    public function getPaymentDataForFrontend(): array
    {
        $stats = $this->getPaymentStats();
        $userCredit = $this->getOrCreateUserCredit();

        return [
            'user_id' => $this->id,
            'credits' => $stats['credits'],
            'subscription' => $stats['subscription'],
            'stats' => $stats,
            'auto_recharge_config' => $userCredit->auto_recharge_config,
            'recent_credit_history' => CreditTransaction::getHistoryForUser($this->id, 10),
            'recent_invoices' => PaymentInvoice::getHistoryForUser($this->id, 5),
            'auto_recharge_history' => AutoRechargeLog::getHistoryForUser($this->id, 5),
        ];
    }

    // ===== ANCIENNES RELATIONS PAYPAL SUPPRIMÉES =====
    // ❌ SUPPRIMÉ : Relations de l'ancien système PayPal qui causaient des conflits
    // ❌ SUPPRIMÉ : subscriptions(), activeSubscription(), payments(), paymentMethods(), invoices()
    // ✅ REMPLACÉ : Par les nouvelles relations du système payment ci-dessus

    // ===== ANCIENS SCOPES PAYPAL SUPPRIMÉS =====
    // ❌ SUPPRIMÉ : Scopes de l'ancien système PayPal
    // ❌ SUPPRIMÉ : withActiveSubscription(), inTrial(), withPlan()
    // ✅ REMPLACÉ : Par les nouveaux scopes du système payment ci-dessous

    // ===== 🆕 NOUVEAUX SCOPES PAYMENT SYSTEM =====

    /**
     * Scope pour les utilisateurs avec solde bas
     */
    public function scopeWithLowCreditBalance($query)
    {
        return $query->whereHas('userCredit', function ($q) {
            $q->where('current_balance', '<=', 5)
              ->orWhere(function ($subQ) {
                  $subQ->where('auto_recharge_enabled', true)
                       ->whereColumn('current_balance', '<=', 'auto_recharge_threshold');
              });
        });
    }

    /**
     * Scope pour les utilisateurs avec auto-recharge activée
     */
    public function scopeWithAutoRechargeEnabled($query)
    {
        return $query->whereHas('userCredit', function ($q) {
            $q->where('auto_recharge_enabled', true);
        });
    }

    /**
     * Scope pour les utilisateurs avec abonnement actif (nouveau système)
     */
    public function scopeWithActivePaymentSubscription($query)
    {
        return $query->whereHas('activeSubscription', function ($q) {
            $q->where('status', UserSubscription::STATUS_ACTIVE);
        });
    }

    // ===== ANCIENS ACCESSORS PAYPAL SUPPRIMÉS =====
    // ❌ SUPPRIMÉ : Accessors de l'ancien système PayPal qui causaient des conflits
    // ❌ SUPPRIMÉ : getHasActiveSubscriptionAttribute(), getIsInTrialAttribute(), etc.
    // ✅ REMPLACÉ : Par les nouvelles méthodes du système payment

    // ===== ANCIENNES MÉTHODES PAYPAL SUPPRIMÉES =====
    // ❌ SUPPRIMÉ : Méthodes de l'ancien système PayPal qui causaient des conflits
    // ❌ SUPPRIMÉ : updateSubscriptionStatus(), startTrial(), cancelSubscription(), etc.
    // ✅ REMPLACÉ : Par les nouvelles méthodes du système payment moderne

    // ===== RELATIONS SUPPLÉMENTAIRES =====

    /**
     * ✅ NOUVEAU : Relation avec les items du panier
     */
    public function cartItems(): HasMany
    {
        return $this->hasMany(\App\Models\Cart::class);
    }

    /**
     * ✅ NOUVEAU : Items actifs du panier
     */
    public function activeCartItems(): HasMany
    {
        return $this->hasMany(\App\Models\Cart::class)
                    ->where('status', 'active');
    }

    /**
     * ✅ NOUVEAU : Obtenir le panier pour un funnel spécifique
     */
    public function getCartForFunnel(int $funnelId)
    {
        return $this->activeCartItems()
                    ->where('funnel_id', $funnelId)
                    ->get();
    }

    /**
     * ✅ NOUVEAU : Calculer le total du panier
     */
    public function getCartTotal(int $funnelId = null): float
    {
        $query = $this->activeCartItems();

        if ($funnelId) {
            $query->where('funnel_id', $funnelId);
        }

        return $query->get()->sum(function ($item) {
            return $item->unit_price * $item->quantity;
        });
    }

    /**
     * ✅ NOUVEAU : Compter les items du panier
     */
    public function getCartItemsCount(int $funnelId = null): int
    {
        $query = $this->activeCartItems();

        if ($funnelId) {
            $query->where('funnel_id', $funnelId);
        }

        return $query->sum('quantity');
    }

    /**
 * Relation avec les réactions de l'utilisateur
 */
public function reactions(): HasMany
{
    return $this->hasMany(Reaction::class);
}


// À ajouter dans app/Models/User.php dans la section des relations

/**
 * Relations pour le système de fonctionnalités
 */
public function featureAccess(): HasMany
{
    return $this->hasMany(UserFeatureAccess::class);
}

public function activationRequests(): HasMany
{
    return $this->hasMany(FeatureActivationRequest::class);
}

/**
 * Vérifier l'accès à une fonctionnalité
 */
public function hasFeatureAccess(string $featureKey): bool
{
    return $this->featureAccess()
        ->whereHas('feature', function ($query) use ($featureKey) {
            $query->where('key', $featureKey)->where('is_active', true);
        })
        ->where('admin_enabled', true)
        ->where('user_activated', true)
        ->where('status', 'active')
        ->exists();
}

/**
 * Obtenir les fonctionnalités disponibles pour l'utilisateur
 */
public function getAvailableFeatures()
{
    return $this->featureAccess()
        ->with('feature')
        ->where('admin_enabled', true)
        ->get()
        ->map(function ($access) {
            return [
                'id' => $access->feature->id,
                'key' => $access->feature->key,
                'name' => $access->feature->name,
                'description' => $access->feature->description,
                'user_activated' => $access->user_activated,
                'can_toggle' => true,
            ];
        });
}

/**
 * ✅ Attribut calculé : Un utilisateur est Premium s'il a acheté au moins une fonctionnalité
 * Logique : Premium = a au moins un UserFeatureAccess actif
 *           Gratuit = aucun UserFeatureAccess ou tous inactifs
 */
public function getIsPremiumAttribute(): bool
{
    // Un utilisateur est Premium s'il a AU MOINS UNE fonctionnalité achetée (même si expirée)
    // Cela signifie qu'il a payé au moins une fois
    return $this->featureAccess()
        ->where('admin_enabled', true)
        ->exists();
}

/**
 * ==========================================
 * RELATIONS INTELLIGENT AGENT (NOUVELLES)
 * ==========================================
 */

/**
 * L'utilisateur a un agent intelligent
 */
public function intelligentAgent(): HasOne
{
    return $this->hasOne(IntelligentAgent::class);
}

/**
 * Interactions de l'agent de l'utilisateur
 */
public function agentInteractions(): HasMany
{
    return $this->hasMany(AgentInteraction::class);
}

/**
 * Données d'apprentissage de l'agent de l'utilisateur
 */
public function agentLearningData(): HasMany
{
    return $this->hasMany(AgentLearningData::class);
}

/**
 * Tâches planifiées de l'agent de l'utilisateur
 */
public function agentSchedules(): HasMany
{
    return $this->hasMany(AgentSchedule::class);
}

/**
 * Préférences pour l'agent intelligent
 */
public function agentPreferences(): HasOne
{
    return $this->hasOne(UserAgentPreferences::class);
}

/**
 * ✅ NOUVEAU : Relation vers les informations projet admin
 */
public function adminProjectInfo(): HasOne
{
    return $this->hasOne(AdminProjectInfo::class);
}

/**
 * ✅ NOUVEAU : Relation vers les objectifs hebdomadaires admin
 */
public function adminWeeklyObjectives(): HasMany
{
    return $this->hasMany(AdminWeeklyObjective::class);
}

/**
 * ==========================================
 * MÉTHODES UTILITAIRES INTELLIGENT AGENT
 * ==========================================
 */

/**
 * Obtenir ou créer l'agent intelligent de l'utilisateur
 */
public function getOrCreateIntelligentAgent(): IntelligentAgent
{
    return $this->intelligentAgent ?: $this->createIntelligentAgent();
}

/**
 * Créer un agent intelligent pour l'utilisateur
 */
public function createIntelligentAgent(string $tier = 'free'): IntelligentAgent
{
    // Déterminer le tier basé sur les fonctionnalités de l'utilisateur
    $effectiveTier = $this->determineAgentTier($tier);

    $agent = IntelligentAgent::create([
        'user_id' => $this->id,
        'name' => "Agent IA de {$this->name}",
        'tier' => $effectiveTier,
        'status' => IntelligentAgent::STATUS_ACTIVE,
        'capabilities' => null, // Sera défini automatiquement selon le tier
        'daily_quota_limit' => $effectiveTier === 'free' ? 10 : -1,
        'proactive_suggestions' => $effectiveTier !== 'free',
        'realtime_monitoring' => $effectiveTier !== 'free',
        'multi_agent_communication' => $effectiveTier !== 'free',
    ]);

    // Créer les préférences par défaut
    UserAgentPreferences::create(
        UserAgentPreferences::getDefaultPreferences($this->id, $agent->id)
    );

    return $agent;
}

/**
 * Déterminer le tier de l'agent selon les fonctionnalités utilisateur
 */
private function determineAgentTier(string $requestedTier = 'free'): string
{
    // Vérifier si l'utilisateur a des fonctionnalités payantes
    $hasPayingFeatures = $this->featureAccess()
        ->whereHas('feature', function ($query) {
            $query->where('is_active', true);
        })
        ->where('admin_enabled', true)
        ->where('user_activated', true)
        ->where('status', 'active')
        ->exists();

    if ($hasPayingFeatures) {
        // Si l'utilisateur a des fonctionnalités payantes, déterminer le niveau
        $featureCount = $this->featureAccess()
            ->whereHas('feature', function ($query) {
                $query->where('is_active', true);
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->count();

        if ($featureCount >= 5) {
            return 'enterprise';
        } elseif ($featureCount >= 1) {
            return 'premium';
        }
    }

    return 'free';
}

/**
 * Vérifier si l'utilisateur peut utiliser l'agent intelligent
 */
public function canUseIntelligentAgent(): bool
{
    $agent = $this->intelligentAgent;

    if (!$agent || !$agent->isActive()) {
        return false;
    }

    return $agent->canPerformAction();
}

/**
 * Obtenir le tier effectif de l'agent intelligent
 */
public function getIntelligentAgentTier(): string
{
    return $this->intelligentAgent?->tier ?? 'free';
}

/**
 * Vérifier si l'utilisateur a un agent premium
 */
public function hasPremiumAgent(): bool
{
    return $this->intelligentAgent?->isPremium() ?? false;
}

/**
 * Obtenir les statistiques de l'agent intelligent
 */
public function getAgentStats(): array
{
    $agent = $this->intelligentAgent;

    if (!$agent) {
        return [
            'has_agent' => false,
            'can_create' => true,
        ];
    }

    return array_merge(['has_agent' => true], $agent->getStats());
}

/**
 * Upgrader l'agent vers premium
 */
public function upgradeAgentToPremium(): bool
{
    $agent = $this->intelligentAgent;

    if (!$agent) {
        $agent = $this->createIntelligentAgent('premium');
        return true;
    }

    return $agent->update([
        'tier' => 'premium',
        'daily_quota_limit' => -1,
        'proactive_suggestions' => true,
        'realtime_monitoring' => true,
        'multi_agent_communication' => true,
        'capabilities' => $agent->getDefaultCapabilities(),
    ]);
}

/**
 * ==========================================
 * MÉTHODES DISTINCTION UTILISATEUR PAYANT/GRATUIT
 * ==========================================
 */

/**
 * Vérifier si l'utilisateur est un client payant
 * Un client payant = possède au moins une fonctionnalité achetée
 */
public function isPaidUser(): bool
{
    return $this->featureAccess()
        ->whereHas('feature', function ($query) {
            $query->where('is_active', true);
        })
        ->where('admin_enabled', true)
        ->exists();
}

/**
 * Vérifier si l'utilisateur est un client gratuit
 * Un client gratuit = n'a aucune fonctionnalité achetée
 */
public function isFreeUser(): bool
{
    return !$this->isPaidUser();
}

/**
 * Obtenir le type d'utilisateur (payant/gratuit)
 */
public function getUserType(): string
{
    return $this->isPaidUser() ? 'paid' : 'free';
}

/**
 * Obtenir le nombre de fonctionnalités possédées
 */
public function getPaidFeaturesCount(): int
{
    return $this->featureAccess()
        ->whereHas('feature', function ($query) {
            $query->where('is_active', true);
        })
        ->where('admin_enabled', true)
        ->count();
}

/**
 * Vérifier si l'utilisateur peut accéder aux fonctionnalités progressives
 * Utilisateurs gratuits : accès limité ou refusé
 * Utilisateurs payants : accès complet
 */
public function canAccessProgressiveFeatures(): bool
{
    // Les utilisateurs payants ont accès complet
    if ($this->isPaidUser()) {
        return true;
    }

    // Les utilisateurs gratuits ont un accès limité ou refusé
    // Pour l'instant, on refuse l'accès, mais on peut implémenter une logique plus fine
    return false;
}

/**
 * Obtenir les limitations basées sur le type d'utilisateur
 */
public function getUserLimitations(): array
{
    if ($this->isPaidUser()) {
        return [
            'can_access_progressive_generation' => true,
            'can_access_blog' => true,
            'can_access_social_media' => true,
            'max_posts_per_week' => -1, // Illimité
            'priority_support' => true,
        ];
    }

    return [
        'can_access_progressive_generation' => false,
        'can_access_blog' => false,
        'can_access_social_media' => false,
        'max_posts_per_week' => 0,
        'priority_support' => false,
    ];
}


    }
