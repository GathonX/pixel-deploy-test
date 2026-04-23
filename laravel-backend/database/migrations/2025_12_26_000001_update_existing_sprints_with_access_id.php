<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Cette migration corrige les sprints existants qui n'ont pas de user_feature_access_id
     * en leur assignant l'access_id actif de l'utilisateur pour la fonctionnalité sprint_planning
     */
    public function up(): void
    {
        Log::info('🔧 [MIGRATION] Début de la correction des sprints existants');

        // Récupérer tous les sprints sans user_feature_access_id
        $sprintsToUpdate = DB::table('sprints')
            ->whereNull('user_feature_access_id')
            ->get();

        Log::info('📊 [MIGRATION] Sprints à corriger', [
            'count' => $sprintsToUpdate->count()
        ]);

        $updatedCount = 0;
        $skippedCount = 0;

        foreach ($sprintsToUpdate as $sprint) {
            // Trouver l'access actif pour cet utilisateur
            $activeAccess = DB::table('user_feature_access')
                ->join('features', 'user_feature_access.feature_id', '=', 'features.id')
                ->where('features.key', 'sprint_planning')
                ->where('user_feature_access.user_id', $sprint->user_id)
                ->where('user_feature_access.admin_enabled', true)
                ->where('user_feature_access.user_activated', true)
                ->where(function($query) {
                    $query->whereNull('user_feature_access.expires_at')
                          ->orWhere('user_feature_access.expires_at', '>', now());
                })
                ->orderBy('user_feature_access.expires_at', 'desc')
                ->select('user_feature_access.id')
                ->first();

            if ($activeAccess) {
                // Mettre à jour le sprint avec l'access_id
                DB::table('sprints')
                    ->where('id', $sprint->id)
                    ->update(['user_feature_access_id' => $activeAccess->id]);

                $updatedCount++;

                Log::info('✅ [MIGRATION] Sprint mis à jour', [
                    'sprint_id' => $sprint->id,
                    'user_id' => $sprint->user_id,
                    'access_id' => $activeAccess->id
                ]);
            } else {
                $skippedCount++;

                Log::warning('⚠️ [MIGRATION] Sprint ignoré (pas d\'accès actif)', [
                    'sprint_id' => $sprint->id,
                    'user_id' => $sprint->user_id
                ]);
            }
        }

        Log::info('🎉 [MIGRATION] Correction des sprints terminée', [
            'total' => $sprintsToUpdate->count(),
            'updated' => $updatedCount,
            'skipped' => $skippedCount
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // On ne peut pas vraiment "annuler" cette migration car on ne sait pas
        // quels sprints avaient déjà un user_feature_access_id avant
        Log::info('⏮️ [MIGRATION] Rollback de la correction des sprints (aucune action)');
    }
};
