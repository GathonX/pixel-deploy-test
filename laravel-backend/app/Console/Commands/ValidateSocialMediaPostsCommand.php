<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Services\ContentGeneration\SocialMediaGenerationRulesService;
use Illuminate\Support\Facades\Log;

class ValidateSocialMediaPostsCommand extends Command
{
    /**
     * ✅ COMMANDE DE VALIDATION ET CORRECTION DES POSTS SOCIAUX
     */
    protected $signature = 'posts:validate-social 
                            {--user= : ID utilisateur spécifique}
                            {--fix : Corriger automatiquement les problèmes}
                            {--dry-run : Afficher les actions sans les appliquer}';

    protected $description = 'Valide et corrige les posts sociaux selon les nouvelles règles par jour d\'activation';

    private SocialMediaGenerationRulesService $socialRulesService;

    public function __construct(SocialMediaGenerationRulesService $socialRulesService)
    {
        parent::__construct();
        $this->socialRulesService = $socialRulesService;
    }

    public function handle()
    {
        $this->info("🔍 Validation des posts sociaux selon les nouvelles règles");
        
        $userId = $this->option('user');
        $shouldFix = $this->option('fix');
        $isDryRun = $this->option('dry-run');
        $startTime = now();

        try {
            $stats = [
                'users_checked' => 0,
                'users_with_issues' => 0,
                'posts_fixed' => 0,
                'errors' => 0
            ];

            // Obtenir les utilisateurs avec fonctionnalité social_media active
            $users = $this->getEligibleUsers($userId);

            if ($users->isEmpty()) {
                $this->info("ℹ️ Aucun utilisateur avec social_media actif");
                return Command::SUCCESS;
            }

            $this->info("👥 {$users->count()} utilisateur(s) à vérifier");

            foreach ($users as $user) {
                $stats['users_checked']++;
                $this->processUser($user, $shouldFix, $isDryRun, $stats);
            }

            // Afficher les résultats
            $duration = $startTime->diffInSeconds(now());
            
            $this->info("✅ Validation terminée");
            $this->table(['Métrique', 'Valeur'], [
                ['👥 Utilisateurs vérifiés', $stats['users_checked']],
                ['⚠️ Utilisateurs avec problèmes', $stats['users_with_issues']],
                ['🔧 Posts corrigés', $stats['posts_fixed']],
                ['❌ Erreurs', $stats['errors']],
                ['⏱️ Durée', "{$duration}s"],
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }

    private function getEligibleUsers(?string $userId = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = User::query();

        if ($userId) {
            $query->where('id', $userId);
        }

        return $query->whereHas('featureAccess', function ($subQuery) {
            $subQuery->whereHas('feature', function ($featureQuery) {
                $featureQuery->where('key', 'social_media');
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->where(function($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
        })->get();
    }

    private function processUser(User $user, bool $shouldFix, bool $isDryRun, array &$stats): void
    {
        try {
            $this->line("🔍 Vérification: {$user->name} (ID: {$user->id})");

            // Valider selon les nouvelles règles
            $validation = $this->socialRulesService->validateUserSocialPosts($user);

            if (!$validation || $validation['valid']) {
                $this->line("  ✅ Posts conformes aux règles");
                return;
            }

            $stats['users_with_issues']++;
            
            $this->warn("  ⚠️ Problème détecté:");
            $this->line("    - Attendu: {$validation['expected_count']} posts");
            $this->line("    - Actuel: {$validation['actual_count']} posts");
            $this->line("    - Jour d'activation: {$validation['activation_date']}");

            if ($validation['excess_count'] > 0) {
                $this->warn("    - Posts en trop: {$validation['excess_count']}");
            }

            if ($validation['missing_count'] > 0) {
                $this->warn("    - Posts manquants: {$validation['missing_count']}");
            }

            // Afficher le détail des posts
            if (!empty($validation['posts_details'])) {
                $this->line("    - Posts existants:");
                foreach ($validation['posts_details'] as $post) {
                    $this->line("      • {$post['platform']} (ID: {$post['id']}) - {$post['created_at']} - {$post['status']}");
                }
            }

            // Corriger si demandé
            if ($shouldFix) {
                $this->line("  🔧 Correction en cours...");
                
                $fixResult = $this->socialRulesService->fixUserSocialPosts($user, $isDryRun);
                
                if ($fixResult['success']) {
                    $stats['posts_fixed'] += count($fixResult['actions']);
                    
                    if (!empty($fixResult['actions'])) {
                        $this->info("  ✅ Actions appliquées:");
                        foreach ($fixResult['actions'] as $action) {
                            $this->line("    • {$action}");
                        }
                    } else {
                        $this->line("  ✅ Aucune action nécessaire");
                    }
                } else {
                    $this->error("  ❌ Échec correction: {$fixResult['error']}");
                    $stats['errors']++;
                }
            } else {
                $this->line("  💡 Utilisez --fix pour corriger automatiquement");
            }

        } catch (\Exception $e) {
            $this->error("  ❌ Erreur: {$e->getMessage()}");
            $stats['errors']++;
            
            Log::error("❌ Erreur validation utilisateur", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
        }
    }
}