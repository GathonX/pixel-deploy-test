<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\Log;

class Kernel extends ConsoleKernel
{
    /**
     * ✅ COMMANDES AUTOMATIQUES PROGRAMMÉES + EXPIRATION
     */
    protected function schedule(Schedule $schedule): void
    {
        // ===== 🤖 AGENT PROACTIF =====

        // Scan toutes les 15 min : check-ins, check-outs, confirmations en attente, séjours dépassés
        $schedule->command('agent:proactive-scan')
            ->everyFifteenMinutes()
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(10)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/agent-proactive-scan.log'));

        // ===== 🏢 WORKSPACE LIFECYCLE =====

        // Lifecycle workspace : rappels essai/abonnement, suspensions, overdue invoices
        $schedule->command('workspace:process-expirations')
            ->dailyAt('08:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/workspace-expirations.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // Suppression physique des workspaces en file (J+30)
        $schedule->command('workspace:process-deletions')
            ->dailyAt('03:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/workspace-deletions.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ===== 📅 SYSTÈME D'EXPIRATION FONCTIONNALITÉS (NOUVEAU) =====

        // ✅ 1. VÉRIFICATION QUOTIDIENNE DES EXPIRATIONS (1 fois par jour)
        // Tous les jours à 09:00 - Vérifier et envoyer alertes (emails + notifications)
        // Fréquence réduite : 7 jours avant (1x/semaine), 1 jour avant (1x/jour), expiré (1x/semaine)
        $schedule->command('features:check-expiring')
            ->dailyAt('09:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/feature-expiration.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ===== 🤖 SYSTÈME DE GÉNÉRATION =====

        // ✅ 2b. VÉRIFICATION POSTS SOCIAUX MANQUANTS - TOUTES LES 5 MINUTES
        // Toutes les 5 minutes - Vérifier et régénérer les posts sociaux manquants pour utilisateurs actifs
        // CRITIQUE : Permet aux utilisateurs de ne pas attendre longtemps pour leurs posts
        $schedule->command('social:check-missing-posts')
            ->everyFiveMinutes()
            ->timezone('UTC')
            ->withoutOverlapping(4) // Max 4 minutes pour éviter chevauchement
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/check-missing-social-posts.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 2c. VÉRIFICATION POSTS BLOG MANQUANTS - TOUTES LES 5 MINUTES
        // Toutes les 5 minutes - Vérifier et régénérer les posts blog manquants pour utilisateurs actifs
        // CRITIQUE : Permet aux utilisateurs de ne pas attendre longtemps pour leurs posts
        $schedule->command('blog:check-missing-posts')
            ->everyFiveMinutes()
            ->timezone('UTC')
            ->withoutOverlapping(4) // Max 4 minutes pour éviter chevauchement
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/check-missing-blog-posts.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 3. PUBLICATION AUTOMATIQUE DES POSTS PROGRAMMÉS - TOUTES LES HEURES
        // Toutes les heures - Publier les posts selon le timezone de chaque utilisateur
        $schedule->command('posts:publish-scheduled')
            ->hourly()
            ->timezone('UTC') // UTC pour uniformité mondiale
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/auto-publish.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 4. PUBLICATION DE SÉCURITÉ RENFORCÉE - TOUTES LES 30 MINUTES
        // Toutes les 30 minutes durant les heures de travail mondiales (6h-22h UTC)
        $schedule->command('posts:publish-scheduled')
            ->cron('*/30 6-22 * * *') // Toutes les 30 min entre 6h et 22h UTC
            ->timezone('UTC')
            ->withoutOverlapping(15)
            ->runInBackground()
            ->when(function () {
                // Seulement si il y a des posts en attente
                $hasPendingPosts = \App\Models\BlogPost::where('status', 'scheduled')->exists() ||
                                  \App\Models\SocialMediaPost::where('status', 'scheduled')->exists();
                return $hasPendingPosts;
            });

        // ✅ 4b. CORRECTION AUTOMATIQUE DES STATUS
        // Tous les jours à 07:00 - Corriger les status selon les dates réelles
        $schedule->command('posts:fix-status')
            ->dailyAt('07:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/fix-status.log'));

        // ✅ 4c. CORRECTION AUTOMATIQUE DES DOUBLONS
        // Tous les jours à 07:30 - Détecter et corriger le contenu dupliqué
        $schedule->command('posts:fix-duplicates --regenerate')
            ->dailyAt('07:30')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60) // 1 heure max pour éviter les conflits
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/fix-duplicates.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 4d. POST GUARDIAN - SURVEILLANCE ET RATTRAPAGE AUTOMATIQUE
        // 3 fois par jour : matin, midi, soir pour garantir aucun post manqué
        $schedule->command('posts:guardian --days=2')
            ->dailyAt('09:00') // Matin - vérification générale
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(120) // 2 heures max
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/post-guardian.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        $schedule->command('posts:guardian --days=1')
            ->dailyAt('15:00') // Après-midi - vérification rapide
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/post-guardian-afternoon.log'));

        $schedule->command('posts:guardian --days=3')
            ->dailyAt('21:00') // Soir - vérification approfondie
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(180) // 3 heures max
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/post-guardian-evening.log'));


        // ✅ 5. GÉNÉRATION HEBDOMADAIRE AUTOMATIQUE - SYSTÈME MULTI-FALLBACK
        // Chaque lundi à 06:00 UTC - Tentative principale
        $schedule->command('posts:generate-weekly')
            ->weeklyOn(1, '06:00') // Lundi 6h du matin UTC
            ->timezone('UTC')
            ->withoutOverlapping(240) // Éviter les doublons (4h max)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/weekly-generation.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 5b. GÉNÉRATION HEBDOMADAIRE ADMIN - SYSTÈME AUTOMATIQUE
        // Chaque lundi à 06:00 UTC - Génération posts admin
        $schedule->command('admin:generate-weekly-posts')
            ->weeklyOn(1, '06:00') // Lundi 6h00 du matin UTC
            ->timezone('UTC')
            ->withoutOverlapping(60) // 1h max
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/admin-weekly-generation.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 5c. PUBLICATION AUTOMATIQUE POSTS ADMIN SCHEDULED - TOUS LES JOURS
        // Tous les jours à 06:00 - Publier les posts admin scheduled dont la date est arrivée
        $schedule->command('admin:publish-scheduled-posts')
            ->dailyAt('06:00')
            ->timezone('UTC')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/admin-auto-publish.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));



        // ✅ 6. GÉNÉRATION DE RATTRAPAGE MARDI (si échec total lundi)
        // Chaque mardi à 08:00 UTC - Pour rattraper les échecs du lundi
        $schedule->command('posts:generate-weekly --force')
            ->weeklyOn(2, '08:00') // Mardi 8h du matin UTC
            ->timezone('UTC')
            ->withoutOverlapping(120)
            ->runInBackground()
            ->when(function () {
                // Seulement si certains utilisateurs n'ont pas de posts cette semaine
                return $this->shouldRunCatchupGeneration();
            })
            ->sendOutputTo(storage_path('logs/weekly-generation-tuesday.log'));

        // ===== 🏃‍♂️ SYSTÈME SPRINTS AUTOMATIQUE =====

        // ✅ 6a. GÉNÉRATION SPRINTS HEBDOMADAIRE AUTOMATIQUE
        // Chaque lundi à 6:00 UTC - Régénération automatique des sprints pour la semaine
        $schedule->command('sprints:generate-weekly')
            ->weeklyOn(1, '06:00') // Lundi 6h du matin UTC
            ->timezone('UTC')
            ->withoutOverlapping(300) // 5 heures max pour éviter les conflits
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/sprint-generation.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 6b. RATTRAPAGE SPRINTS LUNDI MATIN (si échec dimanche)
        // Lundi 07:00 UTC - Fallback pour sprints manqués
        $schedule->command('sprints:generate-weekly --force')
            ->weeklyOn(1, '07:00') // Lundi 7h du matin UTC
            ->timezone('UTC')
            ->withoutOverlapping(180) // 3 heures max
            ->runInBackground()
            ->when(function () {
                return $this->shouldRunSprintFallback();
            })
            ->sendOutputTo(storage_path('logs/sprint-generation-fallback.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 6c. RATTRAPAGE SPRINTS FINAL MARDI (dernière chance)
        // Mardi 10:00 UTC - Dernier rattrapage pour sprints manqués
        $schedule->command('sprints:generate-weekly --force')
            ->weeklyOn(2, '10:00') // Mardi 10h UTC
            ->timezone('UTC')
            ->withoutOverlapping(120)
            ->runInBackground()
            ->when(function () {
                return $this->shouldRunSprintFinalFallback();
            })
            ->sendOutputTo(storage_path('logs/sprint-generation-final.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 6.1. RATTRAPAGE FINAL MERCREDI (dernière chance)
        // Mercredi 10:00 UTC - Rattrapage ultime
        $schedule->command('posts:generate-weekly --force')
            ->weeklyOn(3, '10:00')
            ->timezone('UTC')
            ->withoutOverlapping(120)
            ->runInBackground()
            ->when(function () {
                return $this->shouldRunFinalCatchup();
            })
            ->sendOutputTo(storage_path('logs/weekly-generation-final.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ===== 🧹 MAINTENANCE SYSTÈME =====

        // ✅ 7. NETTOYAGE AUTOMATIQUE DES LOGS
        // Tous les dimanches à 02:00 - Supprimer logs > 30 jours pour éviter saturation disque
        $schedule->command('logs:clear --days=30')
            ->weeklyOn(0, '02:00') // Dimanche 2h du matin
            ->timezone('Indian/Antananarivo')
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/logs-cleanup.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 7a. NETTOYAGE AUTOMATIQUE DU CACHE
        // Tous les dimanches à 23:00 - Préparer la nouvelle semaine
        $schedule->command('cache:clear')
            ->weeklyOn(0, '23:00') // Dimanche 23h
            ->timezone('Indian/Antananarivo');

        // ✅ 7a. VÉRIFICATION HEBDOMADAIRE INTENSIVE DES DOUBLONS
        // Tous les dimanches à 22:00 - Nettoyage complet avant la nouvelle semaine
        $schedule->command('posts:fix-duplicates --regenerate --delete-unsolvable')
            ->weeklyOn(0, '22:00') // Dimanche 22h
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(120) // 2 heures max
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/weekly-duplicate-cleanup.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 6. NETTOYAGE DES JOBS ÉCHOUÉS
        // Tous les jours à 02:00 - Nettoyer les jobs en échec
        $schedule->command('queue:flush')
            ->dailyAt('02:00')
            ->timezone('Indian/Antananarivo');

        // ✅ 7. SURVEILLANCE DES QUEUES
        // Toutes les 5 minutes - Vérifier que les workers tournent
        $schedule->command('queue:monitor posts --max=100')
            ->everyFiveMinutes()
            ->withoutOverlapping();


        // ✅ 8. NETTOYAGE DES NOTIFICATIONS ANCIENNES
        // Tous les jours à 01:00 - Supprimer notifications > 30 jours
        $schedule->command('notifications:cleanup')
            ->dailyAt('01:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/notifications-cleanup.log'));

        // ✅ 9. STATISTIQUES HEBDOMADAIRES + EXPIRATION
        // Chaque dimanche à 20:00 - Rapport hebdomadaire avec stats expiration
        $schedule->command('reports:weekly')
            ->weeklyOn(0, '20:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/weekly-report.log'));

        // ✅ 10. MAINTENANCE AUTOMATIQUE
        // Tous les jours à 03:00 - Optimisation base de données
        $schedule->command('model:prune')
            ->dailyAt('03:00')
            ->timezone('Indian/Antananarivo');

        // ✅ 12. RAPPORT EXPIRATION MENSUEL
        // Le 1er de chaque mois à 10:00 - Rapport détaillé des expirations
        $schedule->command('reports:monthly-expiration')
            ->monthlyOn(1, '10:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/monthly-expiration-report.log'));

        // ===== 🤖 SYSTÈME BUSINESS PLAN IA UNIFIÉ =====

        // ✅ 13. GÉNÉRATION AUTOMATIQUE BUSINESS PLAN (NOUVEAU SYSTÈME UNIFIÉ)
        // Toutes les 5 minutes - Vérifier et traiter les utilisateurs sans business plan généré
        $schedule->command('business-plan:auto-generate')
            ->everyFiveMinutes()
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(4)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/business-plan-auto-generate.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 14. VALIDATION INTÉGRITÉ BUSINESS PLAN (NOUVEAU SYSTÈME UNIFIÉ)
        // Tous les jours à 08:00 - Vérifier l'intégrité des business plans générés
        $schedule->command('business-plan:validate-integrity')
            ->dailyAt('08:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(60)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/business-plan-integrity.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 15. NETTOYAGE HEBDOMADAIRE BUSINESS PLAN (NOUVEAU SYSTÈME)
        // Tous les dimanches à 23:00 - Nettoyer les anciennes données et optimiser
        $schedule->command('business-plan:weekly-cleanup')
            ->weeklyOn(0, '23:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(120)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/business-plan-cleanup.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));

        // ✅ 16. RATTRAPAGE BUSINESS PLAN (NOUVEAU SYSTÈME UNIFIÉ)
        // Tous les jours à 22:00 - Rattraper les utilisateurs manqués
        $schedule->command('business-plan:catchup')
            ->dailyAt('22:00')
            ->timezone('Indian/Antananarivo')
            ->withoutOverlapping(30)
            ->runInBackground()
            ->sendOutputTo(storage_path('logs/business-plan-catchup.log'))
            ->emailOutputOnFailure(env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com'));
    }

    /**
     * ✅ VÉRIFIER SI RATTRAPAGE GÉNÉRATION NÉCESSAIRE
     */
    private function shouldRunCatchupGeneration(): bool
    {
        try {
            // Vérifier si des utilisateurs n'ont pas de posts cette semaine
            $usersWithoutPosts = $this->getUsersWithoutPostsThisWeek();

            if ($usersWithoutPosts > 0) {
                Log::info("🔄 [CATCHUP] {$usersWithoutPosts} utilisateurs sans posts - Rattrapage mardi requis");
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification rattrapage génération", [
                'error' => $e->getMessage()
            ]);
            return true; // En cas d'erreur, mieux vaut essayer
        }
    }

    /**
     * ✅ VÉRIFIER SI RATTRAPAGE FINAL NÉCESSAIRE
     */
    private function shouldRunFinalCatchup(): bool
    {
        try {
            // Dernière chance - si des utilisateurs n'ont toujours rien
            $usersWithoutPosts = $this->getUsersWithoutPostsThisWeek();

            if ($usersWithoutPosts > 0) {
                Log::critical("🚨 [FINAL CATCHUP] {$usersWithoutPosts} utilisateurs ENCORE sans posts - Rattrapage final");
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification rattrapage final", [
                'error' => $e->getMessage()
            ]);
            return true;
        }
    }


    /**
     * ✅ COMPTER UTILISATEURS SANS POSTS CETTE SEMAINE
     */
    private function getUsersWithoutPostsThisWeek(): int
    {
        try {
            $startOfWeek = now()->startOfWeek();
            $endOfWeek = now()->endOfWeek();

            $activeUsers = \App\Models\User::whereHas('featureAccess', function ($query) {
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

            $usersWithPosts = \App\Models\User::whereHas('blogPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                $query->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
            })->orWhereHas('socialMediaPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                $query->where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
            })->count();

            return max(0, $activeUsers - $usersWithPosts);

        } catch (\Exception $e) {
            return 999; // Valeur élevée pour forcer le fallback en cas d'erreur
        }
    }



    /**
     * ✅ VÉRIFIER SI FALLBACK SPRINT NÉCESSAIRE (dimanche soir)
     */
    private function shouldRunSprintFallback(): bool
    {
        try {
            // Vérifier si des utilisateurs avec accès sprint n'ont pas de sprints pour cette semaine
            $currentWeek = now()->weekOfYear;
            $currentYear = now()->year;

            // ✅ NOUVEAU : Compter seulement les utilisateurs avec accès sprint
            $activeUsersWithSprintAccess = \App\Models\User::whereHas('featureAccess', function ($query) {
                $query->whereHas('feature', function ($subQuery) {
                    $subQuery->where('key', 'sprint_planning');
                })
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->where(function($q) {
                    $q->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
                });
            })->whereHas('projects', function ($query) {
                $query->where('status', 'active');
            })->count();

            $usersWithSprints = \App\Models\Sprint::where('week_number', $currentWeek)
                    ->where('year', $currentYear)
                    ->distinct('user_id')
                    ->count('user_id');

            $missingSprintsCount = $activeUsersWithSprintAccess - $usersWithSprints;

            if ($missingSprintsCount > 0) {
                Log::info("🔄 [SPRINT-FALLBACK] {$missingSprintsCount} utilisateurs avec accès sprint sans sprints - Fallback lundi requis", [
                    'users_with_access' => $activeUsersWithSprintAccess,
                    'users_with_sprints' => $usersWithSprints
                ]);
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification fallback sprint", [
                'error' => $e->getMessage()
            ]);
            return true; // En cas d'erreur, mieux vaut essayer
        }
    }

    /**
     * ✅ VÉRIFIER SI FALLBACK SPRINT FINAL NÉCESSAIRE (mardi)
     */
    private function shouldRunSprintFinalFallback(): bool
    {
        try {
            // Dernière chance - si des utilisateurs avec accès sprint n'ont toujours pas de sprints
            $currentWeek = now()->weekOfYear;
            $currentYear = now()->year;

            // ✅ NOUVEAU : Compter seulement les utilisateurs avec accès sprint
            $activeUsersWithSprintAccess = \App\Models\User::whereHas('featureAccess', function ($query) {
                $query->whereHas('feature', function ($subQuery) {
                    $subQuery->where('key', 'sprint_planning');
                })
                ->where('admin_enabled', true)
                ->where('user_activated', true)
                ->where('status', 'active')
                ->where(function($q) {
                    $q->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
                });
            })->whereHas('projects', function ($query) {
                $query->where('status', 'active');
            })->count();

            $usersWithSprints = \App\Models\Sprint::where('week_number', $currentWeek)
                    ->where('year', $currentYear)
                    ->distinct('user_id')
                    ->count('user_id');

            $missingSprintsCount = $activeUsersWithSprintAccess - $usersWithSprints;

            if ($missingSprintsCount > 0) {
                Log::critical("🚨 [SPRINT-FINAL-FALLBACK] {$missingSprintsCount} utilisateurs avec accès sprint ENCORE sans sprints - Rattrapage final", [
                    'users_with_access' => $activeUsersWithSprintAccess,
                    'users_with_sprints' => $usersWithSprints
                ]);
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error("❌ Erreur vérification fallback sprint final", [
                'error' => $e->getMessage()
            ]);
            return true;
        }
    }

    /**
     * ✅ COMMANDES DISPONIBLES
     */
    protected $commands = [
        \App\Console\Commands\GenerateWeeklyPostsCommand::class,
        \App\Console\Commands\GenerateAdminWeeklyPostsCommand::class, // ✅ NOUVEAU : Génération posts admin
        \App\Console\Commands\CatchupWeeklyGenerationCommand::class, // ✅ NOUVEAU : Rattrapage d'urgence
        \App\Console\Commands\CheckExpiredFeatures::class, // ✅ ANCIEN
        \App\Console\Commands\CheckExpiringFeaturesCommand::class, // ✅ NOUVEAU : Alertes expiration (emails + notifications)
        \App\Console\Commands\PublishScheduledPostsCommand::class, // ✅ NOUVEAU : Publication automatique
        \App\Console\Commands\ValidateSocialMediaPostsCommand::class, // ✅ NOUVEAU : Validation posts sociaux
        \App\Console\Commands\ManageProgressiveGenerationCommand::class, // ✅ NOUVEAU : Gestion progressive via jobs
        \App\Console\Commands\FixPostStatusCommand::class, // ✅ NOUVEAU : Correction status des posts
        \App\Console\Commands\FixDuplicateContentCommand::class, // ✅ NOUVEAU : Correction contenu dupliqué
        \App\Console\Commands\PostGuardianCommand::class, // ✅ NOUVEAU : Surveillance et rattrapage automatique
        \App\Console\Commands\GenerateWeeklySprintsCommand::class, // ✅ NOUVEAU : Génération automatique des sprints
        \App\Console\Commands\EmergencyCleanDuplicatesCommand::class, // ✅ URGENCE : Nettoyage doublons
        \App\Console\Commands\ClearOldLogsCommand::class, // ✅ NOUVEAU : Nettoyage automatique logs (évite saturation disque)
        \App\Console\Commands\CheckMissingSocialPosts::class, // ✅ NOUVEAU : Vérification posts sociaux manquants toutes les 5 min
        \App\Console\Commands\CheckMissingBlogPosts::class, // ✅ NOUVEAU : Vérification posts blog manquants toutes les 5 min
        // ✅ RAPPORTS ET MAINTENANCE
        \App\Console\Commands\CleanOldNotificationsCommand::class, // ✅ NOUVEAU : Nettoyage notifications anciennes
        \App\Console\Commands\GenerateWeeklyReportCommand::class, // ✅ NOUVEAU : Rapport hebdomadaire
        \App\Console\Commands\GenerateMonthlyExpirationReportCommand::class, // ✅ NOUVEAU : Rapport mensuel expiration
        // ✅ WORKSPACE LIFECYCLE
        \App\Console\Commands\ProcessWorkspaceExpirations::class, // Rappels essai/abonnement + suspension + overdue invoices
        \App\Console\Commands\ProcessWorkspaceDeletions::class,   // Suppression workspaces en file
        \App\Console\Commands\InitializeWorkspaceTrials::class,   // One-shot : initialise trials utilisateurs existants
    ];
}
