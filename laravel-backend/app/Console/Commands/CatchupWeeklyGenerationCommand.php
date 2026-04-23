<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Jobs\GenerateUserPostsJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CatchupWeeklyGenerationCommand extends Command
{
    /**
     * ✅ COMMANDE DE RATTRAPAGE D'URGENCE
     */
    protected $signature = 'posts:catchup-weekly
                            {--force : Forcer même si posts déjà générés}
                            {--user= : Utilisateur spécifique à rattraper}
                            {--dry-run : Simulation sans réelle génération}
                            {--urgent : Mode urgence avec priorité absolue}
                            {--feature= : Fonctionnalité spécifique (blog|social_media)}';

    protected $description = 'Rattrapage d\'urgence pour la génération hebdomadaire manquée';

    public function handle()
    {
        $this->info("🆘 COMMANDE DE RATTRAPAGE D'URGENCE");
        $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        $startTime = now();
        $stats = [
            'users_analyzed' => 0,
            'users_needing_catchup' => 0,
            'jobs_scheduled' => 0,
            'errors' => 0
        ];

        try {
            // Analyser la situation
            $analysis = $this->analyzeSituation();
            $this->displayAnalysis($analysis);

            if ($this->option('dry-run')) {
                $this->info("🔍 MODE SIMULATION - Aucune action réelle");
                return Command::SUCCESS;
            }

            // Confirmation pour les actions d'urgence
            if (!$this->option('force') && !$this->confirm('🚨 Procéder au rattrapage d\'urgence ?', true)) {
                $this->info("❌ Rattrapage annulé par l'utilisateur");
                return Command::SUCCESS;
            }

            // Obtenir utilisateurs nécessitant un rattrapage
            $usersForCatchup = $this->getUsersNeedingCatchup();
            $stats['users_analyzed'] = $usersForCatchup->count();

            if ($usersForCatchup->isEmpty()) {
                $this->info("✅ Aucun utilisateur ne nécessite de rattrapage");
                return Command::SUCCESS;
            }

            $stats['users_needing_catchup'] = $usersForCatchup->count();
            $this->warn("⚡ {$usersForCatchup->count()} utilisateurs nécessitent un rattrapage");

            // Traitement par utilisateur
            foreach ($usersForCatchup as $user) {
                try {
                    $jobsForUser = $this->processUserForCatchup($user);
                    $stats['jobs_scheduled'] += $jobsForUser;
                    
                    $this->line("   ✅ {$user->name}: {$jobsForUser} jobs programmés");

                } catch (\Exception $e) {
                    $stats['errors']++;
                    $this->error("   ❌ {$user->name}: {$e->getMessage()}");
                    
                    Log::error("❌ Erreur rattrapage utilisateur", [
                        'user_id' => $user->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Résultats finaux
            $duration = $startTime->diffInSeconds(now());
            $this->displayResults($stats, $duration);

            // Log du rattrapage
            Log::info("🆘 Rattrapage d'urgence terminé", array_merge($stats, [
                'duration_seconds' => $duration,
                'week' => now()->format('Y-W'),
                'executed_by' => 'catchup_command'
            ]));

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("💀 ÉCHEC CRITIQUE DU RATTRAPAGE: {$e->getMessage()}");
            
            Log::critical("💀 Échec critique rattrapage d'urgence", [
                'error' => $e->getMessage(),
                'stats' => $stats,
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ ANALYSER LA SITUATION ACTUELLE
     */
    private function analyzeSituation(): array
    {
        try {
            $startOfWeek = now()->startOfWeek();
            $endOfWeek = now()->endOfWeek();

            $activeUsers = User::whereHas('featureAccess', function ($query) {
                $query->whereHas('feature', function ($subQuery) {
                    $subQuery->whereIn('key', ['blog', 'social_media']);
                })
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->where(function($q) {
                    $q->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
                });
            })->count();

            $usersWithBlogPosts = User::whereHas('blogPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                $query->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
            })->count();

            $usersWithSocialPosts = User::whereHas('socialMediaPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                $query->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
            })->count();

            return [
                'active_users' => $activeUsers,
                'users_with_blog_posts' => $usersWithBlogPosts,
                'users_with_social_posts' => $usersWithSocialPosts,
                'users_missing_blog' => max(0, $activeUsers - $usersWithBlogPosts),
                'users_missing_social' => max(0, $activeUsers - $usersWithSocialPosts),
                'week' => now()->format('Y-W'),
                'day_of_week' => now()->format('l'),
                'analysis_time' => now()->format('H:i:s')
            ];

        } catch (\Exception $e) {
            return [
                'error' => $e->getMessage(),
                'analysis_failed' => true
            ];
        }
    }

    /**
     * ✅ AFFICHER L'ANALYSE
     */
    private function displayAnalysis(array $analysis): void
    {
        if (isset($analysis['analysis_failed'])) {
            $this->error("❌ Analyse échouée: {$analysis['error']}");
            return;
        }

        $this->info("📊 ANALYSE DE LA SITUATION");
        $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->table([
            'Métrique', 'Valeur'
        ], [
            ['Semaine', $analysis['week']],
            ['Jour', $analysis['day_of_week']],
            ['Heure analyse', $analysis['analysis_time']],
            ['👥 Utilisateurs actifs', $analysis['active_users']],
            ['📝 Avec posts blog', $analysis['users_with_blog_posts']],
            ['📱 Avec posts sociaux', $analysis['users_with_social_posts']],
            ['❌ Sans posts blog', $analysis['users_missing_blog']],
            ['❌ Sans posts sociaux', $analysis['users_missing_social']],
        ]);

        // Alertes visuelles
        if ($analysis['users_missing_blog'] > 0) {
            $this->warn("⚠️ {$analysis['users_missing_blog']} utilisateurs sans posts blog cette semaine");
        }
        if ($analysis['users_missing_social'] > 0) {
            $this->warn("⚠️ {$analysis['users_missing_social']} utilisateurs sans posts sociaux cette semaine");
        }
    }

    /**
     * ✅ OBTENIR UTILISATEURS NÉCESSITANT RATTRAPAGE
     */
    private function getUsersNeedingCatchup()
    {
        $query = User::whereHas('featureAccess', function ($query) {
            $query->whereHas('feature', function ($subQuery) {
                $subQuery->whereIn('key', ['blog', 'social_media']);
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->where(function($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            });
        });

        // Filtrer par utilisateur spécifique si demandé
        if ($this->option('user')) {
            $query->where('id', $this->option('user'));
        }

        return $query->with(['featureAccess.feature'])->get();
    }

    /**
     * ✅ TRAITER UN UTILISATEUR POUR RATTRAPAGE
     */
    private function processUserForCatchup(User $user): int
    {
        $jobsScheduled = 0;
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        $activeFeatures = $user->featureAccess()
            ->whereHas('feature', function ($query) {
                $query->whereIn('key', ['blog', 'social_media']);
            })
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->with('feature')
            ->get();

        foreach ($activeFeatures as $access) {
            $featureKey = $access->feature->key;

            // Filtrer par fonctionnalité si demandé
            if ($this->option('feature') && $this->option('feature') !== $featureKey) {
                continue;
            }

            // Vérifier si rattrapage nécessaire
            $needsCatchup = false;

            if ($featureKey === 'blog') {
                $postsCount = \App\Models\BlogPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();
                $needsCatchup = $postsCount < 7;
            } else {
                $postsCount = \App\Models\SocialMediaPost::where('user_id', $user->id)
                    ->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count();
                $needsCatchup = $postsCount < 7;
            }

            if ($needsCatchup || $this->option('force')) {
                // Mode urgence = priorité absolue
                $delay = $this->option('urgent') ? 0 : $jobsScheduled * 10; // 10s entre jobs

                GenerateUserPostsJob::dispatch($user, $featureKey)
                    ->delay(now()->addSeconds($delay))
                    ->onQueue($this->option('urgent') ? 'high' : 'posts');

                Log::info("🆘 Job rattrapage programmé", [
                    'user_id' => $user->id,
                    'feature_key' => $featureKey,
                    'posts_existing' => $postsCount ?? 0,
                    'urgency' => $this->option('urgent') ? 'HIGH' : 'NORMAL',
                    'delay_seconds' => $delay
                ]);

                $jobsScheduled++;
            }
        }

        return $jobsScheduled;
    }

    /**
     * ✅ AFFICHER RÉSULTATS FINAUX
     */
    private function displayResults(array $stats, int $duration): void
    {
        $this->line("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info("🏁 RATTRAPAGE D'URGENCE TERMINÉ");

        $this->table([
            'Métrique', 'Valeur'
        ], [
            ['👥 Utilisateurs analysés', $stats['users_analyzed']],
            ['⚡ Nécessitant rattrapage', $stats['users_needing_catchup']],
            ['🚀 Jobs programmés', $stats['jobs_scheduled']],
            ['❌ Erreurs', $stats['errors']],
            ['⏱️ Durée', "{$duration}s"],
            ['🕐 Terminé à', now()->format('H:i:s')],
        ]);

        if ($stats['jobs_scheduled'] > 0) {
            $this->info("✅ {$stats['jobs_scheduled']} jobs de rattrapage programmés avec succès");
            $this->line("📋 Les posts seront générés dans les prochaines minutes");
        }

        if ($stats['errors'] > 0) {
            $this->warn("⚠️ {$stats['errors']} erreurs détectées - Vérifiez les logs");
        }
    }
}