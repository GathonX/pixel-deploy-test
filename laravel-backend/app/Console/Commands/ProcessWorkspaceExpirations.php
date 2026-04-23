<?php

namespace App\Console\Commands;

use App\Models\BillingInvoice;
use App\Models\DeletionQueue;
use App\Models\LifecycleEvent;
use App\Models\Notification;
use App\Models\Workspace;
use App\Models\WorkspaceSubscription;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessWorkspaceExpirations extends Command
{
    protected $signature = 'workspace:process-expirations
                            {--dry-run : Mode test sans actions réelles}';

    protected $description = 'Gère le lifecycle des souscriptions workspace : rappels avant expiration, suspension, file de suppression.';

    // Jours avant expiration pour les rappels
    const REMINDER_DAYS = [15, 7, 3, 1];

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $this->info('🔄 Traitement lifecycle workspace' . ($isDryRun ? ' [DRY-RUN]' : ''));

        $stats = [
            'reminders_sent'       => 0,
            'trial_reminders_sent' => 0,
            'suspended'            => 0,
            'queued_deletion'      => 0,
            'overdue_invoices'     => 0,
        ];

        try {
            $this->processReminders($isDryRun, $stats);
            $this->processTrialReminders($isDryRun, $stats);
            $this->processSuspensions($isDryRun, $stats);
            $this->processOverdueInvoices($isDryRun, $stats);

            $this->table(
                ['Action', 'Nombre'],
                [
                    ['Rappels abonnement envoyés', $stats['reminders_sent']],
                    ['Rappels essai envoyés',      $stats['trial_reminders_sent']],
                    ['Workspaces suspendus',        $stats['suspended']],
                    ['En file suppression',         $stats['queued_deletion']],
                    ['Factures overdue',            $stats['overdue_invoices']],
                ]
            );

            Log::info('workspace:process-expirations terminé', $stats);
            return Command::SUCCESS;

        } catch (\Throwable $e) {
            $this->error('❌ ' . $e->getMessage());
            Log::error('workspace:process-expirations erreur', ['error' => $e->getMessage()]);
            return Command::FAILURE;
        }
    }

    // -------------------------------------------------------------------------
    // Rappels avant expiration (J-15, J-7, J-3, J-1)
    // -------------------------------------------------------------------------
    private function processReminders(bool $isDryRun, array &$stats): void
    {
        foreach (self::REMINDER_DAYS as $daysLeft) {
            $targetDate = now()->addDays($daysLeft)->toDateString();

            $subscriptions = WorkspaceSubscription::with('workspace.owner')
                ->whereIn('status', ['active', 'grace'])
                ->whereNotNull('ends_at')
                ->whereDate('ends_at', $targetDate)
                ->get();

            foreach ($subscriptions as $sub) {
                $workspace = $sub->workspace;
                if (!$workspace || !$workspace->owner) continue;

                // Éviter doublon : vérifier qu'on n'a pas envoyé ce rappel aujourd'hui
                $alreadySent = LifecycleEvent::where('workspace_id', $workspace->id)
                    ->where('event_type', "REMINDER_J{$daysLeft}")
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) continue;

                $this->info("  Rappel J-{$daysLeft} → workspace #{$workspace->id} ({$workspace->owner->email})");

                if (!$isDryRun) {
                    $this->sendReminderEmail($workspace->owner, $workspace, $sub, $daysLeft);
                    $this->sendReminderNotification($workspace->owner->id, $workspace, $daysLeft);

                    LifecycleEvent::create([
                        'workspace_id' => $workspace->id,
                        'event_type'   => "REMINDER_J{$daysLeft}",
                        'event_at'     => now(),
                        'payload_json' => ['days_left' => $daysLeft, 'ends_at' => $sub->ends_at],
                        'created_at'   => now(),
                    ]);
                }

                $stats['reminders_sent']++;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Rappels essai gratuit (J-7, J-3, J-1 avant trial_ends_at)
    // -------------------------------------------------------------------------
    private function processTrialReminders(bool $isDryRun, array &$stats): void
    {
        $trialReminderDays = [7, 3, 1];

        foreach ($trialReminderDays as $daysLeft) {
            $targetDate = now()->addDays($daysLeft)->toDateString();

            $workspaces = Workspace::with('owner')
                ->where('status', 'trial_active')
                ->whereNotNull('trial_ends_at')
                ->whereDate('trial_ends_at', $targetDate)
                ->get();

            foreach ($workspaces as $workspace) {
                if (!$workspace->owner) continue;

                $alreadySent = LifecycleEvent::where('workspace_id', $workspace->id)
                    ->where('event_type', "TRIAL_REMINDER_J{$daysLeft}")
                    ->whereDate('created_at', today())
                    ->exists();

                if ($alreadySent) continue;

                $this->info("  Rappel essai J-{$daysLeft} → workspace #{$workspace->id} ({$workspace->owner->email})");

                if (!$isDryRun) {
                    $this->sendTrialReminderEmail($workspace->owner, $workspace, $daysLeft);
                    $this->sendTrialReminderNotification($workspace->owner->id, $workspace, $daysLeft);

                    LifecycleEvent::create([
                        'workspace_id' => $workspace->id,
                        'event_type'   => "TRIAL_REMINDER_J{$daysLeft}",
                        'event_at'     => now(),
                        'payload_json' => ['days_left' => $daysLeft, 'trial_ends_at' => $workspace->trial_ends_at],
                        'created_at'   => now(),
                    ]);
                }

                $stats['trial_reminders_sent']++;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Suspension des workspaces expirés (J0)
    // -------------------------------------------------------------------------
    private function processSuspensions(bool $isDryRun, array &$stats): void
    {
        // 1) Subscriptions payées expirées (status active/grace)
        $expiredSubs = WorkspaceSubscription::with('workspace.owner')
            ->whereIn('status', ['active', 'grace'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<', now())
            ->get();

        foreach ($expiredSubs as $sub) {
            $workspace = $sub->workspace;
            if (!$workspace) continue;

            // Ignorer si déjà suspendu
            if (in_array($workspace->status, ['suspended', 'pending_deletion', 'deleted'])) continue;

            $this->info("  Suspension workspace #{$workspace->id}");

            if (!$isDryRun) {
                // Marquer souscription comme expirée
                $sub->update(['status' => 'expired']);

                // Suspendre le workspace
                $workspace->update([
                    'status'       => 'suspended',
                    'suspended_at' => now(),
                ]);

                // Log lifecycle
                LifecycleEvent::create([
                    'workspace_id' => $workspace->id,
                    'event_type'   => 'SUSPENDED',
                    'event_at'     => now(),
                    'payload_json' => ['reason' => 'subscription_expired', 'sub_id' => $sub->id],
                    'created_at'   => now(),
                ]);

                // Mettre en file de suppression à J+30
                if ($workspace->owner) {
                    $this->sendSuspensionEmail($workspace->owner, $workspace);
                    $this->sendSuspensionNotification($workspace->owner->id, $workspace);
                }

                // File de suppression (J+30 depuis suspension)
                DeletionQueue::firstOrCreate(
                    ['workspace_id' => $workspace->id, 'status' => 'pending'],
                    ['scheduled_delete_at' => now()->addDays(30)]
                );
            }

            $stats['suspended']++;
            $stats['queued_deletion']++;
        }

        // 2) Essais gratuits expirés (trial_ends_at < now)
        $expiredTrials = Workspace::with('owner')
            ->where('status', 'trial_active')
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<', now())
            ->get();

        foreach ($expiredTrials as $workspace) {
            if (in_array($workspace->status, ['suspended', 'pending_deletion', 'deleted'])) continue;

            $this->info("  Suspension essai expiré workspace #{$workspace->id}");

            if (!$isDryRun) {
                // Marquer la subscription trial comme expirée
                $workspace->subscriptions()
                    ->where('status', 'trial_active')
                    ->update(['status' => 'expired']);

                // Suspendre le workspace
                $workspace->update([
                    'status'       => 'suspended',
                    'suspended_at' => now(),
                ]);

                LifecycleEvent::create([
                    'workspace_id' => $workspace->id,
                    'event_type'   => 'SUSPENDED',
                    'event_at'     => now(),
                    'payload_json' => [
                        'reason'        => 'trial_expired',
                        'trial_ends_at' => $workspace->trial_ends_at,
                    ],
                    'created_at'   => now(),
                ]);

                if ($workspace->owner) {
                    $this->sendSuspensionEmail($workspace->owner, $workspace);
                    $this->sendSuspensionNotification($workspace->owner->id, $workspace);
                }

                DeletionQueue::firstOrCreate(
                    ['workspace_id' => $workspace->id, 'status' => 'pending'],
                    ['scheduled_delete_at' => now()->addDays(30)]
                );
            }

            $stats['suspended']++;
            $stats['queued_deletion']++;
        }
    }

    // -------------------------------------------------------------------------
    // Factures overdue
    // -------------------------------------------------------------------------
    private function processOverdueInvoices(bool $isDryRun, array &$stats): void
    {
        if ($isDryRun) return;

        // Récupérer les factures qui passent overdue (avant de les mettre à jour)
        $toMark = BillingInvoice::with(['workspace.owner'])
            ->where('status', 'issued')
            ->where('due_at', '<', now())
            ->get();

        if ($toMark->isEmpty()) return;

        // Marquer overdue en masse
        BillingInvoice::whereIn('id', $toMark->pluck('id'))->update(['status' => 'overdue']);
        $stats['overdue_invoices'] = $toMark->count();

        // Notifier chaque owner (email + in-app)
        $billing = app(BillingService::class);
        foreach ($toMark as $invoice) {
            $invoice->status = 'overdue'; // refléter l'état mis à jour
            $billing->notifyInvoiceOverdue($invoice);
        }
    }

    // -------------------------------------------------------------------------
    // Emails
    // -------------------------------------------------------------------------
    private function sendReminderEmail($user, Workspace $workspace, WorkspaceSubscription $sub, int $daysLeft): void
    {
        try {
            $planLabel = ucfirst($sub->plan_key ?? 'votre plan');
            $endsAt    = Carbon::parse($sub->ends_at)->format('d/m/Y');

            $subject = "⚠️ Votre abonnement PixelRise expire dans {$daysLeft} jour" . ($daysLeft > 1 ? 's' : '');

            $body = "Bonjour {$user->name},

Votre abonnement {$planLabel} pour le workspace \"{$workspace->name}\" expire le {$endsAt} (dans {$daysLeft} jour" . ($daysLeft > 1 ? 's' : '') . ").

QUE SE PASSE-T-IL À L'EXPIRATION ?
- La publication de nouveaux sites sera bloquée
- Votre workspace passera en mode lecture seule
- Vos données et sites existants restent conservés

RENOUVELER MAINTENANT
👉 " . config('app.frontend_url') . "/workspace/billing

Cordialement,
L'équipe PixelRise";

            Mail::raw($body, fn($m) => $m->to($user->email)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('sendReminderEmail erreur', ['error' => $e->getMessage()]);
        }
    }

    private function sendSuspensionEmail($user, Workspace $workspace): void
    {
        try {
            $subject = '🔒 Votre workspace PixelRise a été suspendu';

            $deletionDate = now()->addDays(30)->format('d/m/Y');
            $body = "Bonjour {$user->name},

Votre workspace \"{$workspace->name}\" a été suspendu car votre abonnement a expiré.

Nous sommes ravis de vous revoir ! Pour réactiver votre compte PixelRise, veuillez cliquer sur \"Je me réabonne\" :
👉 " . config('app.frontend_url') . "/workspace/billing

⚠️  IMPORTANT : Sans réactivation avant le {$deletionDate}, votre workspace et toutes ses données seront définitivement supprimés.

Cordialement,
L'équipe PixelRise";

            Mail::raw($body, fn($m) => $m->to($user->email)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('sendSuspensionEmail erreur', ['error' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // Notifications in-app
    // -------------------------------------------------------------------------
    private function sendReminderNotification(int $userId, Workspace $workspace, int $daysLeft): void
    {
        try {
            Notification::create([
                'user_id'    => $userId,
                'type'       => 'workspace_expiration_reminder',
                'priority'   => $daysLeft <= 3 ? 'urgent' : 'high',
                'status'     => 'unread',
                'title'      => "⚠️ Abonnement expire dans {$daysLeft} jour" . ($daysLeft > 1 ? 's' : ''),
                'message'    => "Votre workspace \"{$workspace->name}\" sera suspendu dans {$daysLeft} jour" . ($daysLeft > 1 ? 's' : '') . ". Renouvelez maintenant.",
                'data'       => ['workspace_id' => $workspace->id, 'days_left' => $daysLeft],
                'href'       => '/workspace/billing',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('sendReminderNotification erreur', ['error' => $e->getMessage()]);
        }
    }

    private function sendSuspensionNotification(int $userId, Workspace $workspace): void
    {
        try {
            Notification::create([
                'user_id'    => $userId,
                'type'       => 'workspace_suspended',
                'priority'   => 'urgent',
                'status'     => 'unread',
                'title'      => '🔒 Workspace suspendu',
                'message'    => "Votre workspace \"{$workspace->name}\" a été suspendu. Cliquez sur \"Je me réabonne\" pour le réactiver.",
                'data'       => ['workspace_id' => $workspace->id],
                'href'       => '/workspace/billing',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('sendSuspensionNotification erreur', ['error' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // Emails + notifications — Essai gratuit
    // -------------------------------------------------------------------------
    private function sendTrialReminderEmail($user, Workspace $workspace, int $daysLeft): void
    {
        try {
            $trialEnds = Carbon::parse($workspace->trial_ends_at)->format('d/m/Y');
            $plural    = $daysLeft > 1 ? 's' : '';
            $subject   = "⏳ Votre essai gratuit PixelRise expire dans {$daysLeft} jour{$plural}";

            $body = "Bonjour {$user->name},

Votre essai gratuit de 14 jours pour le workspace \"{$workspace->name}\" se termine le {$trialEnds} (dans {$daysLeft} jour{$plural}).

CONTINUEZ AVEC PIXELRISE
Pour ne pas perdre l'accès à vos sites et continuer à recevoir des réservations, abonnez-vous avant la fin de votre essai.

Nos plans :
- Starter  : 35 000 Ar / mois — 1 site, idéal pour démarrer
- Pro      : 120 000 Ar / mois — IA blog & social, multi-utilisateurs
- Premium  : 200 000 Ar / mois — 5 sites, fonctionnalités complètes

CHOISIR UN PLAN
👉 " . config('app.frontend_url') . "/workspace/billing

Cordialement,
L'équipe PixelRise";

            Mail::raw($body, fn($m) => $m->to($user->email)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('sendTrialReminderEmail erreur', ['error' => $e->getMessage()]);
        }
    }

    private function sendTrialReminderNotification(int $userId, Workspace $workspace, int $daysLeft): void
    {
        try {
            Notification::create([
                'user_id'    => $userId,
                'type'       => 'trial_expiration_reminder',
                'priority'   => $daysLeft <= 3 ? 'urgent' : 'high',
                'status'     => 'unread',
                'title'      => "⏳ Essai gratuit : {$daysLeft} jour" . ($daysLeft > 1 ? 's' : '') . " restant" . ($daysLeft > 1 ? 's' : ''),
                'message'    => "Votre essai pour \"{$workspace->name}\" expire bientôt. Abonnez-vous pour continuer.",
                'data'       => ['workspace_id' => $workspace->id, 'days_left' => $daysLeft, 'type' => 'trial'],
                'href'       => '/workspace/billing',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('sendTrialReminderNotification erreur', ['error' => $e->getMessage()]);
        }
    }
}
