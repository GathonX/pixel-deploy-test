<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\Project;
use App\Models\UserFeatureAccess;
use App\Services\OpenAI\SprintGenerationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Exception;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;

class SprintController extends Controller
{
    // ✅ CORRECTION : Ne plus injecter le service dans le constructeur
    // On l'instanciera à la volée avec l'ID utilisateur quand nécessaire

    public function __construct()
    {
        // Le constructeur est maintenant vide
    }

    /**
     * ✅ NOUVEAU : Get the latest/most recent sprint for expired features
     * Permet aux utilisateurs avec fonctionnalité expirée de voir leurs anciens sprints
     * ✅ AMÉLIORATION : Retourne le dernier sprint AVEC des tâches (pas un sprint vide)
     *
     * @return JsonResponse
     */
    public function getLatestSprint(): JsonResponse
    {
        try {
            $userId = Auth::id();

            Log::info('🔍 [LATEST-SPRINT] Recherche du dernier sprint avec tâches', [
                'user_id' => $userId
            ]);

            // Chercher le sprint le plus récent de l'utilisateur QUI A DES TÂCHES
            $sprint = Sprint::where('user_id', $userId)
                ->whereHas('tasks') // ✅ Seulement les sprints avec des tâches
                ->with([
                    'tasks' => function ($query) {
                        $query->orderBy('scheduled_date')
                            ->orderBy('order');
                    }
                ])
                ->orderBy('year', 'desc')
                ->orderBy('week_number', 'desc')
                ->first();

            if (!$sprint) {
                Log::info('📭 [LATEST-SPRINT] Aucun sprint trouvé', [
                    'user_id' => $userId
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'No sprint found',
                    'message' => 'Aucun sprint historique trouvé'
                ], 404);
            }

            Log::info('✅ [LATEST-SPRINT] Sprint trouvé', [
                'user_id' => $userId,
                'sprint_id' => $sprint->id,
                'week_number' => $sprint->week_number,
                'year' => $sprint->year,
                'tasks_count' => $sprint->tasks->count()
            ]);

            return response()->json([
                'success' => true,
                'sprint' => $sprint,
                'is_historical' => true,
                'message' => 'Sprint historique récupéré'
            ]);

        } catch (Exception $e) {
            Log::error('❌ [LATEST-SPRINT] Erreur', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch latest sprint',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current active sprint for the authenticated user
     *
     * @return JsonResponse
     */
    public function getCurrentSprint(): JsonResponse
    {
        try {
            $userId = Auth::id();

            // ✅ NOUVEAU : Récupérer l'access_id actif pour sprint_planning
            $sprintAccessId = $this->getActiveAccessId(Auth::user(), 'sprint_planning');

            // Get the current week number and year
            $now = Carbon::now();
            $weekNumber = $now->weekOfYear;
            $year = $now->year;

            // Find active sprint for current week
            $sprintQuery = Sprint::where('user_id', $userId)
                ->where('week_number', $weekNumber)
                ->where('year', $year);

            // ✅ FALLBACK : Si pas d'access actif, prendre le sprint le plus récent
            if ($sprintAccessId) {
                $sprintQuery->where('user_feature_access_id', $sprintAccessId);
            } else {
                Log::warning('No active sprint access found, using fallback', [
                    'user_id' => $userId,
                    'week_number' => $weekNumber,
                    'year' => $year
                ]);
            }

            $sprint = $sprintQuery->with([
                    'tasks' => function ($query) {
                        $query->orderBy('scheduled_date')
                            ->orderBy('order');
                    }
                ])
                ->first();

            // ✅ FALLBACK ÉTENDU : Si aucun sprint trouvé, chercher sans restriction d'access
            if (!$sprint && $sprintAccessId) {
                Log::info('Trying fallback sprint search without access restriction', [
                    'user_id' => $userId
                ]);
                
                $sprint = Sprint::where('user_id', $userId)
                    ->where('week_number', $weekNumber)
                    ->where('year', $year)
                    ->with([
                        'tasks' => function ($query) {
                            $query->orderBy('scheduled_date')
                                ->orderBy('order');
                        }
                    ])
                    ->first();
            }

            // ✅ NOUVEAU : Si sprint trouvé mais VIDE (0 tâches), utiliser le dernier sprint avec tâches
            if ($sprint && $sprint->tasks->count() === 0) {
                Log::info('Sprint found but empty, searching for latest sprint with tasks', [
                    'user_id' => $userId,
                    'empty_sprint_id' => $sprint->id
                ]);

                $latestSprintWithTasks = Sprint::where('user_id', $userId)
                    ->whereHas('tasks')
                    ->with([
                        'tasks' => function ($query) {
                            $query->orderBy('scheduled_date')
                                ->orderBy('order');
                        }
                    ])
                    ->orderBy('year', 'desc')
                    ->orderBy('week_number', 'desc')
                    ->first();

                if ($latestSprintWithTasks) {
                    Log::info('Using latest sprint with tasks instead of empty current sprint', [
                        'user_id' => $userId,
                        'sprint_id' => $latestSprintWithTasks->id,
                        'week' => $latestSprintWithTasks->week_number,
                        'year' => $latestSprintWithTasks->year,
                        'tasks_count' => $latestSprintWithTasks->tasks->count()
                    ]);

                    return response()->json([
                        'success' => true,
                        'sprint' => $latestSprintWithTasks,
                        'is_historical' => true,
                        'message' => 'Sprint historique (le sprint actuel est vide)'
                    ]);
                }
            }

            if (!$sprint) {
                Log::info('No sprint found, creating actual sprint in database', [
                    'user_id' => $userId,
                    'week_number' => $weekNumber,
                    'year' => $year
                ]);

                // ✅ CRÉER UN VRAI SPRINT EN BASE DE DONNÉES
                try {
                    $sprint = Sprint::create([
                        'user_id' => $userId,
                        'week_number' => $weekNumber,
                        'year' => $year,
                        'start_date' => $now->copy()->startOfWeek(),
                        'end_date' => $now->copy()->endOfWeek(),
                        'title' => "Sprint Semaine {$weekNumber} - {$year}",
                        'description' => 'Sprint créé automatiquement',
                        'status' => 'active'
                    ]);

                    // Créer quelques tâches par défaut
                    $this->createDefaultTasks($sprint);

                    // Recharger avec les tâches
                    $sprint = $sprint->load('tasks');

                    Log::info('Sprint created successfully', [
                        'sprint_id' => $sprint->id,
                        'user_id' => $userId
                    ]);

                    return response()->json([
                        'success' => true,
                        'sprint' => $sprint,
                        'auto_created' => true,
                        'message' => 'Sprint créé automatiquement pour cette semaine'
                    ]);

                } catch (\Exception $e) {
                    Log::error('Failed to create sprint', [
                        'user_id' => $userId,
                        'error' => $e->getMessage()
                    ]);

                    return response()->json([
                        'success' => true,
                        'sprint' => $this->getDefaultSprintData($userId, $weekNumber, $year),
                        'fallback' => true,
                        'message' => 'Données de sprint par défaut (erreur création BDD)'
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'sprint' => $sprint
            ]);
        } catch (Exception $e) {
            Log::error('Error getting current sprint: ' . $e->getMessage());

            // Retourner un sprint par défaut au lieu d'une erreur 500
            return response()->json([
                'success' => true,
                'sprint' => $this->getDefaultSprintData($userId ?? null, 
                    Carbon::now()->weekOfYear, 
                    Carbon::now()->year),
                'fallback' => true,
                'error_handled' => true,
                'message' => 'Données de sprint par défaut chargées'
            ], 200);
        }
    }

    /**
     * Generate a new sprint for the current week
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function generateSprint(Request $request): JsonResponse
    {
        Log::info('🚀 Sprint generation started', ['user_id' => Auth::id()]);

        $validator = Validator::make($request->all(), [
            'project_id' => 'required|exists:projects,id',
        ]);

        if ($validator->fails()) {
            Log::error('❌ Sprint generation validation failed', ['errors' => $validator->errors()]);
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $userId = Auth::id();
            $projectId = $request->input('project_id');

            Log::info('📋 Sprint generation validation passed', [
                'user_id' => $userId,
                'project_id' => $projectId
            ]);

            // Verify project ownership
            $project = Project::where('id', $projectId)
                ->where('user_id', $userId)
                ->first();

            if (!$project) {
                Log::error('❌ Project not found or access denied', [
                    'user_id' => $userId,
                    'project_id' => $projectId
                ]);
                return response()->json([
                    'success' => false,
                    'error' => 'Project not found or does not belong to user'
                ], 404);
            }

            Log::info('✅ Project ownership verified', [
                'project_name' => $project->name,
                'project_id' => $projectId
            ]);

            // Get current week info
            $now = Carbon::now();
            $weekNumber = $now->weekOfYear;
            $year = $now->year;

            // Calculate start and end dates for the week (Monday to Sunday)
            $startDate = $now->startOfWeek();
            $endDate = $now->copy()->endOfWeek();

            // Check if a sprint already exists for this week
            $existingSprint = Sprint::where('user_id', $userId)
                ->where('week_number', $weekNumber)
                ->where('year', $year)
                ->first();

            if ($existingSprint) {
                return response()->json([
                    'success' => false,
                    'error' => 'A sprint already exists for this week',
                    'sprint_id' => $existingSprint->id
                ], 409); // Conflict
            }

            // ✅ ÉTAPE 1: Analyse des données business
            Log::info('🧠 [SPRINT] Étape 1/4: Analyse des données business', [
                'user_id' => $userId,
                'project_id' => $projectId,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d')
            ]);

            // ✅ ÉTAPE 2: Génération IA des tâches
            Log::info('⚡ [SPRINT] Étape 2/4: Génération IA des tâches hebdomadaires', [
                'user_id' => $userId,
                'project_id' => $projectId
            ]);

            try {
                // ✅ CORRECTION : Instancier le service avec l'ID utilisateur
                $sprintService = new SprintGenerationService($userId);
                $result = $sprintService->generateWeeklySprint($projectId, $startDate, $endDate);

                Log::info('✅ [SPRINT] Génération IA terminée avec succès', [
                    'user_id' => $userId,
                    'success' => $result['success'],
                    'has_sprint_data' => isset($result['sprint'])
                ]);
            } catch (Exception $openaiException) {
                Log::error('❌ OpenAI Sprint Generation failed', [
                    'error' => $openaiException->getMessage(),
                    'trace' => $openaiException->getTraceAsString()
                ]);

                return response()->json([
                    'success' => false,
                    'error' => 'Sprint generation failed: ' . $openaiException->getMessage()
                ], 500);
            }

            if (!$result['success']) {
                Log::error('❌ Sprint generation result unsuccessful', $result);
                return response()->json($result, 500);
            }

            // ✅ ÉTAPE 3: Création et organisation des tâches
            Log::info('📅 [SPRINT] Étape 3/4: Création et organisation des tâches', [
                'user_id' => $userId,
                'project_id' => $projectId
            ]);

            // Create the sprint in database
            $sprintData = $result['sprint'];

            // ✅ CORRECTION CRITIQUE : Récupérer l'access_id actif pour sprint_planning
            $sprintAccessId = $this->getActiveAccessId(Auth::user(), 'sprint_planning');

            Log::info('🔑 [SPRINT] Access ID récupéré pour sprint_planning', [
                'user_id' => $userId,
                'sprint_access_id' => $sprintAccessId,
                'has_access' => $sprintAccessId !== null
            ]);

            $sprint = Sprint::create([
                'user_id' => $userId,
                'project_id' => $projectId,
                'user_feature_access_id' => $sprintAccessId, // ✅ NOUVEAU : Lier au purchase actif
                'week_number' => $weekNumber,
                'year' => $year,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'title' => $sprintData['title'] ?? "Sprint Week {$weekNumber}",
                'description' => $sprintData['description'] ?? null,
                'status' => 'active'
            ]);

            Log::info('✅ [SPRINT] Sprint créé en base de données', [
                'user_id' => $userId,
                'sprint_id' => $sprint->id,
                'title' => $sprint->title
            ]);

            // Create tasks for each day
            $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            $tasksCreated = 0;

            foreach ($daysOfWeek as $dayIndex => $dayName) {
                $dayTasks = $sprintData['days'][$dayName] ?? [];

                if (empty($dayTasks)) {
                    continue;
                }

                $scheduledDate = $startDate->copy()->addDays($dayIndex);

                foreach ($dayTasks as $index => $taskData) {
                    Task::create([
                        'user_id' => $userId,
                        'sprint_id' => $sprint->id,
                        'title' => $taskData['title'],
                        'description' => $taskData['description'],
                        'type' => $taskData['type'] ?? 'action',
                        'priority' => $taskData['priority'] ?? 'normal',
                        'status' => 'pending',
                        'scheduled_date' => $scheduledDate,
                        'order' => $index
                    ]);

                    $tasksCreated++;
                }
            }

            // ✅ ÉTAPE 4: Finalisation du sprint
            Log::info('🎯 [SPRINT] Étape 4/4: Finalisation du sprint', [
                'user_id' => $userId,
                'sprint_id' => $sprint->id,
                'tasks_created' => $tasksCreated
            ]);

            Log::info('🎉 [SPRINT] Sprint généré avec succès !', [
                'user_id' => $userId,
                'sprint_id' => $sprint->id,
                'total_tasks' => $tasksCreated,
                'sprint_title' => $sprint->title,
                'week_period' => $startDate->format('Y-m-d') . ' to ' . $endDate->format('Y-m-d')
            ]);

            return response()->json([
                'success' => true,
                'message' => "Sprint created successfully with {$tasksCreated} tasks",
                'sprint' => $sprint->load('tasks')
            ], 201);
        } catch (Exception $e) {
            Log::error('Error generating sprint: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate sprint',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate additional tasks for a specific day
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function generateDailyTasks(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'sprint_id' => 'required|exists:sprints,id',
            'day_of_week' => 'required|string|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday',
            'count' => 'nullable|integer|min:1|max:10',
            'custom_task' => 'nullable|array',
            'custom_task.title' => 'required_with:custom_task',
            'custom_task.description' => 'required_with:custom_task',
            'custom_task.type' => 'nullable|string|in:mission,vision,objective,action',
            'custom_task.priority' => 'nullable|string|in:high,medium,low,normal',
            'custom_task.status' => 'nullable|string|in:pending,in-progress,completed'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $userId = Auth::id();
            $sprintId = $request->input('sprint_id');
            $dayOfWeek = $request->input('day_of_week');
            $count = $request->input('count', 6);
            $customTask = $request->input('custom_task');

            // Verify sprint ownership
            $sprint = Sprint::where('id', $sprintId)
                ->where('user_id', $userId)
                ->first();

            if (!$sprint) {
                return response()->json([
                    'success' => false,
                    'error' => 'Sprint not found or does not belong to user'
                ], 404);
            }

            // Get the day index (0 = Monday, 6 = Sunday)
            $dayIndex = array_search($dayOfWeek, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
            $scheduledDate = $sprint->start_date->copy()->addDays($dayIndex);

            $tasks = [];

            // If a custom task is provided, create just that task
            if ($customTask) {
                $task = Task::create([
                    'user_id' => $userId,
                    'sprint_id' => $sprint->id,
                    'title' => $customTask['title'],
                    'description' => $customTask['description'],
                    'type' => $customTask['type'] ?? 'action',
                    'priority' => $customTask['priority'] ?? 'normal',
                    'status' => $customTask['status'] ?? 'pending',
                    'scheduled_date' => $scheduledDate,
                    'order' => Task::where('sprint_id', $sprintId)
                        ->whereDate('scheduled_date', $scheduledDate)
                        ->max('order') + 1 ?? 0
                ]);

                $tasks[] = $task;

                return response()->json([
                    'success' => true,
                    'message' => 'Task created successfully',
                    'tasks' => $tasks
                ], 201);
            }

            // ✅ CORRECTION : Vérifier combien de tâches existent déjà pour ce jour
            $existingTasksCount = Task::where('sprint_id', $sprintId)
                ->where('user_id', $userId)
                ->whereDate('scheduled_date', $scheduledDate)
                ->count();

            // ✅ RÈGLE : Maximum 6 tâches par jour
            $maxTasksPerDay = 6;

            if ($existingTasksCount >= $maxTasksPerDay) {
                return response()->json([
                    'success' => false,
                    'error' => 'Maximum tasks limit reached',
                    'message' => "Ce jour a déjà {$existingTasksCount} tâches. Maximum autorisé: {$maxTasksPerDay} tâches/jour.",
                    'existing_count' => $existingTasksCount,
                    'max_allowed' => $maxTasksPerDay
                ], 400);
            }

            // ✅ CORRECTION : Calculer combien de nouvelles tâches on peut créer
            $remainingSlots = $maxTasksPerDay - $existingTasksCount;
            $tasksToGenerate = min($count, $remainingSlots);

            Log::info('Generating daily tasks with limit', [
                'day_of_week' => $dayOfWeek,
                'existing_tasks' => $existingTasksCount,
                'requested_count' => $count,
                'will_generate' => $tasksToGenerate,
                'remaining_slots' => $remainingSlots
            ]);

            // Otherwise, generate tasks using AI
            // ✅ CORRECTION : Instancier le service avec l'ID utilisateur
            $sprintService = new SprintGenerationService($userId);
            $result = $sprintService->generateDailyTasks($sprintId, $dayOfWeek, $tasksToGenerate);

            if (!$result['success']) {
                return response()->json($result, 500);
            }

            // Get the highest current order for this day
            $maxOrder = Task::where('sprint_id', $sprintId)
                ->whereDate('scheduled_date', $scheduledDate)
                ->max('order') ?? 0;

            // Create the new tasks
            $newTasks = $result['tasks'];

            foreach ($newTasks as $index => $taskData) {
                $task = Task::create([
                    'user_id' => $userId,
                    'sprint_id' => $sprint->id,
                    'title' => $taskData['title'],
                    'description' => $taskData['description'],
                    'type' => $taskData['type'] ?? 'action',
                    'priority' => $taskData['priority'] ?? 'normal',
                    'status' => 'pending',
                    'scheduled_date' => $scheduledDate,
                    'order' => $maxOrder + $index + 1
                ]);

                $tasks[] = $task;
            }

            return response()->json([
                'success' => true,
                'message' => count($tasks) . ' tasks created for ' . $dayOfWeek . ' (' . $existingTasksCount . ' existed, ' . count($tasks) . ' added, total: ' . ($existingTasksCount + count($tasks)) . '/6)',
                'tasks' => $tasks,
                'existing_count' => $existingTasksCount,
                'total_count' => $existingTasksCount + count($tasks),
                'max_allowed' => $maxTasksPerDay
            ], 201);
        } catch (Exception $e) {
            Log::error('Error generating daily tasks: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to generate daily tasks',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update task status
     * 
     * @param Request $request
     * @param int $id Task ID
     * @return JsonResponse
     */
    public function updateTaskStatus(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:pending,in-progress,completed'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $userId = Auth::id();
            $status = $request->input('status');

            // Find the task and verify ownership
            $task = Task::with('sprint')
                ->findOrFail($id);

            if ($task->sprint->user_id !== $userId) {
                return response()->json([
                    'success' => false,
                    'error' => 'Task does not belong to user'
                ], 403);
            }

            // Update the status
            $task->status = $status;

            if ($status === 'completed') {
                $task->completed_at = now();
            } elseif ($status === 'pending') {
                $task->completed_at = null;
            }

            $task->save();

            return response()->json([
                'success' => true,
                'message' => 'Task status updated',
                'task' => $task
            ]);
        } catch (Exception $e) {
            Log::error('Error updating task status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to update task status',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reorder tasks
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function reorderTasks(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:tasks,id',
            'tasks.*.order' => 'required|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $userId = Auth::id();
            $taskUpdates = $request->input('tasks');

            // Verify all tasks belong to the user
            $taskIds = collect($taskUpdates)->pluck('id')->toArray();
            $tasks = Task::whereIn('id', $taskIds)
                ->with('sprint')
                ->get();

            foreach ($tasks as $task) {
                if ($task->sprint->user_id !== $userId) {
                    return response()->json([
                        'success' => false,
                        'error' => 'One or more tasks do not belong to user'
                    ], 403);
                }
            }

            // Update the order of each task
            foreach ($taskUpdates as $update) {
                Task::where('id', $update['id'])->update(['order' => $update['order']]);
            }

            return response()->json([
                'success' => true,
                'message' => count($taskUpdates) . ' tasks reordered'
            ]);
        } catch (Exception $e) {
            Log::error('Error reordering tasks: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to reorder tasks',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Corriger les sprints existants sans user_feature_access_id
     * 
     * @return JsonResponse
     */
    public function fixExistingSprintsAccessIds(): JsonResponse
    {
        try {
            $userId = Auth::id();

            Log::info('🔧 [SPRINT] Début correction sprints pour utilisateur', [
                'user_id' => $userId
            ]);

            // Récupérer tous les sprints de l'utilisateur sans user_feature_access_id
            $sprintsToUpdate = Sprint::where('user_id', $userId)
                ->whereNull('user_feature_access_id')
                ->get();

            if ($sprintsToUpdate->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun sprint à corriger',
                    'updated' => 0
                ]);
            }

            // Récupérer l'access actif pour sprint_planning
            $sprintAccessId = $this->getActiveAccessId(Auth::user(), 'sprint_planning');

            if (!$sprintAccessId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun accès actif à la fonctionnalité Sprint Planning'
                ], 403);
            }

            $updatedCount = 0;

            foreach ($sprintsToUpdate as $sprint) {
                $sprint->update(['user_feature_access_id' => $sprintAccessId]);
                $updatedCount++;

                Log::info('✅ [SPRINT] Sprint corrigé', [
                    'sprint_id' => $sprint->id,
                    'user_id' => $userId,
                    'access_id' => $sprintAccessId
                ]);
            }

            Log::info('🎉 [SPRINT] Correction terminée', [
                'user_id' => $userId,
                'updated' => $updatedCount
            ]);

            return response()->json([
                'success' => true,
                'message' => "{$updatedCount} sprint(s) corrigé(s) avec succès",
                'updated' => $updatedCount
            ]);

        } catch (Exception $e) {
            Log::error('Error fixing sprint access IDs: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to fix sprint access IDs',
                'details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Obtenir l'access_id actif pour une fonctionnalité
     */
    private function getActiveAccessId($user, string $featureKey): ?int
    {
        // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW), le plus récent
        $access = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                $query->where('key', $featureKey);
            })
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where(function($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->orderBy('admin_enabled_at', 'desc') // ✅ CORRECTION : Trier par date d'achat
            ->first();

        if ($access && $access->isActive()) {
            return $access->id;
        }

        return null;
    }

    /**
     * ✅ Générer des données de sprint par défaut
     */
    private function getDefaultSprintData(?int $userId, int $weekNumber, int $year): array
    {
        $now = Carbon::now();
        $startDate = $now->copy()->startOfWeek();
        $endDate = $now->copy()->endOfWeek();

        return [
            'id' => null,
            'user_id' => $userId,
            'project_id' => null,
            'week_number' => $weekNumber,
            'year' => $year,
            'start_date' => $startDate->toISOString(),
            'end_date' => $endDate->toISOString(),
            'title' => "Sprint Semaine {$weekNumber} - {$year}",
            'description' => 'Sprint par défaut généré automatiquement',
            'status' => 'draft',
            'fallback_data' => true,
            'tasks' => $this->getDefaultTasks($startDate),
            'created_at' => now()->toISOString(),
            'updated_at' => now()->toISOString(),
        ];
    }

    /**
     * ✅ Générer des tâches par défaut pour la semaine
     */
    private function getDefaultTasks(Carbon $startDate): array
    {
        $tasks = [];
        $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        
        foreach ($daysOfWeek as $dayIndex => $dayName) {
            $scheduledDate = $startDate->copy()->addDays($dayIndex);
            
            $tasks[] = [
                'id' => null,
                'user_id' => null,
                'sprint_id' => null,
                'title' => "Planifier la journée {$dayName}",
                'description' => "Organiser les priorités et objectifs pour {$dayName}",
                'type' => 'planning',
                'priority' => 'medium',
                'status' => 'pending',
                'scheduled_date' => $scheduledDate->toDateString(),
                'order' => 0,
                'fallback_task' => true,
                'created_at' => now()->toISOString(),
                'updated_at' => now()->toISOString(),
            ];

            if ($dayIndex < 3) { // Lundi à Mercredi
                $tasks[] = [
                    'id' => null,
                    'user_id' => null,
                    'sprint_id' => null,
                    'title' => "Travail sur projet principal",
                    'description' => "Avancer sur les tâches prioritaires du projet",
                    'type' => 'action',
                    'priority' => 'high',
                    'status' => 'pending',
                    'scheduled_date' => $scheduledDate->toDateString(),
                    'order' => 1,
                    'fallback_task' => true,
                    'created_at' => now()->toISOString(),
                    'updated_at' => now()->toISOString(),
                ];
            }
        }

        return $tasks;
    }

    /**
     * ✅ Créer des tâches par défaut pour un sprint
     */
    private function createDefaultTasks(Sprint $sprint): void
    {
        $tasks = [];
        $daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        
        foreach ($daysOfWeek as $dayIndex => $dayName) {
            $scheduledDate = $sprint->start_date->copy()->addDays($dayIndex);
            
            // Tâche de planning quotidien
            Task::create([
                'user_id' => $sprint->user_id,
                'sprint_id' => $sprint->id,
                'title' => "Planification {$dayName}",
                'description' => "Organiser les priorités pour {$dayName}",
                'type' => 'planning',
                'priority' => 'medium',
                'status' => 'pending',
                'scheduled_date' => $scheduledDate,
                'order' => 0
            ]);

            // Tâche de travail pour les 3 premiers jours
            if ($dayIndex < 3) {
                Task::create([
                    'user_id' => $sprint->user_id,
                    'sprint_id' => $sprint->id,
                    'title' => "Travail sur projet principal",
                    'description' => "Avancer sur les objectifs prioritaires",
                    'type' => 'action',
                    'priority' => 'high',
                    'status' => 'pending',
                    'scheduled_date' => $scheduledDate,
                    'order' => 1
                ]);
            }
        }

        Log::info('Default tasks created', [
            'sprint_id' => $sprint->id,
            'tasks_created' => $daysOfWeek * 2 - 2
        ]);
    }
}