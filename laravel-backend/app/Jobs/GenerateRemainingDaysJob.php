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

class GenerateRemainingDaysJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600; // 10 minutes max pour jours futurs
    public $tries = 2;
    public $maxExceptions = 1;

    private User $user;
    private Project $project;
    private array $weekInfo;
    private bool $includeCurrentDay;

    public function __construct(User $user, Project $project, array $weekInfo, bool $includeCurrentDay = false)
    {
        $this->user = $user;
        $this->project = $project;
        $this->weekInfo = $weekInfo;
        $this->includeCurrentDay = $includeCurrentDay;

        // Assigner à la queue default
        $this->onQueue('default');
    }

    /**
     * ✅ GÉNÉRATION DIFFÉRÉE : Jours futurs seulement
     */
    public function handle(): void
    {
        try {
            $now = Carbon::now();
            $currentDay = $now->format('l');
            
            $daysScope = $this->includeCurrentDay ? 'TOUS les jours (incluant actuel)' : 'Jours futurs uniquement';

            Log::info("📅 [SPRINT-REMAINING] Génération jours démarrée", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'current_day' => $currentDay,
                'week' => $this->weekInfo['week_formatted'],
                'include_current_day' => $this->includeCurrentDay,
                'scope' => $daysScope,
                'delayed_execution' => true,
                'timestamp' => now()->toISOString()
            ]);

            // ✅ Vérifier l'accès (sécurité)
            if (!$this->hasSprintAccess()) {
                Log::info("⏭️ [SPRINT-REMAINING] Utilisateur sans accès sprint", [
                    'user_id' => $this->user->id,
                    'reason' => 'no_sprint_access'
                ]);
                return;
            }

            // ✅ Récupérer le sprint existant
            $sprint = $this->findExistingSprint();
            if (!$sprint) {
                Log::warning("⚠️ [SPRINT-REMAINING] Sprint introuvable", [
                    'user_id' => $this->user->id,
                    'project_id' => $this->project->id,
                    'week' => $this->weekInfo['week_formatted']
                ]);
                return;
            }

            // ✅ Vérifier les jours qui ont besoin de tâches
            $daysThatNeedTasks = $this->identifyDaysNeedingTasks($sprint, $now);

            if (empty($daysThatNeedTasks)) {
                Log::info("ℹ️ [SPRINT-REMAINING] Tous les jours ont déjà des tâches", [
                    'sprint_id' => $sprint->id,
                    'current_day' => $currentDay,
                    'scope' => $daysScope
                ]);
                return;
            }

            Log::info("🎯 [SPRINT-REMAINING] Génération pour jours manquants", [
                'sprint_id' => $sprint->id,
                'days_needing_tasks' => $daysThatNeedTasks,
                'days_count' => count($daysThatNeedTasks),
                'include_current_day' => $this->includeCurrentDay
            ]);

            // ✅ Générer les tâches pour les jours manquants
            $futureDaysResult = $this->includeCurrentDay
                ? $this->generateAllDays($now)
                : $this->generateFutureDaysOnly($now);
            
            if (!$futureDaysResult['success']) {
                throw new \Exception('Échec génération jours futurs: ' . ($futureDaysResult['error'] ?? 'Erreur inconnue'));
            }

            // ✅ Créer les tâches pour chaque jour futur
            $totalTasksCreated = 0;
            $futureDaysData = $futureDaysResult['future_days'] ?? [];
            
            foreach ($daysThatNeedTasks as $dayName) {
                if (isset($futureDaysData[$dayName])) {
                    $dayDate = $this->calculateDateForDay($dayName, $now);
                    $tasksForDay = $this->createTasksForDay($sprint, $futureDaysData[$dayName], $dayDate, $dayName);
                    $totalTasksCreated += $tasksForDay;
                    
                    Log::debug("✅ [SPRINT-REMAINING] Tâches créées pour {$dayName}", [
                        'sprint_id' => $sprint->id,
                        'day' => $dayName,
                        'date' => $dayDate->format('Y-m-d'),
                        'tasks_created' => $tasksForDay
                    ]);
                }
            }

            // ✅ Marquer comme terminé
            Cache::put("sprint_completed_{$this->user->id}_{$this->project->id}_{$this->weekInfo['week_formatted']}", [
                'status' => 'fully_completed',
                'sprint_id' => $sprint->id,
                'total_tasks' => $sprint->tasks()->count(),
                'future_tasks_added' => $totalTasksCreated,
                'completed_at' => now()->toISOString()
            ], now()->addDays(7));

            Log::info("✅ [SPRINT-REMAINING] Jours futurs générés avec succès", [
                'user_id' => $this->user->id,
                'sprint_id' => $sprint->id,
                'days_completed' => $daysThatNeedTasks,
                'total_future_tasks_created' => $totalTasksCreated,
                'total_sprint_tasks' => $sprint->tasks()->count()
            ]);

        } catch (\Exception $e) {
            Log::error("💥 [SPRINT-REMAINING] Exception génération jours futurs", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $this->handleError($e);
        }
    }

    /**
     * ✅ Identifier les jours qui ont besoin de tâches
     */
    private function identifyDaysNeedingTasks(Sprint $sprint, Carbon $now): array
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $currentDayIndex = array_search($now->format('l'), $daysOfWeek);

        // ✅ CORRECTION : Inclure jour actuel si demandé
        $startIndex = $this->includeCurrentDay ? $currentDayIndex : $currentDayIndex + 1;
        $futureDays = array_slice($daysOfWeek, $startIndex);

        $daysThatNeedTasks = [];

        foreach ($futureDays as $dayName) {
            $dayDate = $this->calculateDateForDay($dayName, $now);

            // Compter les tâches existantes pour ce jour
            $existingTasksCount = $sprint->tasks()
                ->whereDate('scheduled_date', $dayDate->format('Y-m-d'))
                ->count();

            Log::info("🔍 [SPRINT-REMAINING-DEBUG] Vérification jour", [
                'day' => $dayName,
                'date' => $dayDate->format('Y-m-d'),
                'existing_tasks' => $existingTasksCount,
                'needs_tasks' => $existingTasksCount < 6
            ]);

            // Si moins de 6 tâches, ajouter à la liste
            if ($existingTasksCount < 6) {
                $daysThatNeedTasks[] = $dayName;

                Log::info("📝 [SPRINT-REMAINING] Jour nécessite des tâches (besoin de 6)", [
                    'day' => $dayName,
                    'date' => $dayDate->format('Y-m-d'),
                    'existing_tasks' => $existingTasksCount,
                    'target_tasks' => 6
                ]);
            }
        }
        
        return $daysThatNeedTasks;
    }

    /**
     * ✅ Calculer la date pour un jour de la semaine
     */
    private function calculateDateForDay(string $dayName, Carbon $now): Carbon
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $dayIndex = array_search($dayName, $daysOfWeek);
        
        return $now->copy()->startOfWeek()->addDays($dayIndex);
    }

    /**
     * ✅ Générer les tâches des jours futurs uniquement
     */
    private function generateFutureDaysOnly(Carbon $currentDate): array
    {
        try {
            // ✅ CORRECTION : Passer l'ID utilisateur au service pour la détection de langue
            $sprintService = new SprintGenerationService($this->user->id);
            return $sprintService->generateRemainingDaysTasks($this->project->id, $currentDate);
        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-REMAINING] Erreur génération jours futurs", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération jours futurs: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Générer TOUS les jours (lundi-dimanche) pour régénération automatique
     */
    private function generateAllDays(Carbon $currentDate): array
    {
        try {
            // Obtenir le lundi de la semaine courante
            $monday = $currentDate->copy()->startOfWeek();

            Log::info("🔄 [SPRINT-ALL-DAYS] Génération progressive complète (lundi-dimanche)", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'start_date' => $monday->format('Y-m-d')
            ]);

            // ✅ CORRECTION : Passer l'ID utilisateur au service pour la détection de langue
            $sprintService = new SprintGenerationService($this->user->id);

            // ✅ CORRECTION : Inclure le jour actuel (lundi) lors de la régénération automatique
            // C'est crucial pour que le lundi soit généré lors de la régénération hebdomadaire
            return $sprintService->generateRemainingDaysTasks($this->project->id, $monday, true);

        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-ALL-DAYS] Erreur génération tous les jours", [
                'user_id' => $this->user->id,
                'project_id' => $this->project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur génération tous les jours: ' . $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Créer les tâches pour un jour spécifique
     */
    private function createTasksForDay(Sprint $sprint, array $tasksData, Carbon $dayDate, string $dayName): int
    {
        $tasksCreated = 0;
        
        if (!is_array($tasksData)) {
            Log::warning("⚠️ [SPRINT-REMAINING] Données de tâches invalides", [
                'sprint_id' => $sprint->id,
                'day' => $dayName,
                'tasks_data' => $tasksData
            ]);
            return 0;
        }

        foreach ($tasksData as $index => $taskData) {
            try {
                $task = Task::create([
                    'user_id' => $this->user->id,
                    'sprint_id' => $sprint->id,
                    'title' => $taskData['title'] ?? "Tâche {$dayName}",
                    'description' => $taskData['description'] ?? "Description à définir",
                    'type' => $taskData['type'] ?? 'action',
                    'priority' => $this->mapPriorityToEnglish($taskData['priority'] ?? 'normal'),
                    'status' => 'pending',
                    'scheduled_date' => $dayDate,
                    'order' => $index
                ]);

                $tasksCreated++;

            } catch (\Exception $e) {
                Log::error("❌ [SPRINT-REMAINING] Erreur création tâche", [
                    'sprint_id' => $sprint->id,
                    'day' => $dayName,
                    'task_data' => $taskData,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $tasksCreated;
    }

    /**
     * ✅ Trouver le sprint existant
     * ✅ CORRECTION : Chercher aussi les sprints sans project_id
     */
    private function findExistingSprint(): ?Sprint
    {
        // D'abord chercher avec project_id
        $sprint = Sprint::where('user_id', $this->user->id)
            ->where('project_id', $this->project->id)
            ->where('week_number', $this->weekInfo['week_number'])
            ->where('year', $this->weekInfo['year'])
            ->first();

        // Si pas trouvé, chercher un sprint sans project_id (anciens sprints)
        if (!$sprint) {
            $sprint = Sprint::where('user_id', $this->user->id)
                ->whereNull('project_id')
                ->where('week_number', $this->weekInfo['week_number'])
                ->where('year', $this->weekInfo['year'])
                ->first();

            // Si trouvé, associer le project_id
            if ($sprint) {
                $sprint->update(['project_id' => $this->project->id]);
                Log::info('🔧 [SPRINT-REMAINING] Sprint associé au projet', [
                    'sprint_id' => $sprint->id,
                    'project_id' => $this->project->id
                ]);
            }
        }

        return $sprint;
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
     * ✅ Vérifier l'accès utilisateur
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
            Log::error("❌ [SPRINT-REMAINING] Erreur vérification accès", [
                'user_id' => $this->user->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * ✅ Gestion des erreurs
     */
    private function handleError(\Throwable $exception): void
    {
        // Marquer l'échec des jours futurs
        Cache::put("sprint_remaining_failed_{$this->user->id}_{$this->project->id}_{$this->weekInfo['week_formatted']}", [
            'status' => 'future_days_failed',
            'error' => $exception->getMessage(),
            'failed_at' => now()->toISOString()
        ], now()->addHours(24));
    }

    /**
     * ✅ Gestion des échecs définitifs
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("💀 [SPRINT-REMAINING] Job jours futurs échoué définitivement", [
            'user_id' => $this->user->id,
            'project_id' => $this->project->id,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);

        $this->handleError($exception);
    }
}