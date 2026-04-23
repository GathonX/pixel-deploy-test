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

class GenerateOptimizedSprintJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 300; // 5 minutes max pour jour actuel
    public $tries = 2;
    public $maxExceptions = 1;

    private User $user;
    private Project $project;
    private string $generationType; // 'generation' ou 'regeneration'
    private ?int $userFeatureAccessId; // ✅ NOUVEAU : ID de l'achat

    public function __construct(User $user, Project $project, string $generationType = 'generation', ?int $userFeatureAccessId = null)
    {
        $this->user = $user;
        $this->project = $project;
        $this->generationType = $generationType;
        $this->userFeatureAccessId = $userFeatureAccessId;

        // Assigner à la queue default
        $this->onQueue('default');
    }

    /**
     * ✅ GÉNÉRATION OPTIMISÉE : Jour actuel d'abord, jours futurs après
     */
    public function handle(): void
    {
        try {
            $weekInfo = $this->getCurrentWeekInfo();
            $now = Carbon::now();
            
            Log::info("🚀 [SPRINT-OPTIMIZED] Génération optimisée démarrée", [
                'user_id' => $this->user->id,
                'user_name' => $this->user->name,
                'project_id' => $this->project->id,
                'project_name' => $this->project->name,
                'generation_type' => $this->generationType,
                'current_day' => $now->format('l'),
                'week' => $weekInfo['week_formatted'],
                'timestamp' => now()->toISOString()
            ]);

            // ✅ Vérifier l'accès à la fonctionnalité sprint
            if (!$this->hasSprintAccess()) {
                Log::info("⏭️ [SPRINT-OPTIMIZED] Utilisateur sans accès sprint", [
                    'user_id' => $this->user->id,
                    'reason' => 'no_sprint_access'
                ]);
                return;
            }

            // ✅ Marquer génération en cours
            $cacheKey = "sprint_optimized_{$this->user->id}_{$this->project->id}_{$weekInfo['week_number']}_{$weekInfo['year']}";
            Cache::put($cacheKey, [
                'status' => 'processing_current_day',
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'generation_type' => $this->generationType,
                'current_day' => $now->format('l'),
                'started_at' => now()->toISOString(),
            ], now()->addHours(2));

            // ✅ Vérifier si sprint existe déjà
            $existingSprint = $this->checkExistingSprint($weekInfo);

            // ✅ DISTINCTION : Régénération automatique VS Activation manuelle
            if ($this->generationType === 'regeneration') {
                // ✅ RÉGÉNÉRATION AUTOMATIQUE (lundi) : TOUT en progressif
                Log::info("🔄 [SPRINT-REGENERATION] Mode régénération automatique - Génération progressive complète", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'week' => $weekInfo['week_formatted']
                ]);

                if ($existingSprint) {
                    Log::info("⏭️ [SPRINT-REGENERATION] Sprint existant trouvé - Skip régénération", [
                        'sprint_id' => $existingSprint->id
                    ]);
                } else {
                    // Créer sprint vide (sans tâches immédiates)
                    $sprint = $this->createSprintInDatabase($weekInfo, 'Monday');

                    Log::info("✅ [SPRINT-REGENERATION] Sprint vide créé - Tâches générées en progressif", [
                        'sprint_id' => $sprint->id,
                        'user_id' => $this->user->id,
                        'week' => $weekInfo['week_formatted']
                    ]);
                }

                // Programmer TOUS les jours (lundi-dimanche) en progressif
                $this->scheduleFutureDaysGeneration($weekInfo, $now, true);

            } else {
                // ✅ ACTIVATION MANUELLE : Immédiat + Progressif
                Log::info("👤 [SPRINT-ACTIVATION] Mode activation manuelle - Immédiat + Progressif", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'current_day' => $now->format('l')
                ]);

                if ($existingSprint) {
                    // Sprint existe, vérifier s'il faut ajouter des tâches pour aujourd'hui
                    $this->handleExistingSprint($existingSprint, $now);
                } else {
                    // Créer nouveau sprint avec jour actuel d'abord
                    $this->createNewOptimizedSprint($weekInfo, $now);
                }

                // ✅ Programmer les jours futurs (différé de 5 minutes)
                $this->scheduleFutureDaysGeneration($weekInfo, $now, false);
            }

            // ✅ Nettoyer cache
            Cache::forget($cacheKey);

        } catch (\Exception $e) {
            Log::error("💥 [SPRINT-OPTIMIZED] Exception génération optimisée", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'generation_type' => $this->generationType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->handleError($e);
        }
    }

    /**
     * ✅ Gérer un sprint existant (ajouter tâches manquantes pour aujourd'hui)
     */
    private function handleExistingSprint(Sprint $existingSprint, Carbon $now): void
    {
        $currentDay = $now->format('l');

        // ✅ CORRECTION : Mettre à jour user_feature_access_id si manquant (anciens sprints)
        if (!$existingSprint->user_feature_access_id && $this->userFeatureAccessId) {
            $existingSprint->update(['user_feature_access_id' => $this->userFeatureAccessId]);

            Log::info("🔧 [SPRINT-OPTIMIZED] Sprint existant mis à jour avec access_id", [
                'sprint_id' => $existingSprint->id,
                'user_feature_access_id' => $this->userFeatureAccessId
            ]);
        }

        // Vérifier si les tâches d'aujourd'hui existent déjà
        $todayTasksCount = $existingSprint->tasks()
            ->whereDate('scheduled_date', $now->format('Y-m-d'))
            ->count();

        if ($todayTasksCount >= 6) {
            Log::info("✅ [SPRINT-OPTIMIZED] Tâches du jour déjà présentes (6 tâches)", [
                'user_id' => $this->user->id,
                'sprint_id' => $existingSprint->id,
                'current_day' => $currentDay,
                'existing_tasks' => $todayTasksCount
            ]);
            return;
        }

        Log::info("🎯 [SPRINT-OPTIMIZED] Génération tâches manquantes pour aujourd'hui", [
            'user_id' => $this->user->id,
            'sprint_id' => $existingSprint->id,
            'current_day' => $currentDay,
            'existing_tasks' => $todayTasksCount
        ]);

        // Générer les tâches du jour actuel
        $result = $this->generateCurrentDayOnly($now);
        
        if ($result['success']) {
            $this->createTasksForDay($existingSprint, $result, $now);
        }
    }

    /**
     * ✅ Créer un nouveau sprint optimisé (jour actuel d'abord)
     */
    private function createNewOptimizedSprint(array $weekInfo, Carbon $now): void
    {
        // 1. Générer le jour actuel d'abord
        Log::info("🎯 [SPRINT-OPTIMIZED] Génération jour actuel prioritaire", [
            'user_id' => $this->user->id,
            'current_day' => $now->format('l'),
            'date' => $now->format('Y-m-d')
        ]);

        $currentDayResult = $this->generateCurrentDayOnly($now);
        
        if (!$currentDayResult['success']) {
            throw new \Exception('Échec génération jour actuel: ' . ($currentDayResult['error'] ?? 'Erreur inconnue'));
        }

        // 2. Créer le sprint en base
        $sprint = $this->createSprintInDatabase($weekInfo, $now->format('l'));

        // 3. Créer les tâches du jour actuel
        $tasksCreated = $this->createTasksForDay($sprint, $currentDayResult, $now);
        
        Log::info("✅ [SPRINT-OPTIMIZED] Jour actuel généré avec succès", [
            'user_id' => $this->user->id,
            'sprint_id' => $sprint->id,
            'current_day' => $now->format('l'),
            'tasks_created_today' => $tasksCreated,
            'total_sprint_tasks' => $sprint->tasks()->count()
        ]);

        // 4. Marquer le jour actuel comme terminé
        Cache::put("sprint_current_day_ready_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
            'status' => 'current_day_completed',
            'sprint_id' => $sprint->id,
            'current_day' => $now->format('l'),
            'tasks_created_today' => $tasksCreated,
            'completed_at' => now()->toISOString()
        ], now()->addDays(7));
    }

    /**
     * ✅ Générer seulement les tâches du jour actuel
     */
    private function generateCurrentDayOnly(Carbon $currentDate): array
    {
        try {
            // ✅ CORRECTION : Passer l'ID utilisateur au service pour la détection de langue
            $sprintService = new SprintGenerationService($this->user->id);
            return $sprintService->generateCurrentDayTasks($this->project->id, $currentDate);
        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-OPTIMIZED] Erreur génération jour actuel", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => 'Erreur génération jour actuel: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Créer les tâches pour un jour spécifique
     */
    private function createTasksForDay(Sprint $sprint, array $dayResult, Carbon $date): int
    {
        $tasksCreated = 0;
        
        if (!isset($dayResult['tasks']) || !is_array($dayResult['tasks'])) {
            Log::warning("⚠️ [SPRINT-OPTIMIZED] Pas de tâches dans le résultat", [
                'sprint_id' => $sprint->id,
                'day_result' => $dayResult
            ]);
            return 0;
        }

        foreach ($dayResult['tasks'] as $index => $taskData) {
            try {
                $task = Task::create([
                    'user_id' => $this->user->id,
                    'sprint_id' => $sprint->id,
                    'title' => $taskData['title'] ?? "Tâche {$date->format('l')}",
                    'description' => $taskData['description'] ?? "Description à définir",
                    'type' => $this->mapTaskTypeToEnglish($taskData['type'] ?? 'action'),
                    'priority' => $this->mapPriorityToEnglish($taskData['priority'] ?? 'normal'),
                    'status' => 'pending',
                    'scheduled_date' => $date,
                    'order' => $index
                ]);

                $tasksCreated++;

                Log::debug("✅ [SPRINT-OPTIMIZED] Tâche jour actuel créée", [
                    'task_id' => $task->id,
                    'title' => $task->title,
                    'day' => $date->format('l'),
                    'date' => $date->format('Y-m-d')
                ]);

            } catch (\Exception $e) {
                Log::error("❌ [SPRINT-OPTIMIZED] Erreur création tâche", [
                    'sprint_id' => $sprint->id,
                    'task_data' => $taskData,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $tasksCreated;
    }

    /**
     * ✅ Programmer la génération des jours futurs (différé)
     */
    private function scheduleFutureDaysGeneration(array $weekInfo, Carbon $now, bool $includeCurrentDay = false): void
    {
        // Programmer un job différé pour les jours futurs
        GenerateRemainingDaysJob::dispatch($this->user, $this->project, $weekInfo, $includeCurrentDay)
            ->delay(now()->addMinutes(5)) // 5 minutes de délai
            ->onQueue('default');

        $daysScope = $includeCurrentDay ? 'TOUS les jours (lundi-dimanche)' : 'Jours futurs uniquement';

        Log::info("📅 [SPRINT-OPTIMIZED] Jours programmés", [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'current_day' => $now->format('l'),
            'include_current_day' => $includeCurrentDay,
            'scope' => $daysScope,
            'scheduled_for' => now()->addMinutes(5)->toISOString(),
            'delay_minutes' => 5
        ]);
    }

    /**
     * ✅ Créer le sprint en base de données (ou récupérer s'il existe)
     */
    private function createSprintInDatabase(array $weekInfo, string $currentDay): Sprint
    {
        // ✅ CORRECTION: Vérifier si le sprint existe déjà avant de le créer
        $sprint = Sprint::firstOrCreate(
            [
                'user_id' => $this->user->id,
                'week_number' => $weekInfo['week_number'],
                'year' => $weekInfo['year'],
            ],
            [
                'project_id' => $this->project->id,
                'user_feature_access_id' => $this->userFeatureAccessId,
                'start_date' => $weekInfo['start_date'],
                'end_date' => $weekInfo['end_date'],
                'title' => "Sprint Semaine {$weekInfo['week_number']} - {$this->project->name}",
                'description' => "Sprint optimisé - {$currentDay} généré en priorité, autres jours à suivre",
                'status' => 'active'
            ]
        );

        if ($sprint->wasRecentlyCreated) {
            Log::info("✅ [SPRINT-OPTIMIZED] Sprint créé en BDD", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'sprint_id' => $sprint->id,
                'title' => $sprint->title,
                'generation_type' => $this->generationType
            ]);
        } else {
            Log::info("ℹ️ [SPRINT-OPTIMIZED] Sprint existant récupéré", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'sprint_id' => $sprint->id,
                'title' => $sprint->title,
                'generation_type' => $this->generationType
            ]);
        }

        return $sprint;
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

            return $access;

        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-OPTIMIZED] Erreur vérification accès", [
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
        $startDate = $now->copy()->startOfWeek();
        $endDate = $now->copy()->endOfWeek();
        
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
     * ✅ NOUVEAU : Mapper le type de tâche du français vers l'anglais
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

    /**
     * ✅ Gestion des erreurs
     */
    private function handleError(\Exception $exception): void
    {
        $weekInfo = $this->getCurrentWeekInfo();
        
        // Marquer l'échec
        Cache::put("sprint_optimized_failed_{$this->user->id}_{$this->project->id}_{$weekInfo['week_formatted']}", [
            'status' => 'failed',
            'generation_type' => $this->generationType,
            'error' => $exception->getMessage(),
            'failed_at' => now()->toISOString()
        ], now()->addHours(24));

        throw $exception;
    }

    /**
     * ✅ Gestion des échecs définitifs
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("💀 [SPRINT-OPTIMIZED] Job échoué définitivement", [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'generation_type' => $this->generationType,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);

        $this->handleError($exception);
    }
}