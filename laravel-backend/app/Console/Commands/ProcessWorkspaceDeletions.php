<?php

namespace App\Console\Commands;

use App\Models\DeletionQueue;
use App\Models\LifecycleEvent;
use App\Models\Notification;
use App\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessWorkspaceDeletions extends Command
{
    protected $signature = 'workspace:process-deletions
                            {--dry-run : Mode test sans actions réelles}';

    protected $description = 'Traite la file de suppression : dernier email à J+7, suppression définitive à J+30.';

    // Jours après suspension pour le dernier avertissement
    const FINAL_NOTICE_DAYS = 7;

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $this->info('🗑️  Traitement suppressions workspace' . ($isDryRun ? ' [DRY-RUN]' : ''));

        $stats = [
            'final_notices_sent' => 0,
            'deleted'            => 0,
            'skipped'            => 0,
        ];

        try {
            $pending = DeletionQueue::with('workspace.owner')
                ->where('status', 'pending')
                ->get();

            $this->info("  {$pending->count()} workspace(s) en file de suppression");

            foreach ($pending as $entry) {
                $workspace = $entry->workspace;
                if (!$workspace) {
                    $entry->update(['status' => 'executed']);
                    continue;
                }

                // Si le workspace a été réactivé entre-temps → annuler
                if ($workspace->isActive()) {
                    $entry->update(['status' => 'canceled']);
                    $this->info("  ✅ Annulé (réactivé) : workspace #{$workspace->id}");
                    $stats['skipped']++;
                    continue;
                }

                $now          = now();
                $deleteAt     = $entry->scheduled_delete_at;
                $daysUntilDel = (int) $now->diffInDays($deleteAt, false);
                $noticeSent   = $entry->last_notice_sent_at;

                // J+7 depuis suspension = dernier avertissement (si pas encore envoyé)
                $shouldSendNotice = !$noticeSent
                    && $daysUntilDel <= (30 - self::FINAL_NOTICE_DAYS)
                    && $daysUntilDel > 0;

                if ($shouldSendNotice && !$isDryRun) {
                    $this->sendFinalNotice($workspace, $deleteAt->format('d/m/Y'));
                    $entry->update(['last_notice_sent_at' => $now]);
                    $stats['final_notices_sent']++;
                    $this->info("  📧 Dernier avis envoyé : workspace #{$workspace->id}");
                }

                // Suppression définitive si date atteinte
                if ($now->greaterThanOrEqualTo($deleteAt)) {
                    $this->info("  💥 Suppression définitive : workspace #{$workspace->id} ({$workspace->name})");

                    if (!$isDryRun) {
                        $this->executeDelete($workspace, $entry);
                    }

                    $stats['deleted']++;
                }
            }

            $this->table(
                ['Action', 'Nombre'],
                [
                    ['Derniers avis envoyés',   $stats['final_notices_sent']],
                    ['Workspaces supprimés',     $stats['deleted']],
                    ['Annulés (réactivés)',      $stats['skipped']],
                ]
            );

            Log::info('workspace:process-deletions terminé', $stats);
            return Command::SUCCESS;

        } catch (\Throwable $e) {
            $this->error('❌ ' . $e->getMessage());
            Log::error('workspace:process-deletions erreur', ['error' => $e->getMessage()]);
            return Command::FAILURE;
        }
    }

    private function executeDelete(Workspace $workspace, DeletionQueue $entry): void
    {
        DB::transaction(function () use ($workspace, $entry) {
            $owner = $workspace->owner;

            // Log final avant suppression
            LifecycleEvent::create([
                'workspace_id' => $workspace->id,
                'event_type'   => 'DELETED',
                'event_at'     => now(),
                'payload_json' => ['reason' => 'inactivity_after_suspension', 'owner_email' => $owner?->email],
                'created_at'   => now(),
            ]);

            // Marquer les sites comme supprimés
            $workspace->sites()->update(['status' => 'draft', 'workspace_id' => null]);

            // Mettre à jour le workspace en deleted (pas de hard delete pour audit)
            $workspace->update([
                'status'     => 'deleted',
                'deleted_at' => now(),
            ]);

            // Marquer l'entrée deletion_queue comme exécutée
            $entry->update(['status' => 'executed']);

            Log::warning('Workspace supprimé définitivement', [
                'workspace_id'   => $workspace->id,
                'workspace_name' => $workspace->name,
                'owner_email'    => $owner?->email,
            ]);
        });
    }

    private function sendFinalNotice(Workspace $workspace, string $deletionDate): void
    {
        $owner = $workspace->owner;
        if (!$owner) return;

        try {
            $subject = '⚠️ Suppression imminente de votre workspace PixelRise';

            $body = "Bonjour {$owner->name},

DERNIER AVERTISSEMENT

Votre workspace \"{$workspace->name}\" sera définitivement supprimé le {$deletionDate}.

Toutes vos données (sites, réservations, produits, blog) seront supprimées et irrécupérables.

RÉACTIVEZ MAINTENANT POUR ÉVITER LA SUPPRESSION
👉 " . config('app.frontend_url') . "/workspace/billing

Si vous avez des questions, contactez notre support :
👉 " . config('app.frontend_url') . "/dashboard/tickets

Cordialement,
L'équipe PixelRise";

            Mail::raw($body, fn($m) => $m->to($owner->email)->subject($subject));

            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'workspace_deletion_imminent',
                'priority'   => 'urgent',
                'status'     => 'unread',
                'title'      => "⚠️ Suppression le {$deletionDate}",
                'message'    => "Votre workspace \"{$workspace->name}\" sera supprimé le {$deletionDate}. Réactivez immédiatement.",
                'data'       => ['workspace_id' => $workspace->id, 'deletion_date' => $deletionDate],
                'href'       => '/workspace/billing',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);

        } catch (\Throwable $e) {
            Log::error('sendFinalNotice erreur', ['error' => $e->getMessage()]);
        }
    }
}
