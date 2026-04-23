<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Models\User;

class GenerateImmediateSprintJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public $timeout = 300; // 5 minutes max
    public $tries = 1; // Une seule tentative

    protected $userId;
    protected $accessId;
    protected $jobId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $userId, int $accessId, string $jobId)
    {
        $this->userId = $userId;
        $this->accessId = $accessId;
        $this->jobId = $jobId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("🚀 [JOB-SPRINT] Démarrage génération immédiate sprint", [
                'job_id' => $this->jobId,
                'user_id' => $this->userId,
                'access_id' => $this->accessId
            ]);

            // ✅ Mettre à jour le statut : en cours
            $this->updateJobStatus('processing', 10, null, 'Initialisation...');

            $user = User::find($this->userId);
            if (!$user) {
                throw new \Exception("User not found: {$this->userId}");
            }

            // ✅ Vérifier si un sprint existe déjà cette semaine
            $today = \Carbon\Carbon::now();
            $weekStart = $today->copy()->startOfWeek();
            $weekEnd = $today->copy()->endOfWeek();
            
            $existingSprint = \App\Models\Sprint::where('user_id', $this->userId)
                ->where('user_feature_access_id', $this->accessId)
                ->whereBetween('start_date', [$weekStart, $weekEnd])
                ->first();

            if ($existingSprint) {
                Log::info("⏭️ [JOB-SPRINT] Sprint déjà existant - skip génération", [
                    'job_id' => $this->jobId,
                    'existing_sprint_id' => $existingSprint->id
                ]);

                $this->updateJobStatus('completed', 100, [
                    'success' => true,
                    'data' => $existingSprint,
                    'skipped' => true,
                    'message' => 'Sprint existant utilisé'
                ]);
                return;
            }

            // ✅ Statut : Récupération du projet
            $this->updateJobStatus('processing', 20, null, 'Récupération du projet actif...');

            $activeProject = \App\Models\Project::where('user_id', $this->userId)
                ->where('is_active', true)
                ->first();

            if (!$activeProject) {
                throw new \Exception("Aucun projet actif trouvé pour l'utilisateur {$this->userId}");
            }

            // ✅ Statut : Génération du sprint
            $this->updateJobStatus('processing', 40, null, 'Génération du sprint avec IA...');

            // Dispatcher le job de génération optimisée
            $sprintJob = new \App\Jobs\GenerateOptimizedSprintJob(
                $user, 
                $activeProject, 
                'generation', 
                $this->accessId
            );

            // ✅ Statut : Exécution
            $this->updateJobStatus('processing', 60, null, 'Création des tâches du sprint...');

            // Exécuter le job de manière synchrone pour avoir le résultat immédiatement
            $sprintJob->handle();

            // ✅ Statut : Vérification du résultat
            $this->updateJobStatus('processing', 80, null, 'Finalisation...');

            // Récupérer le sprint créé
            $createdSprint = \App\Models\Sprint::where('user_id', $this->userId)
                ->where('user_feature_access_id', $this->accessId)
                ->whereBetween('start_date', [$weekStart, $weekEnd])
                ->first();

            if ($createdSprint) {
                Log::info("✅ [JOB-SPRINT] Sprint généré avec succès", [
                    'job_id' => $this->jobId,
                    'sprint_id' => $createdSprint->id,
                    'tasks_count' => $createdSprint->tasks()->count()
                ]);

                $this->updateJobStatus('completed', 100, [
                    'success' => true,
                    'data' => $createdSprint->load('tasks'),
                    'message' => 'Sprint généré avec succès',
                    'tasks_count' => $createdSprint->tasks()->count()
                ]);
            } else {
                throw new \Exception("Sprint créé mais non trouvé en base de données");
            }

        } catch (\Exception $e) {
            Log::error("❌ [JOB-SPRINT] Erreur génération", [
                'job_id' => $this->jobId,
                'user_id' => $this->userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->updateJobStatus('failed', 0, [
                'success' => false,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Mettre à jour le statut du job dans le cache
     */
    private function updateJobStatus(string $status, int $progress, ?array $result = null, ?string $currentStep = null): void
    {
        $cacheKey = "sprint_job_{$this->jobId}";

        $data = [
            'job_id' => $this->jobId,
            'status' => $status, // pending, processing, completed, failed
            'progress' => $progress,
            'current_step' => $currentStep,
            'user_id' => $this->userId,
            'feature_key' => 'sprint_planning',
            'access_id' => $this->accessId,
            'updated_at' => now()->toISOString()
        ];

        if ($result) {
            $data['result'] = $result;
        }

        // ✅ Garder en cache pendant 10 minutes
        Cache::put($cacheKey, $data, now()->addMinutes(10));

        Log::info("📊 [JOB-SPRINT] Statut mis à jour", [
            'job_id' => $this->jobId,
            'status' => $status,
            'progress' => $progress,
            'step' => $currentStep
        ]);
    }
}
