<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Sprint;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;

class FixSprintAccessIds extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sprints:fix-access-ids';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corriger les sprints existants sans user_feature_access_id';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Début de la correction des sprints existants...');

        // Récupérer tous les sprints sans user_feature_access_id
        $sprintsToUpdate = Sprint::whereNull('user_feature_access_id')->get();

        $this->info("📊 Sprints à corriger: {$sprintsToUpdate->count()}");

        $updatedCount = 0;
        $skippedCount = 0;

        foreach ($sprintsToUpdate as $sprint) {
            // Trouver l'access actif pour cet utilisateur
            $activeAccess = UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'sprint_planning');
                })
                ->where('user_id', $sprint->user_id)
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where(function($query) {
                    $query->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at', 'desc')
                ->first();

            if ($activeAccess) {
                // Mettre à jour le sprint avec l'access_id
                $sprint->update(['user_feature_access_id' => $activeAccess->id]);

                $updatedCount++;

                $this->info("✅ Sprint #{$sprint->id} mis à jour (user: {$sprint->user_id}, access: {$activeAccess->id})");

                Log::info('✅ [COMMAND] Sprint mis à jour', [
                    'sprint_id' => $sprint->id,
                    'user_id' => $sprint->user_id,
                    'access_id' => $activeAccess->id
                ]);
            } else {
                $skippedCount++;

                $this->warn("⚠️ Sprint #{$sprint->id} ignoré (pas d'accès actif pour user: {$sprint->user_id})");

                Log::warning('⚠️ [COMMAND] Sprint ignoré (pas d\'accès actif)', [
                    'sprint_id' => $sprint->id,
                    'user_id' => $sprint->user_id
                ]);
            }
        }

        $this->info('');
        $this->info('🎉 Correction terminée !');
        $this->table(
            ['Statut', 'Nombre'],
            [
                ['Total', $sprintsToUpdate->count()],
                ['Mis à jour', $updatedCount],
                ['Ignorés', $skippedCount],
            ]
        );

        Log::info('🎉 [COMMAND] Correction des sprints terminée', [
            'total' => $sprintsToUpdate->count(),
            'updated' => $updatedCount,
            'skipped' => $skippedCount
        ]);

        return Command::SUCCESS;
    }
}
