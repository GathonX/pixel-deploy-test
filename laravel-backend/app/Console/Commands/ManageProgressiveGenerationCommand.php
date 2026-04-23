<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\ProcessProgressiveGenerationJob;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ManageProgressiveGenerationCommand extends Command
{
    protected $signature = 'progressive:manage {action : start, stop, status}';
    protected $description = 'Gérer le système de génération progressive via jobs';

    public function handle()
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'start':
                $this->startGeneration();
                break;
            case 'stop':
                $this->stopGeneration();
                break;
            case 'status':
                $this->showStatus();
                break;
            default:
                $this->error("Action invalide. Utilisez: start, stop, status");
                return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    private function startGeneration(): void
    {
        try {
            ProcessProgressiveGenerationJob::startCycle();
            $this->info('✅ Génération progressive démarrée via jobs');
            Log::info('🚀 [COMMAND] Génération progressive démarrée manuellement');
        } catch (\Exception $e) {
            $this->error('❌ Erreur: ' . $e->getMessage());
            Log::error('❌ [COMMAND] Erreur démarrage génération', ['error' => $e->getMessage()]);
        }
    }

    private function stopGeneration(): void
    {
        try {
            ProcessProgressiveGenerationJob::stopCycle();
            $this->info('✅ Génération progressive arrêtée');
            Log::info('🛑 [COMMAND] Génération progressive arrêtée manuellement');
        } catch (\Exception $e) {
            $this->error('❌ Erreur: ' . $e->getMessage());
            Log::error('❌ [COMMAND] Erreur arrêt génération', ['error' => $e->getMessage()]);
        }
    }

    private function showStatus(): void
    {
        try {
            $pendingJobs = DB::table('jobs')
                ->where('queue', 'posts')
                ->where('payload', 'LIKE', '%ProcessProgressiveGenerationJob%')
                ->count();

            $failedJobs = DB::table('failed_jobs')
                ->where('queue', 'posts')
                ->where('payload', 'LIKE', '%ProcessProgressiveGenerationJob%')
                ->count();

            $this->info("📊 Statut génération progressive:");
            $this->table(['Métrique', 'Valeur'], [
                ['Jobs en attente', $pendingJobs],
                ['Jobs échoués', $failedJobs],
                ['Statut', $pendingJobs > 0 ? '🟢 Actif' : '🔴 Inactif'],
                ['Dernière vérification', now()->format('H:i:s')]
            ]);

        } catch (\Exception $e) {
            $this->error('❌ Erreur récupération statut: ' . $e->getMessage());
        }
    }
}