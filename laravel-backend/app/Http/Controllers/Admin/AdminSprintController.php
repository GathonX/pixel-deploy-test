<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Sprint;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AdminSprintController extends Controller
{
    /**
     * DELETE /api/admin/sprints/{id} - Supprimer un sprint
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $admin = Auth::user();
            $sprint = Sprint::find($id);

            if (!$sprint) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sprint non trouvé'
                ], 404);
            }

            $title = $sprint->title;
            $userId = $sprint->user_id;

            // Supprimer les tâches associées (si cascade non configuré)
            $sprint->tasks()->delete();

            // Supprimer le sprint
            $sprint->delete();

            Log::info("[AdminSprintController::destroy] Sprint supprimé par admin", [
                'admin_id' => $admin->id,
                'sprint_id' => $id,
                'title' => $title,
                'user_id' => $userId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sprint supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminSprintController::destroy] Erreur", [
                'error' => $e->getMessage(),
                'sprint_id' => $id,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du sprint'
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/sprints/{sprintId}/tasks/day/{date} - Supprimer les tâches d'un jour spécifique
     */
    public function destroyDayTasks(int $sprintId, string $date): JsonResponse
    {
        try {
            $admin = Auth::user();
            $sprint = Sprint::find($sprintId);

            if (!$sprint) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sprint non trouvé'
                ], 404);
            }

            // Supprimer les tâches de ce jour spécifique
            $deletedCount = Task::where('sprint_id', $sprintId)
                ->whereDate('scheduled_date', $date)
                ->delete();

            Log::info("[AdminSprintController::destroyDayTasks] Tâches d'un jour supprimées", [
                'admin_id' => $admin->id,
                'sprint_id' => $sprintId,
                'date' => $date,
                'tasks_deleted' => $deletedCount,
                'user_id' => $sprint->user_id
            ]);

            return response()->json([
                'success' => true,
                'message' => "{$deletedCount} tâche(s) supprimée(s) pour le {$date}",
                'data' => [
                    'deleted_count' => $deletedCount,
                    'date' => $date,
                    'sprint_id' => $sprintId
                ]
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminSprintController::destroyDayTasks] Erreur", [
                'error' => $e->getMessage(),
                'sprint_id' => $sprintId,
                'date' => $date,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression des tâches du jour'
            ], 500);
        }
    }
}
