<?php

namespace App\Console\Commands;

use App\Models\LifecycleEvent;
use App\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class InitializeWorkspaceTrials extends Command
{
    protected $signature = 'workspace:initialize-trials
                            {--days=30 : Nombre de jours d\'essai à donner aux utilisateurs existants}
                            {--dry-run : Mode test sans actions réelles}';

    protected $description = 'One-shot : initialise les périodes d\'essai pour les workspaces existants sans trial_ends_at';

    public function handle(): int
    {
        $days     = (int) $this->option('days');
        $isDryRun = $this->option('dry-run');

        $this->info('🔄 Initialisation des trials workspace' . ($isDryRun ? ' [DRY-RUN]' : ''));
        $this->info("   → {$days} jours d'essai accordés");

        // Cible : workspaces status='active' ou 'trial_active' sans trial_ends_at
        // ET sans subscription active payée
        $workspaces = Workspace::with(['owner', 'subscriptions'])
            ->whereIn('status', ['active', 'trial_active'])
            ->whereNull('trial_ends_at')
            ->get()
            ->filter(function (Workspace $ws) {
                // Exclure les workspaces ayant déjà une subscription active payée (source != 'manual' ou plan non-trial)
                return $ws->subscriptions
                    ->whereIn('status', ['active', 'grace'])
                    ->where('source', '!=', 'manual')
                    ->isEmpty();
            });

        if ($workspaces->isEmpty()) {
            $this->info('✅ Aucun workspace à initialiser.');
            return Command::SUCCESS;
        }

        $count = 0;
        $trialEndsAt = now()->addDays($days);

        foreach ($workspaces as $workspace) {
            $ownerEmail = $workspace->owner ? $workspace->owner->email : 'no owner';
            $this->line("  → Workspace #{$workspace->id} ({$ownerEmail})");

            if (!$isDryRun) {
                $workspace->update([
                    'status'          => 'trial_active',
                    'trial_starts_at' => $workspace->trial_starts_at ?? now(),
                    'trial_ends_at'   => $trialEndsAt,
                ]);

                // Mettre à jour ou créer la subscription trial
                $sub = $workspace->subscriptions()
                    ->whereIn('status', ['trial_active', 'active'])
                    ->latest()
                    ->first();

                if ($sub) {
                    $sub->update([
                        'status'   => 'trial_active',
                        'ends_at'  => $trialEndsAt,
                    ]);
                } else {
                    $workspace->subscriptions()->create([
                        'plan_key'  => 'starter',
                        'status'    => 'trial_active',
                        'starts_at' => now(),
                        'ends_at'   => $trialEndsAt,
                        'source'    => 'manual',
                    ]);
                }

                LifecycleEvent::create([
                    'workspace_id' => $workspace->id,
                    'event_type'   => 'TRIAL_INITIALIZED',
                    'event_at'     => now(),
                    'payload_json' => [
                        'days'          => $days,
                        'trial_ends_at' => $trialEndsAt->toISOString(),
                        'source'        => 'workspace:initialize-trials command',
                    ],
                    'created_at'   => now(),
                ]);
            }

            $count++;
        }

        $this->info("✅ {$count} workspace(s) initialisé(s)" . ($isDryRun ? ' [DRY-RUN, aucune action réelle]' : ''));
        $this->info("   trial_ends_at = {$trialEndsAt->format('d/m/Y')}");

        Log::info('workspace:initialize-trials terminé', [
            'count'          => $count,
            'days'           => $days,
            'trial_ends_at'  => $trialEndsAt->toISOString(),
            'dry_run'        => $isDryRun,
        ]);

        return Command::SUCCESS;
    }
}
