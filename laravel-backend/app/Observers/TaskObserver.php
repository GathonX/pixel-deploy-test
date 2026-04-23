<?php

namespace App\Observers;

use App\Models\Task;
use App\Services\PostGeneration\Core\SmartPostGenerationService;
use Illuminate\Support\Facades\Log;

/**
 * 🔍 OBSERVATEUR TASK : Déclenchement génération automatique
 */
class TaskObserver
{
    private const LOG_PREFIX = "🔍 [TaskObserver]";

    /**
     * ✅ APRÈS CRÉATION D'UNE TÂCHE
     */
    public function created(Task $task): void
    {
        Log::info(self::LOG_PREFIX . " Nouvelle tâche créée", [
            'task_id' => $task->id,
            'user_id' => $task->user_id,
            'title' => $task->title,
        ]);

        // Déclencher la génération intelligente
        $this->triggerSmartGeneration($task);
    }

    /**
     * 🚀 DÉCLENCHEMENT INTELLIGENT - CORRIGÉ
     */
    private function triggerSmartGeneration(Task $task): void
    {
        try {
            // ✅ CORRECTION : Récupérer l'utilisateur correctement
            $user = $task->user()->first(); // ou $task->user
            if (!$user) {
                Log::warning(self::LOG_PREFIX . " Utilisateur introuvable pour la tâche", [
                    'task_id' => $task->id,
                    'user_id' => $task->user_id,
                ]);
                return;
            }

            // Lancer le service intelligent
            $smartGeneration = app(SmartPostGenerationService::class);
            $triggered = $smartGeneration->triggerGenerationIfNeeded($user, 'task_created');

            Log::info(self::LOG_PREFIX . " Génération intelligente déclenchée", [
                'task_id' => $task->id,
                'user_id' => $user->id,
                'generation_triggered' => $triggered,
                'context' => 'task_created',
            ]);

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur lors du déclenchement génération", [
                'task_id' => $task->id,
                'user_id' => $task->user_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
