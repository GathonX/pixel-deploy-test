<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UserSite;
use App\Jobs\GenerateUserPostsJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateWeeklyPostsCommand extends Command
{
    /**
     * ✅ COMMANDE AUTOMATIQUE : Génère les posts chaque semaine
     */
    protected $signature = 'posts:generate-weekly
                            {--force : Forcer la génération même si déjà fait}
                            {--user= : ID utilisateur spécifique}
                            {--feature= : Fonctionnalité spécifique (blog|social_media)}';

    protected $description = 'Génère automatiquement les posts hebdomadaires pour tous les utilisateurs avec fonctionnalités actives';

    public function handle()
    {
        $this->info("🚀 Démarrage génération hebdomadaire automatique avec retry");

        $startTime = now();
        $usersProcessed = 0;
        $jobsDispatched = 0;
        $maxRetries = 5;
        $currentRetry = 0;

        while ($currentRetry < $maxRetries) {
            try {
                $currentRetry++;
                $this->info("🔄 Tentative {$currentRetry}/{$maxRetries}");

                // Obtenir les utilisateurs avec fonctionnalités actives
                $users = $this->getEligibleUsersWithRetry();

                if ($users->isEmpty()) {
                    $this->warn("⚠️ Aucun utilisateur éligible trouvé");
                    return Command::SUCCESS;
                }

                $this->info("👥 {$users->count()} utilisateurs éligibles trouvés");

                // Traiter chaque utilisateur avec retry individuel
                foreach ($users as $user) {
                    if ($this->processUserWithRetry($user)) {
                        $usersProcessed++;
                        $jobsDispatched += $this->dispatchJobsForUser($user);
                    }
                }

                $duration = $startTime->diffInSeconds(now());

                $this->info("✅ Génération hebdomadaire terminée avec succès");
                $this->table(['Métrique', 'Valeur'], [
                    ['Utilisateurs traités', $usersProcessed],
                    ['Jobs programmés', $jobsDispatched],
                    ['Tentatives utilisées', $currentRetry],
                    ['Durée', "{$duration}s"],
                    ['Semaine', now()->format('Y-W')]
                ]);

                Log::info("✅ Génération hebdomadaire automatique terminée", [
                    'users_processed' => $usersProcessed,
                    'jobs_dispatched' => $jobsDispatched,
                    'retries_used' => $currentRetry,
                    'duration_seconds' => $duration,
                    'week' => now()->format('Y-W')
                ]);

                return Command::SUCCESS;

            } catch (\Exception $e) {
                $waitTime = $this->calculateBackoffDelay($currentRetry);
                
                $this->error("❌ Tentative {$currentRetry} échouée: {$e->getMessage()}");
                
                if ($currentRetry < $maxRetries) {
                    $this->warn("⏳ Nouvelle tentative dans {$waitTime} secondes...");
                    sleep($waitTime);
                } else {
                    // Toutes les tentatives ont échoué
                    $this->error("💀 ÉCHEC DÉFINITIF après {$maxRetries} tentatives");
                    
                    Log::error("💀 Génération hebdomadaire - ÉCHEC DÉFINITIF", [
                        'error' => $e->getMessage(),
                        'retries_attempted' => $maxRetries,
                        'week' => now()->format('Y-W'),
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
     * ✅ CORRIGÉ : Obtenir utilisateurs éligibles avec vérification stricte activation
     * IMPORTANT : Seuls les utilisateurs avec fonctionnalité ACTIVÉE au moment de l'exécution
     */
    private function getEligibleUsersWithRetry()
    {
        $maxAttempts = 3;
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            try {
                $attempt++;
                $this->line("   🔄 Récupération utilisateurs - tentative {$attempt}/{$maxAttempts}");

                // Selon OFFER.md : blog IA + social IA = plan PRO uniquement
                // Trouver les user_id qui ont au moins un site avec plan PRO actif
                $proUserIds = UserSite::whereHas('planAssignment', function($q) {
                    $q->where('effective_plan_key', 'pro')
                      ->where('status', 'active')
                      ->where(function($q2) {
                          $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
                      });
                })->pluck('user_id')->unique();

                $query = User::whereIn('id', $proUserIds);

                if ($this->option('user')) {
                    $query->where('id', $this->option('user'));
                }

                $users    = $query->get();
                $validUsers = $users; // tous sont éligibles (déjà filtrés sur PRO)

                $this->line("   ✅ Utilisateurs valides trouvés: {$validUsers->count()} / {$users->count()}");

                Log::info("✅ Utilisateurs éligibles pour régénération", [
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
                $delay = min(pow(2, $attempt), 30); // Max 30 secondes
                sleep($delay);
            }
        }

        throw new \Exception("Échec inattendu lors de la récupération des utilisateurs");
    }

    /**
     * ✅ OBTENIR LES UTILISATEURS ÉLIGIBLES (legacy - gardé pour compatibilité)
     */
    private function getEligibleUsers()
    {
        return $this->getEligibleUsersWithRetry();
    }

    /**
     * ✅ TRAITER UN UTILISATEUR AVEC RETRY
     */
    private function processUserWithRetry(User $user): bool
    {
        $maxAttempts = 3;
        $attempt = 0;

        while ($attempt < $maxAttempts) {
            try {
                $attempt++;
                $this->line("👤 Traitement utilisateur: {$user->name} (ID: {$user->id}) - tentative {$attempt}");

                $this->line("   ✅ User PRO confirmé: {$user->name}");

                Log::info("👤 Traitement utilisateur pour génération hebdomadaire", [
                    'user_id'   => $user->id,
                    'user_name' => $user->name,
                    'attempt'   => $attempt,
                    'week'      => now()->format('Y-W'),
                ]);

                return true; // Succès

            } catch (\Exception $e) {
                $this->warn("   ⚠️ Échec traitement utilisateur {$user->id} (tentative {$attempt}): {$e->getMessage()}");
                
                if ($attempt >= $maxAttempts) {
                    Log::error("❌ Échec définitif traitement utilisateur", [
                        'user_id' => $user->id,
                        'attempts' => $maxAttempts,
                        'error' => $e->getMessage()
                    ]);
                    return false;
                }

                // Attendre avant retry
                $delay = min(pow(2, $attempt), 15);
                sleep($delay);
            }
        }

        return false;
    }

    /**
     * ✅ TRAITER UN UTILISATEUR (legacy - gardé pour compatibilité)
     */
    private function processUser(User $user): void
    {
        $this->processUserWithRetry($user);
    }

    /**
     * ✅ PROGRAMMER LES JOBS POUR UN UTILISATEUR
     */
    private function dispatchJobsForUser(User $user): int
    {
        $jobsCount = 0;

        // Plan PRO → blog IA + social IA tous les deux actifs
        $activeFeatures = ['blog', 'social_media'];

        foreach ($activeFeatures as $featureKey) {
            // Filtrer par fonctionnalité si demandé
            if ($this->option('feature') && $this->option('feature') !== $featureKey) {
                continue;
            }

            // Vérifier si génération déjà faite cette semaine (sauf si --force)
            if (!$this->option('force') && $this->hasPostsThisWeek($user, $featureKey)) {
                $this->line("   ⏭️ Posts {$featureKey} déjà générés cette semaine");
                continue;
            }

            // Programmer le job avec délai pour éviter la surcharge
            $delay = $jobsCount * 30; // 30 secondes entre chaque job

            GenerateUserPostsJob::dispatch($user, $featureKey)
                ->delay(now()->addSeconds($delay))
                ->onQueue('posts');

            $this->line("   🚀 Job {$featureKey} programmé (délai: {$delay}s)");

            Log::info("🚀 Job génération programmé", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'delay_seconds' => $delay,
                'week' => now()->format('Y-W')
            ]);

            $jobsCount++;
        }

        return $jobsCount;
    }

    /**
     * ✅ VÉRIFIER SI POSTS DÉJÀ GÉNÉRÉS CETTE SEMAINE
     */
    private function hasPostsThisWeek(User $user, string $featureKey): bool
    {
        $startOfWeek = now()->startOfWeek();
        $endOfWeek = now()->endOfWeek();

        if ($featureKey === 'blog') {
            $count = \App\Models\BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();
        } else {
            $count = \App\Models\SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->count();
        }

        return $count >= 7; // 7 posts par semaine
    }

    /**
     * ✅ CALCULER DÉLAI DE BACKOFF EXPONENTIEL
     */
    private function calculateBackoffDelay(int $attempt): int
    {
        // Backoff exponentiel: 2^attempt + random jitter
        $baseDelay = min(pow(2, $attempt), 300); // Max 5 minutes
        $jitter = rand(0, min($baseDelay * 0.1, 30)); // Jitter jusqu'à 10% ou 30s max
        
        return (int)($baseDelay + $jitter);
    }

    /**
     * ✅ PROGRAMMER FALLBACK D'URGENCE
     */
    private function scheduleEmergencyFallback(): void
    {
        try {
            // Programmer retry dans 2 heures
            $fallbackJob = new \App\Jobs\EmergencyWeeklyGenerationJob();
            dispatch($fallbackJob->delay(now()->addHours(2)));

            Log::info("🆘 Fallback d'urgence programmé", [
                'scheduled_for' => now()->addHours(2)->toISOString(),
                'week' => now()->format('Y-W')
            ]);

            // Envoyer notification admin
            $this->sendEmergencyNotification();

        } catch (\Exception $e) {
            Log::error("❌ Impossible de programmer fallback d'urgence", [
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
            $subject = "🚨 URGENT - Échec génération hebdomadaire PixelRise";

            $content = "ALERTE SYSTÈME PIXELRISE

🚨 GÉNÉRATION HEBDOMADAIRE EN ÉCHEC
══════════════════════════════════════════════════════════════════════

Date/Heure : " . now()->format('d/m/Y à H:i:s') . "
Semaine concernée : " . now()->format('Y-W') . "
Serveur : " . gethostname() . "

PROBLÈME DÉTECTÉ
─────────────────────────────────────────────────
❌ La génération automatique des posts hebdomadaires a échoué après 5 tentatives
❌ Erreurs probables : Panne base de données ou connexion réseau
❌ Utilisateurs impactés : Non déterminé (échec avant récupération)

ACTIONS AUTOMATIQUES PRISES
─────────────────────────────────────────────────
🔄 Fallback programmé dans 2 heures
📧 Notification admin envoyée
📋 Logs détaillés enregistrés

ACTIONS RECOMMANDÉES
─────────────────────────────────────────────────
1. Vérifier l'état des services (DB, Redis, etc.)
2. Consulter les logs : storage/logs/laravel.log
3. Lancer manuellement : php artisan posts:generate-weekly --force
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

            Log::info("📧 Notification d'urgence envoyée", [
                'email' => $adminEmail,
                'timestamp' => now()->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Impossible d'envoyer notification d'urgence", [
                'error' => $e->getMessage()
            ]);
        }
    }
}
