<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Services\OpenAI\SprintGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class GenerateUserSprintJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // 10 minutes max
    public $tries = 2; // 2 tentatives
    public $maxExceptions = 1;

    private User $user;
    private Project $project;
    private ?int $userFeatureAccessId; // ✅ NOUVEAU : ID de l'achat

    public function __construct(User $user, Project $project, ?int $userFeatureAccessId = null)
    {
        $this->user = $user;
        $this->project = $project;
        $this->userFeatureAccessId = $userFeatureAccessId;

        // Assigner à la queue default (traitée par le worker)
        $this->onQueue('default');
    }

    /**
     * ✅ Générer automatiquement un sprint pour un utilisateur/projet
     */
    public function handle(): void
    {
        try {
            $weekInfo = $this->getCurrentWeekInfo();
            
            Log::info("🚀 [SPRINT-JOB] Génération sprint automatique démarrée", [
                'user_id' => $this->user->id,
                'user_name' => $this->user->name,
                'project_id' => $this->project->id,
                'project_name' => $this->project->name,
                'week' => $weekInfo['week_formatted'],
                'week_number' => $weekInfo['week_number'],
                'year' => $weekInfo['year'],
                'timestamp' => now()->toISOString()
            ]);

            // ✅ NOUVEAU : Vérifier l'accès à la fonctionnalité sprint
            if (!$this->hasSprintAccess()) {
                Log::info("⏭️ [SPRINT-JOB] Utilisateur sans accès sprint", [
                    'user_id' => $this->user->id,
                    'user_name' => $this->user->name,
                    'reason' => 'no_sprint_access'
                ]);
                return; // Sortir silencieusement, pas d'erreur
            }

            // ✅ Marquer génération en cours
            $cacheKey = "sprint_generation_{$this->user->id}_{$this->project->id}_{$weekInfo['week_number']}_{$weekInfo['year']}";
            Cache::put($cacheKey, [
                'status' => 'processing',
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'started_at' => now()->toISOString(),
                'job_id' => $this->job ? $this->job->getJobId() : 'manual_execution'
            ], now()->addHours(2));

            // ✅ Vérifier si sprint déjà généré
            $existingSprint = $this->checkExistingSprint($weekInfo);
            if ($existingSprint) {
                Log::info("⏭️ [SPRINT-JOB] Sprint déjà généré", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'existing_sprint_id' => $existingSprint->id,
                    'week' => $weekInfo['week_formatted']
                ]);
                
                Cache::forget($cacheKey);
                return;
            }

            // ✅ Générer le sprint via le service IA
            $result = $this->generateSprintWithAI($weekInfo);

            if ($result['success']) {
                $sprint = $this->createSprintInDatabase($result['sprint'], $weekInfo);
                $tasksCreated = $this->createSprintTasks($sprint, $result['sprint'], $weekInfo);
                
                Log::info("✅ [SPRINT-JOB] Sprint généré avec succès", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'sprint_id' => $sprint->id,
                    'sprint_title' => $sprint->title,
                    'tasks_created' => $tasksCreated,
                    'week' => $weekInfo['week_formatted']
                ]);

                // ✅ Marquer la génération comme terminée
                Cache::put("sprint_completed_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
                    'status' => 'completed',
                    'sprint_id' => $sprint->id,
                    'tasks_count' => $tasksCreated,
                    'completed_at' => now()->toISOString()
                ], now()->addDays(7));

            } else {
                Log::error("❌ [SPRINT-JOB] Échec génération sprint", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'error' => $result['error'] ?? 'Erreur inconnue',
                    'week' => $weekInfo['week_formatted']
                ]);

                // Marquer l'échec
                Cache::put("sprint_failed_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
                    'status' => 'failed',
                    'error' => $result['error'] ?? 'Erreur inconnue',
                    'failed_at' => now()->toISOString()
                ], now()->addHours(24));

                throw new \Exception($result['error'] ?? 'Échec génération sprint');
            }

            // ✅ Nettoyer cache génération en cours
            Cache::forget($cacheKey);

        } catch (\Exception $e) {
            Log::error("💥 [SPRINT-JOB] Exception génération sprint", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Marquer l'échec en cache
            $weekInfo = $this->getCurrentWeekInfo();
            Cache::put("sprint_failed_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'failed_at' => now()->toISOString()
            ], now()->addHours(24));

            // Nettoyer cache génération en cours
            $cacheKey = "sprint_generation_{$this->user->id}_{$this->project->id}_{$weekInfo['week_number']}_{$weekInfo['year']}";
            Cache::forget($cacheKey);

            throw $e;
        }
    }

    /**
     * ✅ Vérifier si l'utilisateur a accès à la fonctionnalité sprint
     */
    private function hasSprintAccess(): bool
    {
        try {
            $access = \App\Models\UserFeatureAccess::where('user_id', $this->user->id)
                ->whereHas('feature', function ($query) {
                    $query->where('key', 'sprint_planning');
                })
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->where(function($q) {
                    $q->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
                })
                ->exists();

            Log::debug("🔍 [SPRINT-JOB] Vérification accès sprint", [
                'user_id' => $this->user->id,
                'has_access' => $access
            ]);

            return $access;

        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-JOB] Erreur vérification accès sprint", [
                'user_id' => $this->user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * ✅ Obtenir les informations de la semaine courante
     */
    private function getCurrentWeekInfo(): array
    {
        $now = Carbon::now();
        $startDate = $now->copy()->startOfWeek(); // Lundi
        $endDate = $now->copy()->endOfWeek(); // Dimanche
        
        return [
            'now' => $now,
            'week_number' => $now->weekOfYear,
            'year' => $now->year,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'week_formatted' => $now->format('Y-W')
        ];
    }

    /**
     * ✅ Vérifier si sprint existe déjà
     */
    private function checkExistingSprint(array $weekInfo): ?Sprint
    {
        return Sprint::where('user_id', $this->user->id)
            ->where('project_id', $this->project->id)
            ->where('week_number', $weekInfo['week_number'])
            ->where('year', $weekInfo['year'])
            ->first();
    }

    /**
     * ✅ Générer le sprint via IA
     */
    private function generateSprintWithAI(array $weekInfo): array
    {
        try {
            Log::info("🧠 [SPRINT-JOB] Génération IA démarrée", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'week' => $weekInfo['week_formatted']
            ]);

            // ✅ CORRECTION : Passer l'ID utilisateur au service pour la détection de langue
            $sprintService = new SprintGenerationService($this->user->id);
            $result = $sprintService->generateWeeklySprint(
                $this->project->id,
                $weekInfo['start_date'],
                $weekInfo['end_date']
            );

            Log::info("✅ [SPRINT-JOB] Génération IA terminée", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'success' => $result['success'],
                'has_sprint_data' => isset($result['sprint'])
            ]);

            return $result;

        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-JOB] Erreur génération IA", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération IA: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Créer le sprint en base de données
     */
    private function createSprintInDatabase(array $sprintData, array $weekInfo): Sprint
    {
        $sprint = Sprint::create([
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'user_feature_access_id' => $this->userFeatureAccessId, // ✅ NOUVEAU : Lier au purchase
            'week_number' => $weekInfo['week_number'],
            'year' => $weekInfo['year'],
            'start_date' => $weekInfo['start_date'],
            'end_date' => $weekInfo['end_date'],
            'title' => $sprintData['title'] ?? "Sprint Semaine {$weekInfo['week_number']} - {$this->project->name}",
            'description' => $sprintData['description'] ?? "Sprint automatique généré pour la semaine {$weekInfo['week_formatted']}",
            'status' => 'active'
        ]);

        Log::info("✅ [SPRINT-JOB] Sprint créé en BDD", [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'sprint_id' => $sprint->id,
            'title' => $sprint->title
        ]);

        return $sprint;
    }

    /**
     * ✅ Créer les tâches du sprint
     */
    private function createSprintTasks(Sprint $sprint, array $sprintData, array $weekInfo): int
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $tasksCreated = 0;

        foreach ($daysOfWeek as $dayIndex => $dayName) {
            $dayTasks = $sprintData['days'][$dayName] ?? [];

            if (empty($dayTasks)) {
                Log::warning("⚠️ [SPRINT-JOB] Aucune tâche pour {$dayName}", [
                    'sprint_id' => $sprint->id,
                    'day' => $dayName
                ]);
                continue;
            }

            $scheduledDate = $weekInfo['start_date']->copy()->addDays($dayIndex);

            foreach ($dayTasks as $index => $taskData) {
                try {
                    $task = Task::create([
                        'user_id' => $this->user->id,
                        'sprint_id' => $sprint->id,
                        'title' => $taskData['title'] ?? "Tâche {$dayName}",
                        'description' => $taskData['description'] ?? "Description à définir",
                        'type' => $this->mapTaskTypeToEnglish($taskData['type'] ?? 'action'),
                        'priority' => $this->mapPriorityToEnglish($taskData['priority'] ?? 'normal'),
                        'status' => 'pending',
                        'scheduled_date' => $scheduledDate,
                        'order' => $index
                    ]);

                    $tasksCreated++;

                    Log::debug("✅ [SPRINT-JOB] Tâche créée", [
                        'task_id' => $task->id,
                        'title' => $task->title,
                        'day' => $dayName,
                        'date' => $scheduledDate->format('Y-m-d')
                    ]);

                } catch (\Exception $e) {
                    Log::error("❌ [SPRINT-JOB] Erreur création tâche", [
                        'sprint_id' => $sprint->id,
                        'day' => $dayName,
                        'task_data' => $taskData,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }

        return $tasksCreated;
    }

    /**
     * ✅ Gestion des échecs
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("💀 [SPRINT-JOB] Job échoué définitivement", [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);

        // Marquer l'échec définitif
        $weekInfo = $this->getCurrentWeekInfo();
        Cache::put("sprint_failed_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
            'status' => 'failed_permanently',
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts(),
            'failed_at' => now()->toISOString()
        ], now()->addDays(1));

        // Envoyer notification d'urgence
        $this->sendFailureNotification($exception);
    }

    /**
     * ✅ Notification d'échec
     */
    private function sendFailureNotification(\Throwable $exception): void
    {
        try {
            $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');
            $subject = "⚠️ Échec génération sprint automatique - {$this->user->name}";

            $content = "ÉCHEC GÉNÉRATION SPRINT AUTOMATIQUE

👤 Utilisateur : {$this->user->name} (ID: {$this->user->id})
📂 Projet : {$this->project->name} (ID: {$this->project->id})
📅 Semaine : " . now()->format('Y-W') . "
⏰ Date : " . now()->format('d/m/Y à H:i:s') . "

ERREUR
─────────────────────────────────────────────────
{$exception->getMessage()}

ACTIONS RECOMMANDÉES
─────────────────────────────────────────────────
1. Vérifier la configuration OpenAI
2. Contrôler les données du projet
3. Lancer manuellement : php artisan sprints:generate-weekly --user={$this->user->id} --project={$this->project->id} --force

Cette notification est automatique.";

            \Mail::raw($content, function ($message) use ($adminEmail, $subject) {
                $message->to($adminEmail)
                    ->subject($subject);
            });

        } catch (\Exception $e) {
            Log::error("❌ Impossible d'envoyer notification échec sprint", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ Mapper les priorités françaises vers anglaises
     */
    private function mapPriorityToEnglish(string $priority): string
    {
        $priorityMap = [
            'haute' => 'high',
            'élevée' => 'high',
            'forte' => 'high',
            'moyenne' => 'medium',
            'modérée' => 'medium',
            'basse' => 'low',
            'faible' => 'low',
            'normale' => 'normal',
            'standard' => 'normal'
        ];

        $normalizedPriority = strtolower(trim($priority));
        return $priorityMap[$normalizedPriority] ?? $priority;
    }

    /**
     * ✅ Mapper le type de tâche du français vers l'anglais
     * Valeurs acceptées: 'mission', 'vision', 'objective', 'action'
     */
    private function mapTaskTypeToEnglish(string $type): string
    {
        $typeMap = [
            'objectif' => 'objective',
            'objectifs' => 'objective',
            'mission' => 'mission',
            'missions' => 'mission',
            'vision' => 'vision',
            'visions' => 'vision',
            'action' => 'action',
            'actions' => 'action',
            'tâche' => 'action',
            'tache' => 'action'
        ];

        $normalizedType = strtolower(trim($type));
        return $typeMap[$normalizedType] ?? 'action'; // Défaut: action
    }
}