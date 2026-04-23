<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\AdminProjectInfo;
use App\Services\ContentGeneration\AdminPostGenerationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateAdminWeeklyContent extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:generate-weekly-content {--user-id= : ID de l\'utilisateur admin spécifique (optionnel)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Génération automatique hebdomadaire: nouvel objectif + 7 posts pour tous les admins avec auto-génération activée';

    /**
     * Execute the console command.
     */
    public function handle(AdminPostGenerationService $postService)
    {
        $this->info('🚀 [CRON] Démarrage génération hebdomadaire automatique...');
        Log::info('🚀 [CRON] Génération hebdomadaire automatique démarrée');

        // Récupérer les admins à traiter
        $query = AdminProjectInfo::where('auto_generation_enabled', true)
            ->with('user');

        // Si un user_id spécifique est fourni
        if ($userId = $this->option('user-id')) {
            $query->where('user_id', $userId);
            $this->info("🎯 Mode: Utilisateur spécifique (ID: {$userId})");
        } else {
            $this->info("🌍 Mode: Tous les utilisateurs avec auto-génération activée");
        }

        $adminInfos = $query->get();

        if ($adminInfos->isEmpty()) {
            $this->warn('⚠️  Aucun admin avec auto-génération activée trouvé');
            Log::warning('⚠️  [CRON] Aucun admin à traiter');
            return 0;
        }

        $this->info("📊 {$adminInfos->count()} admin(s) à traiter");
        Log::info("📊 [CRON] {$adminInfos->count()} admin(s) à traiter");

        $successCount = 0;
        $errorCount = 0;

        foreach ($adminInfos as $adminInfo) {
            $admin = $adminInfo->user;

            if (!$admin) {
                $this->error("❌ Utilisateur introuvable pour AdminProjectInfo ID: {$adminInfo->id}");
                continue;
            }

            $this->info("👤 Traitement: {$admin->name} (ID: {$admin->id})");

            try {
                // Générer l'objectif + 7 posts pour toute la semaine
                $result = $postService->generateWeeklyPostsForAdmin($admin, false); // false = générer tous les jours

                if ($result['success']) {
                    $postsCount = $result['data']['posts_count'] ?? 0;
                    $this->info("   ✅ {$postsCount} post(s) générés avec succès");

                    Log::info('✅ [CRON] Génération réussie', [
                        'user_id' => $admin->id,
                        'user_name' => $admin->name,
                        'posts_count' => $postsCount
                    ]);

                    $successCount++;
                } else {
                    $this->error("   ❌ Erreur: " . ($result['error'] ?? 'Erreur inconnue'));

                    Log::error('❌ [CRON] Génération échouée', [
                        'user_id' => $admin->id,
                        'user_name' => $admin->name,
                        'error' => $result['error'] ?? 'Erreur inconnue'
                    ]);

                    $errorCount++;
                }

            } catch (\Exception $e) {
                $this->error("   💥 Exception: " . $e->getMessage());

                Log::error('💥 [CRON] Exception durant génération', [
                    'user_id' => $admin->id,
                    'user_name' => $admin->name,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);

                $errorCount++;
            }
        }

        // Résumé
        $this->newLine();
        $this->info("📈 Résumé de la génération hebdomadaire:");
        $this->info("   ✅ Succès: {$successCount}");
        $this->info("   ❌ Erreurs: {$errorCount}");

        Log::info('📈 [CRON] Génération hebdomadaire terminée', [
            'success_count' => $successCount,
            'error_count' => $errorCount,
            'total' => $adminInfos->count()
        ]);

        return $errorCount > 0 ? 1 : 0;
    }
}
