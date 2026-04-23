<?php

namespace App\Observers;

use App\Models\Project;
use App\Services\PostGeneration\Core\SmartPostGenerationService;
use Illuminate\Support\Facades\Log;

/**
 * 🔍 OBSERVATEUR PROJECT : Déclenchement génération automatique
 */
class ProjectObserver
{
    private const LOG_PREFIX = "🔍 [ProjectObserver]";

    /**
     * ✅ APRÈS CRÉATION D'UN PROJET
     */
    public function created(Project $project): void
    {
        Log::info(self::LOG_PREFIX . " Nouveau projet créé", [
            'project_id' => $project->id,
            'user_id' => $project->user_id,
            'name' => $project->name,
        ]);

        // Déclencher la génération intelligente
        $this->triggerSmartGeneration($project);
    }

    /**
     * 🚀 DÉCLENCHEMENT INTELLIGENT - CORRIGÉ
     */
    private function triggerSmartGeneration(Project $project): void
    {
        try {
            // ✅ CORRECTION : Récupérer l'utilisateur correctement
            $user = $project->user()->first(); // ou $project->user
            if (!$user) {
                Log::warning(self::LOG_PREFIX . " Utilisateur introuvable pour le projet", [
                    'project_id' => $project->id,
                    'user_id' => $project->user_id,
                ]);
                return;
            }

            // Lancer le service intelligent
            $smartGeneration = app(SmartPostGenerationService::class);
            $triggered = $smartGeneration->triggerGenerationIfNeeded($user, 'project_created');

            Log::info(self::LOG_PREFIX . " Génération intelligente déclenchée", [
                'project_id' => $project->id,
                'user_id' => $user->id,
                'generation_triggered' => $triggered,
                'context' => 'project_created',
            ]);

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur lors du déclenchement génération", [
                'project_id' => $project->id,
                'user_id' => $project->user_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}