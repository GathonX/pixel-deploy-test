<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\ContentGeneration\AdminPostGenerationService;
use Illuminate\Support\Facades\Log;

class GenerateAdminWeeklyPostsCommand extends Command
{
    /**
     * ✅ COMMANDE : Générer les posts hebdomadaires pour les admins
     */
    protected $signature = 'admin:generate-weekly-posts
                            {--admin-id= : ID de l\'admin spécifique}
                            {--force : Forcer la génération même si déjà fait}';

    protected $description = 'Génère automatiquement les posts hebdomadaires pour les administrateurs configurés';

    private AdminPostGenerationService $adminPostService;

    public function __construct(AdminPostGenerationService $adminPostService)
    {
        parent::__construct();
        $this->adminPostService = $adminPostService;
    }

    public function handle()
    {
        $this->info("🚀 Démarrage génération hebdomadaire posts admin");

        $startTime = now();
        $adminsProcessed = 0;
        $postsGenerated = 0;

        try {
            // Obtenir les admins éligibles
            $admins = $this->getEligibleAdmins();

            if ($admins->isEmpty()) {
                $this->warn("⚠️ Aucun admin éligible trouvé");
                return Command::SUCCESS;
            }

            $this->info("👥 {$admins->count()} admin(s) éligible(s) trouvé(s)");

            // Traiter chaque admin
            foreach ($admins as $admin) {
                $this->line("👤 Traitement admin: {$admin->name} (ID: {$admin->id})");

                // Vérifier si génération nécessaire (sauf si --force)
                if (!$this->option('force') && !$this->adminPostService->needsGenerationThisWeek($admin)) {
                    $this->line("   ⏭️ Posts déjà générés cette semaine");
                    continue;
                }

                // Générer les posts
                $result = $this->adminPostService->generateWeeklyPostsForAdmin($admin);

                if ($result['success']) {
                    $count = $result['data']['posts_count'] ?? 0;
                    $postsGenerated += $count;
                    $adminsProcessed++;

                    $this->line("   ✅ {$count} post(s) généré(s)");

                    Log::info("✅ Posts admin générés avec succès", [
                        'admin_id' => $admin->id,
                        'posts_count' => $count,
                        'objective_id' => $result['data']['objective']->id ?? null,
                        'week' => now()->format('Y-W')
                    ]);
                } else {
                    $this->error("   ❌ Échec: {$result['error']}");

                    Log::error("❌ Échec génération posts admin", [
                        'admin_id' => $admin->id,
                        'error' => $result['error']
                    ]);
                }

                // Délai entre chaque admin pour éviter surcharge
                if ($admins->count() > 1) {
                    sleep(3);
                }
            }

            $duration = $startTime->diffInSeconds(now());

            $this->info("✅ Génération hebdomadaire admin terminée");
            $this->table(['Métrique', 'Valeur'], [
                ['Admins traités', $adminsProcessed],
                ['Posts générés', $postsGenerated],
                ['Durée', "{$duration}s"],
                ['Semaine', now()->format('Y-W')]
            ]);

            Log::info("✅ Génération hebdomadaire admin terminée", [
                'admins_processed' => $adminsProcessed,
                'posts_generated' => $postsGenerated,
                'duration_seconds' => $duration,
                'week' => now()->format('Y-W')
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");

            Log::error("❌ Erreur génération hebdomadaire admin", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ Obtenir les admins éligibles pour la génération
     */
    private function getEligibleAdmins()
    {
        $query = User::where('is_admin', true)
            ->whereHas('adminProjectInfo', function ($query) {
                $query->where('auto_generation_enabled', true);
            });

        // Filtrer par admin spécifique si demandé
        if ($this->option('admin-id')) {
            $query->where('id', $this->option('admin-id'));
        }

        return $query->with('adminProjectInfo')->get();
    }
}
