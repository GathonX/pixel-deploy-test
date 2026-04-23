<?php

namespace App\Services;

use App\Models\BillingInvoice;
use App\Models\Notification;
use App\Models\Workspace;
use App\Models\WorkspaceSubscription;
use App\Models\UserSite;
use App\Models\SitePlanAssignment;
use App\Services\PlanResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BillingService
{
    // Prix en Ariary
    const PLAN_PRICES = [
        'starter' => ['monthly' => 35000,  'yearly' => 336000],  // 35k * 12 * 0.8
        'pro'     => ['monthly' => 120000, 'yearly' => 1152000], // 120k * 12 * 0.8
        'premium' => ['monthly' => 200000, 'yearly' => 1920000], // 200k * 12 * 0.8
    ];

    // Prix en Euro (équivalents)
    const PLAN_PRICES_EUR = [
        'starter' => ['monthly' => 8.00,  'yearly' => 77.00],
        'pro'     => ['monthly' => 25.00, 'yearly' => 240.00],
        'premium' => ['monthly' => 40.00, 'yearly' => 384.00],
    ];

    const EXTRA_LANGUAGE_PRICE = 20000; // Ar/mois
    const EXTRA_LANGUAGE_PRICE_EUR = 4.00; // €/mois

    const EXTRA_USER_PRICE = 15000; // Ar/mois
    const EXTRA_USER_PRICE_EUR = 3.00; // €/mois

    /**
     * Crée une facture pour la souscription principale du workspace.
     */
    public function createWorkspaceInvoice(
        Workspace $workspace,
        string $planKey,
        string $billingPeriod = 'monthly'
    ): BillingInvoice {
        $amount    = self::PLAN_PRICES[$planKey][$billingPeriod] ?? self::PLAN_PRICES['starter']['monthly'];
        $amountEur = self::PLAN_PRICES_EUR[$planKey][$billingPeriod] ?? self::PLAN_PRICES_EUR['starter']['monthly'];

        return BillingInvoice::create([
            'workspace_id'       => $workspace->id,
            'site_id'            => null,
            'subscription_scope' => 'workspace',
            'invoice_number'     => BillingInvoice::generateInvoiceNumber(),
            'plan_key'           => $planKey,
            'billing_period'     => $billingPeriod,
            'amount_ariary'      => $amount,
            'amount_eur'         => $amountEur,
            'currency'           => 'MGA',
            'status'             => 'issued',
            'payment_reference'  => BillingInvoice::generatePaymentReference(),
            'due_at'             => now()->addDays(7),
        ]);
    }

    /**
     * Crée une facture pour un site supplémentaire (Premium >5 sites).
     * Crée aussi la WorkspaceSubscription dédiée + SitePlanAssignment en attente.
     */
    public function createSiteInvoice(
        Workspace $workspace,
        UserSite $site,
        string $planKey,
        string $billingPeriod = 'monthly'
    ): BillingInvoice {
        $amount    = self::PLAN_PRICES[$planKey][$billingPeriod] ?? self::PLAN_PRICES['starter']['monthly'];
        $amountEur = self::PLAN_PRICES_EUR[$planKey][$billingPeriod] ?? self::PLAN_PRICES_EUR['starter']['monthly'];

        return DB::transaction(function () use ($workspace, $site, $planKey, $billingPeriod, $amount, $amountEur) {
            // Créer la souscription dédiée (en attente de paiement)
            $dedicatedSub = WorkspaceSubscription::create([
                'workspace_id' => $workspace->id,
                'plan_key'     => $planKey,
                'status'       => 'suspended', // activée après paiement confirmé
                'starts_at'    => now(),
                'ends_at'      => $billingPeriod === 'yearly' ? now()->addYear() : now()->addMonth(),
                'source'       => 'manual',
            ]);

            // Créer le plan assignment en attente
            SitePlanAssignment::create([
                'site_id'                  => $site->id,
                'workspace_subscription_id' => null,
                'dedicated_subscription_id' => $dedicatedSub->id,
                'effective_plan_key'        => $planKey,
                'billing_mode'              => 'dedicated_site_plan',
                'status'                    => 'payment_due',
                'starts_at'                 => now(),
                'ends_at'                   => $dedicatedSub->ends_at,
            ]);

            // Créer la facture
            return BillingInvoice::create([
                'workspace_id'       => $workspace->id,
                'site_id'            => $site->id,
                'subscription_scope' => 'site',
                'invoice_number'     => BillingInvoice::generateInvoiceNumber(),
                'plan_key'           => $planKey,
                'billing_period'     => $billingPeriod,
                'amount_ariary'      => $amount,
                'amount_eur'         => $amountEur,
                'currency'           => 'MGA',
                'status'             => 'issued',
                'payment_reference'  => BillingInvoice::generatePaymentReference(),
                'due_at'             => now()->addDays(7),
            ]);
        });
    }

    /**
     * Confirme le paiement d'une facture (action admin).
     * - Met la facture en "paid"
     * - Active la souscription et l'assignment du site si scope=site
     * - Active/crée la souscription workspace si scope=workspace
     */
    public function confirmPayment(BillingInvoice $invoice, int $adminId, string $paymentMethod): BillingInvoice
    {
        $confirmed = DB::transaction(function () use ($invoice, $adminId, $paymentMethod) {
            $invoice->update([
                'status'         => 'paid',
                'payment_method' => $paymentMethod,
                'confirmed_by'   => $adminId,
                'paid_at'        => now(),
            ]);

            if ($invoice->subscription_scope === 'site') {
                $this->activateSitePlan($invoice);
            } elseif ($invoice->subscription_scope === 'workspace') {
                $this->activateWorkspacePlan($invoice);
            }

            return $invoice->fresh();
        });

        // Notification après transaction (hors TX pour ne pas bloquer)
        $this->notifyPaymentConfirmed($confirmed);

        return $confirmed;
    }

    /**
     * Envoie l'email + notification in-app à l'owner du workspace quand le paiement est confirmé.
     */
    public function notifyPaymentConfirmed(BillingInvoice $invoice): void
    {
        try {
            $workspace = $invoice->workspace?->load('owner');
            $owner     = $workspace?->owner;
            if (!$owner) return;

            $planLabel   = ucfirst($invoice->plan_key ?? 'votre plan');
            $amount      = number_format($invoice->amount_ariary, 0, ',', ' ');
            $frontendUrl = config('app.frontend_url', 'https://pixelrise.mg');
            $period      = $invoice->billing_period === 'yearly' ? 'annuel' : 'mensuel';
            $endsAt      = $invoice->subscription_scope === 'workspace'
                ? WorkspaceSubscription::where('workspace_id', $workspace->id)
                      ->where('status', 'active')
                      ->latest('starts_at')
                      ->value('ends_at')
                : null;
            $endsAtFmt = $endsAt ? \Carbon\Carbon::parse($endsAt)->format('d/m/Y') : null;

            // — Email —
            Mail::raw(
                "Bonjour {$owner->name},\n\n" .
                "✅ Votre paiement a été confirmé et votre plan {$planLabel} est maintenant actif !\n\n" .
                "Facture : {$invoice->invoice_number}\n" .
                "Montant : {$amount} Ar ({$period})\n" .
                ($endsAtFmt ? "Prochain renouvellement : {$endsAtFmt}\n" : '') .
                "\nVous pouvez accéder à votre workspace ici :\n{$frontendUrl}/workspace\n\n" .
                "Merci de votre confiance,\nL'équipe PixelRise",
                fn($m) => $m
                    ->to($owner->email, $owner->name)
                    ->subject("✅ Paiement confirmé — Plan {$planLabel} activé")
            );

            // — Notification in-app —
            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'payment_confirmed',
                'priority'   => 'high',
                'status'     => 'unread',
                'title'      => "Paiement confirmé — Plan {$planLabel} activé",
                'message'    => "Votre paiement de {$amount} Ar a été validé. Votre plan {$planLabel} est actif" .
                                ($endsAtFmt ? " jusqu'au {$endsAtFmt}" : '') . '.',
                'data'       => [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'plan_key'       => $invoice->plan_key,
                    'amount_ariary'  => $invoice->amount_ariary,
                ],
                'href'       => '/workspace/billing',
                'category'   => 'billing',
                'show_badge' => true,
            ]);

        } catch (\Throwable $e) {
            Log::error('BillingService::notifyPaymentConfirmed error', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notifie l'owner d'un workspace qu'une facture est overdue.
     */
    public function notifyInvoiceOverdue(BillingInvoice $invoice): void
    {
        try {
            $workspace = $invoice->workspace?->load('owner');
            $owner     = $workspace?->owner;
            if (!$owner) return;

            $planLabel   = ucfirst($invoice->plan_key ?? 'votre plan');
            $amount      = number_format($invoice->amount_ariary, 0, ',', ' ');
            $dueAt       = $invoice->due_at ? \Carbon\Carbon::parse($invoice->due_at)->format('d/m/Y') : '—';
            $frontendUrl = config('app.frontend_url', 'https://pixelrise.mg');

            // — Email —
            Mail::raw(
                "Bonjour {$owner->name},\n\n" .
                "⚠️ Votre facture PixelRise est en retard de paiement.\n\n" .
                "Facture : {$invoice->invoice_number}\n" .
                "Plan : {$planLabel}\n" .
                "Montant : {$amount} Ar\n" .
                "Échéance : {$dueAt}\n\n" .
                "Pour éviter la suspension de votre compte, veuillez effectuer le paiement et le déclarer sur :\n" .
                "{$frontendUrl}/workspace/billing\n\n" .
                "L'équipe PixelRise",
                fn($m) => $m
                    ->to($owner->email, $owner->name)
                    ->subject("⚠️ Facture {$invoice->invoice_number} en retard de paiement")
            );

            // — Notification in-app —
            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'invoice_overdue',
                'priority'   => 'urgent',
                'status'     => 'unread',
                'title'      => "Facture en retard — {$invoice->invoice_number}",
                'message'    => "Votre facture de {$amount} Ar (plan {$planLabel}) est en retard. Réglez-la pour éviter la suspension.",
                'data'       => [
                    'invoice_id'     => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'plan_key'       => $invoice->plan_key,
                    'amount_ariary'  => $invoice->amount_ariary,
                    'due_at'         => $invoice->due_at,
                ],
                'href'       => '/workspace/billing',
                'category'   => 'billing',
                'show_badge' => true,
            ]);

        } catch (\Throwable $e) {
            Log::error('BillingService::notifyInvoiceOverdue error', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Marque les factures overdue (appelé par un job schedulé).
     */
    public function markOverdueInvoices(): int
    {
        return BillingInvoice::where('status', 'issued')
            ->where('due_at', '<', now())
            ->update(['status' => 'overdue']);
    }

    private function activateSitePlan(BillingInvoice $invoice): void
    {
        // Activer le SitePlanAssignment lié au site
        $assignment = SitePlanAssignment::where('site_id', $invoice->site_id)
            ->where('status', 'payment_due')
            ->latest()
            ->first();

        if ($assignment) {
            $assignment->update(['status' => 'active']);

            // Activer la souscription dédiée
            if ($assignment->dedicated_subscription_id) {
                WorkspaceSubscription::find($assignment->dedicated_subscription_id)
                    ?->update(['status' => 'active']);
            }
        }
    }

    private function activateWorkspacePlan(BillingInvoice $invoice): void
    {
        $workspace = $invoice->workspace;

        // Récupérer l'ancien plan avant de le désactiver
        $oldSub = WorkspaceSubscription::where('workspace_id', $workspace->id)
            ->whereIn('status', ['trial_active', 'active'])
            ->latest('starts_at')
            ->first();
        $oldPlanKey = $oldSub?->plan_key ?? 'starter';
        $newPlanKey = $invoice->plan_key;

        // Désactiver les anciennes souscriptions
        WorkspaceSubscription::where('workspace_id', $workspace->id)
            ->whereIn('status', ['trial_active', 'active'])
            ->update(['status' => 'canceled', 'canceled_at' => now()]);

        // Créer/activer la nouvelle souscription
        $period = $invoice->billing_period === 'yearly' ? now()->addYear() : now()->addMonth();
        WorkspaceSubscription::create([
            'workspace_id' => $workspace->id,
            'plan_key'     => $newPlanKey,
            'status'       => 'active',
            'starts_at'    => now(),
            'ends_at'      => $period,
            'source'       => 'manual',
        ]);

        // Mettre le workspace en active
        $workspace->update(['status' => 'active']);

        // Downgrade policy : si le nouveau plan a moins de slots publiés, dépublier les excédents
        $this->applyDowngradePolicy($workspace, $oldPlanKey, $newPlanKey);
    }

    /**
     * Downgrade policy : si le nouveau plan réduit le nombre de sites publiés autorisés,
     * dépublier les sites excédentaires (les plus récemment publiés en premier) et notifier l'owner.
     */
    private function applyDowngradePolicy(Workspace $workspace, string $oldPlanKey, string $newPlanKey): void
    {
        $oldMax = PlanResolver::PLAN_MAX_SITES[$oldPlanKey] ?? 1;
        $newMax = PlanResolver::PLAN_MAX_SITES[$newPlanKey] ?? 1;

        // Aucun changement ou upgrade → rien à faire
        if ($newMax >= $oldMax) {
            return;
        }

        // Sites publiés du workspace, triés du plus récemment publié au plus ancien
        $publishedSites = UserSite::where('workspace_id', $workspace->id)
            ->where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->get();

        if ($publishedSites->count() <= $newMax) {
            return; // Tout tient dans le nouveau quota
        }

        // Les sites à dépublier = ceux au-delà du nouveau quota (les plus récents d'abord)
        $toUnpublish = $publishedSites->slice($newMax);

        $unpublishedNames = [];
        foreach ($toUnpublish as $site) {
            $site->update([
                'status'       => 'draft',
                'subdomain'    => null,
                'published_at' => null,
            ]);
            $site->pages()->update(['is_published' => false]);
            $site->domains()->where('type', 'subdomain')->delete();
            $unpublishedNames[] = $site->name;

            // Log dans site_publications
            app(PlanResolver::class)->logPublication($site, 'unpublish', 'downgrade_plan', null, [
                'old_plan' => $oldPlanKey,
                'new_plan' => $newPlanKey,
            ]);
        }

        // Notifier l'owner du workspace
        $this->notifyDowngrade($workspace, $oldPlanKey, $newPlanKey, $unpublishedNames);
    }

    /**
     * Notifie l'owner qu'un downgrade a entraîné la dépublication de sites.
     */
    private function notifyDowngrade(Workspace $workspace, string $oldPlanKey, string $newPlanKey, array $unpublishedNames): void
    {
        try {
            $owner = $workspace->owner;
            if (!$owner) return;

            $oldLabel  = ucfirst($oldPlanKey);
            $newLabel  = ucfirst($newPlanKey);
            $sitesList = implode(', ', $unpublishedNames);
            $frontendUrl = config('app.frontend_url', 'https://pixelrise.mg');

            Mail::raw(
                "Bonjour {$owner->name},\n\n" .
                "⚠️ Suite au changement de votre plan {$oldLabel} → {$newLabel}, " .
                "le nombre de sites publiés autorisés a été réduit.\n\n" .
                "Les sites suivants ont été automatiquement dépubliés :\n" .
                "• " . implode("\n• ", $unpublishedNames) . "\n\n" .
                "Ils restent accessibles en brouillon dans votre dashboard.\n" .
                "Pour les republier, passez au plan {$oldLabel} ou supérieur.\n\n" .
                "{$frontendUrl}/workspace/billing\n\n" .
                "L'équipe PixelRise",
                fn($m) => $m
                    ->to($owner->email, $owner->name)
                    ->subject("⚠️ Sites dépubliés suite au changement de plan ({$oldLabel} → {$newLabel})")
            );

            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'sites_unpublished_downgrade',
                'priority'   => 'high',
                'status'     => 'unread',
                'title'      => "Sites dépubliés — Changement de plan {$oldLabel} → {$newLabel}",
                'message'    => count($unpublishedNames) . " site(s) dépublié(s) suite au downgrade : {$sitesList}. Ils restent disponibles en brouillon.",
                'data'       => [
                    'old_plan'          => $oldPlanKey,
                    'new_plan'          => $newPlanKey,
                    'unpublished_sites' => $unpublishedNames,
                ],
                'href'       => '/workspace',
                'category'   => 'billing',
                'show_badge' => true,
            ]);

        } catch (\Throwable $e) {
            Log::error('BillingService::notifyDowngrade error', [
                'workspace_id' => $workspace->id,
                'error'        => $e->getMessage(),
            ]);
        }
    }
}
