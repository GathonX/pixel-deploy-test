<?php

namespace App\Services;

use App\Models\Workspace;
use App\Models\WorkspaceSubscription;
use App\Models\WorkspaceUser;
use App\Models\SubscriptionPlan;
use App\Models\UserSite;
use App\Models\SitePlanAssignment;
use App\Models\SitePublication;
use App\Models\LifecycleEvent;

class PlanResolver
{
    // Fallbacks utilisés si la table subscription_plans n'est pas encore seedée
    private const FALLBACK_MAX_SITES = [
        'starter' => 1,
        'pro'     => 1,
        'premium' => 5,
    ];

    private const FALLBACK_LANGUAGES = [
        'draft'    => 1,
        'included' => 1,
        'starter'  => 1,
        'pro'      => 2,
        'premium'  => 3,
    ];

    private const FALLBACK_AI = [
        'starter' => false,
        'pro'     => true,
        'premium' => true,
    ];

    // -------------------------------------------------------------------------
    // Plan entitlements (lus depuis la table, fallback sur constantes)
    // -------------------------------------------------------------------------

    private function getPlan(string $planKey): ?SubscriptionPlan
    {
        return SubscriptionPlan::findByKey($planKey);
    }

    private function maxSitesForPlan(string $planKey): int
    {
        return $this->getPlan($planKey)?->max_published_sites
            ?? self::FALLBACK_MAX_SITES[$planKey]
            ?? 1;
    }

    private function languagesForPlan(string $planKey): int
    {
        return $this->getPlan($planKey)?->included_languages_per_site
            ?? self::FALLBACK_LANGUAGES[$planKey]
            ?? 1;
    }

    private function extraLanguagePrice(string $planKey): int
    {
        return $this->getPlan($planKey)?->extra_language_price_ariary ?? 20000;
    }

    private function maxUsersForPlan(string $planKey): int
    {
        return $this->getPlan($planKey)?->max_users ?? 1;
    }

    private function extraUserPrice(string $planKey): int
    {
        return $this->getPlan($planKey)?->extra_user_price_ariary ?? 15000;
    }

    private function aiEnabledForPlan(string $planKey): bool
    {
        return $this->getPlan($planKey)?->ai_enabled
            ?? self::FALLBACK_AI[$planKey]
            ?? false;
    }

    // -------------------------------------------------------------------------
    // Helpers publics
    // -------------------------------------------------------------------------

    /**
     * Retourne la souscription active du workspace (ou null).
     */
    public function activeSubscription(Workspace $workspace): ?WorkspaceSubscription
    {
        return $workspace->subscriptions()
            ->whereIn('status', ['trial_active', 'active', 'grace'])
            ->latest('starts_at')
            ->first();
    }

    /**
     * Vérifie si le workspace peut publier un site donné.
     */
    public function canPublishSite(UserSite $site, Workspace $workspace): array
    {
        $subscription = $this->activeSubscription($workspace);

        if (!$subscription) {
            return [
                'allowed'     => false,
                'reason_code' => 'TRIAL_EXPIRED',
                'message'     => 'Votre période d\'essai est terminée. Veuillez vous abonner pour publier votre site.',
            ];
        }

        if ($subscription->status === 'trial_active' && $workspace->trial_ends_at?->isPast()) {
            return [
                'allowed'     => false,
                'reason_code' => 'TRIAL_EXPIRED',
                'message'     => 'Votre période d\'essai est terminée. Veuillez vous abonner pour publier votre site.',
            ];
        }

        $planKey  = $subscription->plan_key ?? 'starter';
        $maxSites = $this->maxSitesForPlan($planKey);

        $publishedCount = UserSite::where('workspace_id', $workspace->id)
            ->where('status', 'published')
            ->where('id', '!=', $site->id)
            ->count();

        if ($publishedCount >= $maxSites) {
            if ($planKey === 'premium') {
                $dedicated = SitePlanAssignment::where('site_id', $site->id)
                    ->where('billing_mode', 'dedicated_site_plan')
                    ->where('status', 'active')
                    ->exists();

                if (!$dedicated) {
                    return [
                        'allowed'     => false,
                        'reason_code' => 'PLAN_REQUIRED',
                        'message'     => 'Vous avez atteint la limite de ' . $maxSites . ' sites inclus. Un plan dédié est requis pour ce site.',
                    ];
                }
            } else {
                return [
                    'allowed'     => false,
                    'reason_code' => 'PLAN_QUOTA_EXCEEDED',
                    'message'     => 'Vous avez atteint la limite de sites publiés de votre plan. Passez à un plan supérieur.',
                ];
            }
        }

        return ['allowed' => true, 'reason_code' => null, 'message' => null];
    }

    /**
     * Vérifie si le workspace peut ajouter une langue à un site.
     */
    public function canAddLanguage(UserSite $site, Workspace $workspace): array
    {
        // Vérifier qu'un abonnement workspace actif existe
        $subscription = $this->activeSubscription($workspace);
        if (!$subscription) {
            return ['allowed' => false, 'reason_code' => 'NO_ACTIVE_PLAN'];
        }

        // Quota basé sur le plan effectif du SITE (draft=1, starter=1, pro=2)
        $assignment     = SitePlanAssignment::where('site_id', $site->id)
                            ->where('status', 'active')
                            ->first();
        $sitePlanKey    = $assignment?->effective_plan_key ?? 'draft';
        $included       = $this->languagesForPlan($sitePlanKey);
        $active         = $site->languages()->where('status', 'active')->count();

        if ($active >= $included) {
            $extraPrice    = $this->extraLanguagePrice($sitePlanKey);
            $extraPriceEur = 4.00;
            return [
                'allowed'         => false,
                'reason_code'     => 'LANGUAGE_QUOTA_EXCEEDED',
                'message'         => "Votre plan inclut {$included} langue(s) par site. Ajoutez une langue payante (+{$extraPrice} Ar / +{$extraPriceEur}€/mois).",
                'extra_price'     => $extraPrice,
                'extra_price_eur' => $extraPriceEur,
            ];
        }

        return ['allowed' => true, 'reason_code' => null];
    }

    /**
     * Vérifie si le workspace peut ajouter un utilisateur supplémentaire.
     */
    public function canAddUser(Workspace $workspace): array
    {
        $subscription = $this->activeSubscription($workspace);

        if (!$subscription) {
            return ['allowed' => false, 'reason_code' => 'NO_ACTIVE_PLAN'];
        }

        $planKey  = $subscription->plan_key ?? 'starter';
        $maxUsers = $this->maxUsersForPlan($planKey);

        // 0 = illimité (plan premium)
        if ($maxUsers === 0) {
            return ['allowed' => true, 'reason_code' => null];
        }

        $currentCount = WorkspaceUser::where('workspace_id', $workspace->id)->count();

        if ($currentCount >= $maxUsers) {
            $extraPrice    = $this->extraUserPrice($planKey);
            $extraPriceEur = 3.00;
            return [
                'allowed'         => false,
                'reason_code'     => 'USER_QUOTA_EXCEEDED',
                'message'         => "Votre plan inclut {$maxUsers} utilisateur(s). Ajoutez un utilisateur supplémentaire (+{$extraPrice} Ar / +{$extraPriceEur}€/mois).",
                'extra_price'     => $extraPrice,
                'extra_price_eur' => $extraPriceEur,
            ];
        }

        return ['allowed' => true, 'reason_code' => null];
    }

    /**
     * Vérifie si l'IA est disponible pour le workspace.
     */
    public function canUseAi(Workspace $workspace): bool
    {
        $subscription = $this->activeSubscription($workspace);
        if (!$subscription) return false;

        return $this->aiEnabledForPlan($subscription->plan_key ?? 'starter');
    }

    /**
     * Résumé complet du plan pour un workspace (pour le frontend).
     */
    public function summary(Workspace $workspace): array
    {
        $subscription = $this->activeSubscription($workspace);
        $planKey      = $subscription?->plan_key ?? null;

        $totalSites     = UserSite::where('workspace_id', $workspace->id)->count();
        $publishedCount = UserSite::where('workspace_id', $workspace->id)
            ->where('status', 'published')
            ->count();

        $maxSites         = $planKey ? $this->maxSitesForPlan($planKey) : 0;
        $languagesPerSite = $planKey ? $this->languagesForPlan($planKey) : 1;
        $aiEnabled        = $planKey ? $this->aiEnabledForPlan($planKey) : false;
        $extraLangPrice   = $planKey ? $this->extraLanguagePrice($planKey) : 20000;
        $maxUsers         = $planKey ? $this->maxUsersForPlan($planKey) : 1;
        $extraUserPrice   = $planKey ? $this->extraUserPrice($planKey) : 15000;

        return [
            'workspace_status'            => $workspace->status,
            'plan_key'                    => $planKey,
            'subscription_status'         => $subscription?->status,
            'subscription_ends_at'        => $subscription?->ends_at,
            'trial_ends_at'               => $workspace->trial_ends_at,
            'total_sites_count'           => $totalSites,
            'published_sites_count'       => $publishedCount,
            'max_published_sites'         => $maxSites,
            'ai_enabled'                  => $aiEnabled,
            'languages_per_site'          => $languagesPerSite,
            'extra_language_price_ariary' => $extraLangPrice,
            'max_users'                   => $maxUsers,
            'extra_user_price_ariary'     => $extraUserPrice,
            'can_publish'                 => $subscription && $publishedCount < $maxSites,
        ];
    }

    /**
     * Log un événement de publication dans site_publications.
     */
    public function logPublication(UserSite $site, string $action, ?string $reasonCode, int $actorId, array $meta = []): void
    {
        SitePublication::create([
            'site_id'       => $site->id,
            'action'        => $action,
            'reason_code'   => $reasonCode,
            'actor_user_id' => $actorId,
            'meta_json'     => $meta ?: null,
            'created_at'    => now(),
        ]);
    }

    /**
     * Log un événement lifecycle du workspace.
     */
    public function logLifecycle(Workspace $workspace, string $eventType, ?string $siteId = null, array $payload = []): void
    {
        LifecycleEvent::create([
            'workspace_id' => $workspace->id,
            'site_id'      => $siteId,
            'event_type'   => $eventType,
            'event_at'     => now(),
            'payload_json' => $payload ?: null,
            'created_at'   => now(),
        ]);
    }
}
