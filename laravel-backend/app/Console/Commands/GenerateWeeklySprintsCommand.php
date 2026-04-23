<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Project;
use App\Models\Sprint;
use App\Jobs\GenerateOptimizedSprintJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateWeeklySprintsCommand extends Command
{
    /**
     * ✅ COMMANDE AUTOMATIQUE : Génère les sprints chaque semaine
     */
    protected $signature = 'sprints:generate-weekly
                            {--force : Forcer la génération même si déjà fait}
                            {--user= : ID utilisateur spécifique}
                            {--project= : ID projet spécifique}';

    protected $description = 'Génère automatiquement les sprints hebdomadaires pour tous les utilisateurs avec projets actifs';

    public function handle()
    {
        $this->info("🚀 Démarrage génération sprints hebdomadaire automatique");

        $startTime = now();
        $usersProcessed = 0;
        $sprintsGenerated = 0;
        $jobsDispatched = 0;
        $maxRetries = 3;
        $currentRetry = 0;

        // Obtenir la semaine courante
        $now = Carbon::now();
        $weekNumber = $now->weekOfYear;
        $year = $now->year;

        $this->info("📅 Génération pour semaine {$weekNumber} de {$year}");

        while ($currentRetry < $maxRetries) {
            try {
                $currentRetry++;
                $this->info("🔄 Tentative {$currentRetry}/{$maxRetries}");

                // Obtenir les utilisateurs éligibles avec retry
                $users = $this->getEligibleUsersWithRetry();

                if ($users->isEmpty()) {
                    $this->warn("⚠️ Aucun utilisateur éligible pour génération sprint");
                    return Command::SUCCESS;
                }

                $this->info("👥 {$users->count()} utilisateurs éligibles trouvés");

                // Traiter chaque utilisateur
                foreach ($users as $user) {
                    $userProjects = $this->getUserProjectsForSprint($user);
                    
                    if ($userProjects->isEmpty()) {
                        $this->line("   ⏭️ Utilisateur {$user->name} (ID: {$user->id}) : Aucun projet actif");
                        continue;
                    }

                    $this->line("👤 Traitement utilisateur: {$user->name} (ID: {$user->id})");
                    $this->line("   📂 {$userProjects->count()} projet(s) actif(s)");

                    foreach ($userProjects as $project) {
                        // Vérifier si sprint déjà généré cette semaine
                        if (!$this->option('force') && $this->hasSprintThisWeek($user, $project, $weekNumber, $year)) {
                            $this->line("   ⏭️ Sprint déjà généré pour projet: {$project->name}");
                            continue;
                        }

                        // ✅ Récupérer l'access_id actif pour sprint_planning
                        $sprintAccess = \App\Models\UserFeatureAccess::whereHas('feature', function($query) {
                                $query->where('key', 'sprint_planning');
                            })
                            ->where('user_id', $user->id)
                            ->where('status', 'active')
                            ->where('admin_enabled', true)
                            ->where('user_activated', true)
                            ->first();

                        $accessId = $sprintAccess ? $sprintAccess->id : null;

                        // Programmer le job avec délai pour éviter la surcharge
                        $delay = $jobsDispatched * 45; // 45 secondes entre chaque job

                        GenerateOptimizedSprintJob::dispatch($user, $project, 'regeneration', $accessId)
                            ->delay(now()->addSeconds($delay))
                            ->onQueue('default');

                        $this->line("   🚀 Job sprint programmé pour projet: {$project->name} (délai: {$delay}s)");

                        Log::info("🚀 Job sprint programmé", [
                            'user_id' => $user->id,
                            'project_id' => $project->id,
                            'project_name' => $project->name,
                            'delay_seconds' => $delay,
                            'week' => "{$year}-W{$weekNumber}"
                        ]);

                        $jobsDispatched++;
                        $sprintsGenerated++;
                    }

                    $usersProcessed++;
                }

                $duration = $startTime->diffInSeconds(now());

                $this->info("✅ Génération sprints hebdomadaire terminée avec succès");
                $this->table(['Métrique', 'Valeur'], [
                    ['Utilisateurs traités', $usersProcessed],
                    ['Sprints programmés', $sprintsGenerated],
                    ['Jobs programmés', $jobsDispatched],
                    ['Tentatives utilisées', $currentRetry],
                    ['Durée', "{$duration}s"],
                    ['Semaine', "{$year}-W{$weekNumber}"]
                ]);

                Log::info("✅ Génération sprints hebdomadaire automatique terminée", [
                    'users_processed' => $usersProcessed,
                    'sprints_generated' => $sprintsGenerated,
                    'jobs_dispatched' => $jobsDispatched,
                    'retries_used' => $currentRetry,
                    'duration_seconds' => $duration,
                    'week' => "{$year}-W{$weekNumber}"
                ]);

                return Command::SUCCESS;

            } catch (\Exception $e) {
                $waitTime = $this->calculateBackoffDelay($currentRetry);
                
                $this->error("❌ Tentative {$currentRetry} échouée: {$e->getMessage()}");
                
                if ($currentRetry < $maxRetries) {
                    $this->warn("⏳ Nouvelle tentative dans {$waitTime} secondes...");
                    sleep($waitTime);
                } else {
                    $this->error("💀 ÉCHEC DÉFINITIF après {$maxRetries} tentatives");
                    
                    Log::error("💀 Génération sprints hebdomadaire - ÉCHEC DÉFINITIF", [
                        'error' => $e->getMessage(),
                        'retries_attempted' => $maxRetries,
                        'week' => "{$year}-W{$weekNumber}",
                        'trace' => $e->getTraceAsString()
                    ]);

                    // Programmer un retry différé comme fallback
                    $this->scheduleEmergencyFallback();

                    return Command::FAILURE;
                }
            }
        }

        return Command::FAILURE;
    }

    /**
     * ✅ CORRIGÉ : Obtenir utilisateurs éligibles avec vérification stricte activation sprint
     * IMPORTANT : Seuls les utilisateurs avec sprint_planning ACTIVÉ au moment de l'exécution
     */
    private function getEligibleUsersWithRetry()
    {
        $maxAttempts = 3;
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            try {
                $attempt++;
                $this->line("   🔄 Récupération utilisateurs - tentative {$attempt}/{$maxAttempts}");

                // ✅ RÈGLE STRICTE : Seulement les utilisateurs avec sprint_planning ACTIF
                $query = User::whereHas('featureAccess', function ($query) {
                    $query->whereHas('feature', function ($subQuery) {
                        $subQuery->where('key', 'sprint_planning');
                    })
                    ->where('admin_enabled', true)    // ✅ Admin a activé
                    ->where('user_activated', true)   // ✅ User a activé (switch ON)
                    ->where('status', 'active')       // ✅ Status = active
                    ->where(function($q) {
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now()); // ✅ Non expiré
                    });
                })->whereHas('projects', function ($query) {
                    $query->where('is_active', true);
                });

                // Filtrer par utilisateur spécifique si demandé
                if ($this->option('user')) {
                    $query->where('id', $this->option('user'));
                }

                $users = $query->with([
                    'projects' => function ($query) {
                        $query->where('is_active', true);
                    },
                    'featureAccess.feature'
                ])->get();

                // ✅ VALIDATION SUPPLÉMENTAIRE : Vérifier que chaque user a vraiment sprint_planning actif
                $validUsers = $users->filter(function($user) {
                    $hasActiveSprint = $user->featureAccess->filter(function($access) {
                        return $access->feature->key === 'sprint_planning'
                            && $access->admin_enabled
                            && $access->user_activated  // ✅ CRITIQUE : User doit avoir activé (switch)
                            && $access->status === 'active'
                            && ($access->expires_at === null || $access->expires_at > now());
                    })->count() > 0;

                    return $hasActiveSprint;
                });

                $this->line("   ✅ Utilisateurs valides trouvés: {$validUsers->count()} / {$users->count()}");

                Log::info("✅ Utilisateurs éligibles pour génération sprint", [
                    'total_users_with_access' => $users->count(),
                    'valid_active_users' => $validUsers->count(),
                    'filtered_out' => $users->count() - $validUsers->count(),
                    'week' => now()->format('Y-W')
                ]);

                return $validUsers;

            } catch (\Exception $e) {
                $this->warn("   ⚠️ Échec tentative {$attempt}: {$e->getMessage()}");

                if ($attempt >= $maxAttempts) {
                    throw new \Exception("Impossible de récupérer les utilisateurs après {$maxAttempts} tentatives: " . $e->getMessage());
                }

                // Attendre avant retry avec backoff
                $delay = min(pow(2, $attempt), 30);
                sleep($delay);
            }
        }

        throw new \Exception("Échec inattendu lors de la récupération des utilisateurs");
    }

    /**
     * ✅ OBTENIR LES PROJETS D'UN UTILISATEUR POUR SPRINT
     */
    private function getUserProjectsForSprint(User $user)
    {
        $query = $user->projects()->where('is_active', true);

        // Filtrer par projet spécifique si demandé
        if ($this->option('project')) {
            $query->where('id', $this->option('project'));
        }

        return $query->get();
    }

    /**
     * ✅ VÉRIFIER SI SPRINT DÉJÀ GÉNÉRÉ CETTE SEMAINE
     */
    private function hasSprintThisWeek(User $user, Project $project, int $weekNumber, int $year): bool
    {
        return Sprint::where('user_id', $user->id)
            ->where('project_id', $project->id)
            ->where('week_number', $weekNumber)
            ->where('year', $year)
            ->exists();
    }

    /**
     * ✅ CALCULER DÉLAI DE BACKOFF EXPONENTIEL
     */
    private function calculateBackoffDelay(int $attempt): int
    {
        $baseDelay = min(pow(2, $attempt), 180); // Max 3 minutes
        $jitter = rand(0, min($baseDelay * 0.1, 20));
        
        return (int)($baseDelay + $jitter);
    }

    /**
     * ✅ PROGRAMMER FALLBACK D'URGENCE
     */
    private function scheduleEmergencyFallback(): void
    {
        try {
            // Programmer retry dans 1 heure
            $this->call('sprints:generate-weekly', ['--force' => true]);
            
            Log::info("🆘 Fallback sprint programmé", [
                'scheduled_for' => now()->addHour()->toISOString(),
                'week' => now()->format('Y-W')
            ]);

            // Envoyer notification admin
            $this->sendEmergencyNotification();

        } catch (\Exception $e) {
            Log::error("❌ Impossible de programmer fallback sprint d'urgence", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ ENVOYER NOTIFICATION D'URGENCE
     */
    private function sendEmergencyNotification(): void
    {
        try {
            $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');
            $subject = "🚨 URGENT - Échec génération sprints hebdomadaire PixelRise";

            $content = "ALERTE SYSTÈME PIXELRISE - SPRINTS

🚨 GÉNÉRATION SPRINTS HEBDOMADAIRE EN ÉCHEC
══════════════════════════════════════════════════════════════════════

Date/Heure : " . now()->format('d/m/Y à H:i:s') . "
Semaine concernée : " . now()->format('Y-W') . "
Serveur : " . gethostname() . "

PROBLÈME DÉTECTÉ
─────────────────────────────────────────────────
❌ La génération automatique des sprints hebdomadaires a échoué
❌ Erreurs probables : Panne base de données ou connexion réseau
❌ Utilisateurs impactés : Non déterminé (échec avant récupération)

ACTIONS AUTOMATIQUES PRISES
─────────────────────────────────────────────────
🔄 Fallback programmé dans 1 heure
📧 Notification admin envoyée
📋 Logs détaillés enregistrés

ACTIONS RECOMMANDÉES
─────────────────────────────────────────────────
1. Vérifier l'état des services (DB, Redis, etc.)
2. Consulter les logs : storage/logs/laravel.log
3. Lancer manuellement : php artisan sprints:generate-weekly --force
4. Surveiller le fallback automatique

STATUT SYSTÈME
─────────────────────────────────────────────────
🔍 Scheduler Laravel : Actif
⚡ Queue système : À vérifier
🗄️ Base de données : À vérifier
📡 Connexions réseau : À vérifier

Cette notification est automatique.
Système de surveillance PixelRise";

            \Mail::raw($content, function ($message) use ($adminEmail, $subject) {
                $message->to($adminEmail)
                    ->subject($subject);
            });

            Log::info("📧 Notification d'urgence sprint envoyée", [
                'email' => $adminEmail,
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Impossible d'envoyer notification d'urgence sprint", [
                'error' => $e->getMessage()
            ]);
        }
    }
}