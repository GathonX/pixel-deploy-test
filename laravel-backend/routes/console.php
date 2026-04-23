<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command signature defined by
| the Console Kernel.
|
*/

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Scheduled Tasks - Maintenance Automatique
|--------------------------------------------------------------------------
*/

// ✅ Nettoyage cache génération (hebdomadaire)
Schedule::call(function () {
    $users = \App\Models\User::all();
    $clearedCount = 0;

    foreach ($users as $user) {
        // Nettoyer cache posts restants anciens (plus de 7 jours)
        $blogCacheKey = "remaining_posts_{$user->id}_blog";
        $socialCacheKey = "remaining_posts_{$user->id}_social_media";
        $blogLastGenKey = "last_generation_{$user->id}_blog";
        $socialLastGenKey = "last_generation_{$user->id}_social_media";

        $blogData = \Illuminate\Support\Facades\Cache::get($blogCacheKey);
        $socialData = \Illuminate\Support\Facades\Cache::get($socialCacheKey);

        if ($blogData && isset($blogData['activation_date'])) {
            $activationDate = \Carbon\Carbon::parse($blogData['activation_date']);
            if (now()->diffInDays($activationDate) > 7) {
                \Illuminate\Support\Facades\Cache::forget($blogCacheKey);
                \Illuminate\Support\Facades\Cache::forget($blogLastGenKey);
                $clearedCount++;
            }
        }

        if ($socialData && isset($socialData['activation_date'])) {
            $activationDate = \Carbon\Carbon::parse($socialData['activation_date']);
            if (now()->diffInDays($activationDate) > 7) {
                \Illuminate\Support\Facades\Cache::forget($socialCacheKey);
                \Illuminate\Support\Facades\Cache::forget($socialLastGenKey);
                $clearedCount++;
            }
        }
    }

    \Illuminate\Support\Facades\Log::info('🧹 Nettoyage automatique cache génération', [
        'cache_cleared' => $clearedCount
    ]);
})->weekly()
  ->sundays()
  ->at('02:00')
  ->name('cleanup-generation-cache');

// ✅ Reset hebdomadaire (chaque lundi matin)
Schedule::call(function () {
    // Nettoyer les caches de génération pour permettre nouvelle semaine
    $users = \App\Models\User::whereNotNull('email_verified_at')->get();
    $resetCount = 0;

    foreach ($users as $user) {
        $hasBlog = $user->hasFeatureAccess('blog');
        $hasSocial = $user->hasFeatureAccess('social_media');

        if ($hasBlog || $hasSocial) {
            // Reset pour nouvelle semaine seulement si posts restants = 0
            $blogCache = \Illuminate\Support\Facades\Cache::get("remaining_posts_{$user->id}_blog");
            $socialCache = \Illuminate\Support\Facades\Cache::get("remaining_posts_{$user->id}_social_media");

            $blogCompleted = !$blogCache || ($blogCache['posts_remaining'] ?? 0) <= 0;
            $socialCompleted = !$socialCache || ($socialCache['posts_remaining'] ?? 0) <= 0;

            if ($blogCompleted && $socialCompleted) {
                // Semaine terminée, nettoyer pour permettre nouvelle génération
                \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$user->id}_blog");
                \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$user->id}_social_media");
                \Illuminate\Support\Facades\Cache::forget("last_generation_{$user->id}_blog");
                \Illuminate\Support\Facades\Cache::forget("last_generation_{$user->id}_social_media");
                $resetCount++;
            }
        }
    }

    if ($resetCount > 0) {
        \Illuminate\Support\Facades\Log::info('📅 Reset hebdomadaire automatique', [
            'users_reset' => $resetCount
        ]);
    }
})->weekly()
  ->mondays()
  ->at('00:01')
  ->name('weekly-auto-reset')
  ->withoutOverlapping();

// ✅ Nettoyage logs anciens
Schedule::command('log:clear --days=30')
    ->weekly()
    ->sundays()
    ->at('03:00');

/*
|--------------------------------------------------------------------------
| TÂCHES AUTOMATIQUES PRINCIPALES - SYSTÈME DE GÉNÉRATION
|--------------------------------------------------------------------------
*/

// ✅ PUBLICATION AUTOMATIQUE DES POSTS PROGRAMMÉS
// Tous les jours à 08:00 - Publier les posts dont la date est arrivée
Schedule::command('posts:publish-scheduled')
    ->dailyAt('08:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping(30)
    ->runInBackground()
    ->name('auto-publish-morning');

// ✅ PUBLICATION DE SÉCURITÉ (MIDI)
// Tous les jours à 12:00 - Rattrapage au cas où publication du matin a échoué
Schedule::command('posts:publish-scheduled')
    ->dailyAt('12:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping(15)
    ->runInBackground()
    ->name('auto-publish-noon');

// ✅ GÉNÉRATION HEBDOMADAIRE AUTOMATIQUE
// Chaque lundi à 06:00 - Nouvelle semaine = nouveaux posts
Schedule::command('posts:generate-weekly')
    ->weeklyOn(1, '06:00') // Lundi 6h du matin
    ->timezone('Europe/Paris')
    ->withoutOverlapping(240) // Éviter les doublons (4h max)
    ->runInBackground()
    ->name('weekly-generation');

// ✅ GÉNÉRATION ADMIN HEBDOMADAIRE AUTOMATIQUE
// Chaque lundi à 06:30 - Objectif + 7 posts pour tous les admins
Schedule::command('admin:generate-weekly-content')
    ->weeklyOn(1, '06:30') // Lundi 6h30 du matin
    ->timezone('Europe/Paris')
    ->withoutOverlapping(240) // Éviter les doublons (4h max)
    ->runInBackground()
    ->name('admin-weekly-generation');

// ✅ GÉNÉRATION DE RATTRAPAGE (si échec du lundi)
// Chaque mardi à 08:00 - Pour rattraper les échecs du lundi
Schedule::command('posts:generate-weekly --force')
    ->weeklyOn(2, '08:00') // Mardi 8h du matin
    ->timezone('Europe/Paris')
    ->withoutOverlapping(120)
    ->runInBackground()
    ->name('weekly-generation-catchup');

// ✅ VÉRIFICATION QUOTIDIENNE DES EXPIRATIONS (features)
// Tous les jours à 09:00 - Vérifier et notifier les expirations
Schedule::command('features:check-expired --send-notifications')
    ->dailyAt('09:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping(60)
    ->runInBackground()
    ->name('daily-expiration-check');

// ✅ RAPPELS URGENTS EN SOIRÉE (features)
// Tous les jours à 18:00 - Rappels pour expirations imminentes (1-3 jours)
Schedule::command('features:check-expired --send-notifications')
    ->dailyAt('18:00')
    ->timezone('Europe/Paris')
    ->withoutOverlapping(30)
    ->runInBackground()
    ->name('evening-expiration-reminders');

/*
|--------------------------------------------------------------------------
| LIFECYCLE WORKSPACE — Expirations, Suspensions, Suppressions
|--------------------------------------------------------------------------
*/

// Rappels avant expiration (J-15, J-7, J-3, J-1) + suspension J0 + overdue invoices
Schedule::command('workspace:process-expirations')
    ->dailyAt('07:00')
    ->timezone('Indian/Antananarivo')
    ->withoutOverlapping(30)
    ->runInBackground()
    ->name('workspace-expiration-lifecycle');

// Dernier avis (J+7) + suppression définitive (J+30)
Schedule::command('workspace:process-deletions')
    ->dailyAt('07:30')
    ->timezone('Indian/Antananarivo')
    ->withoutOverlapping(30)
    ->runInBackground()
    ->name('workspace-deletion-lifecycle');

/*
|--------------------------------------------------------------------------
| Commandes de maintenance uniquement
|--------------------------------------------------------------------------
*/

// ✅ Statut système (monitoring)
Artisan::command('system:generation-status', function () {
    $this->info('📊 STATUT SYSTÈME GÉNÉRATION AUTOMATIQUE');
    $this->line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Posts dans la base
    $totalBlogs = \App\Models\BlogPost::count();
    $totalSocial = \App\Models\SocialMediaPost::count();
    $scheduledBlogs = \App\Models\BlogPost::where('status', 'scheduled')->count();
    $scheduledSocial = \App\Models\SocialMediaPost::where('status', 'scheduled')->count();
    $publishedToday = \App\Models\BlogPost::whereDate('published_at', today())->count() +
                     \App\Models\SocialMediaPost::whereDate('published_at', today())->count();

    // Utilisateurs avec fonctionnalités actives
    $blogUsers = \App\Models\UserFeatureAccess::where('admin_enabled', true)
        ->where('user_activated', true)
        ->whereHas('feature', function($q) { $q->where('key', 'blog'); })
        ->count();
    $socialUsers = \App\Models\UserFeatureAccess::where('admin_enabled', true)
        ->where('user_activated', true)
        ->whereHas('feature', function($q) { $q->where('key', 'social_media'); })
        ->count();

    // Générations en cours
    $users = \App\Models\User::all();
    $pendingBlog = 0;
    $pendingSocial = 0;
    $activeGenerations = 0;

    foreach ($users as $user) {
        $blogCache = \Illuminate\Support\Facades\Cache::get("remaining_posts_{$user->id}_blog");
        $socialCache = \Illuminate\Support\Facades\Cache::get("remaining_posts_{$user->id}_social_media");

        if ($blogCache && ($blogCache['posts_remaining'] ?? 0) > 0) {
            $pendingBlog += $blogCache['posts_remaining'];
            $activeGenerations++;
        }

        if ($socialCache && ($socialCache['posts_remaining'] ?? 0) > 0) {
            $pendingSocial += $socialCache['posts_remaining'];
            if (!$blogCache) $activeGenerations++; // Éviter double comptage
        }
    }

    $this->table([
        'Métrique',
        'Valeur',
        'Statut'
    ], [
        ['📝 Total posts Blog', $totalBlogs, '📈 Données'],
        ['📱 Total posts Social', $totalSocial, '📈 Données'],
        ['📅 Posts programmés Blog', $scheduledBlogs, $scheduledBlogs > 0 ? '⏳ En attente' : '✅ Aucun'],
        ['📅 Posts programmés Social', $scheduledSocial, $scheduledSocial > 0 ? '⏳ En attente' : '✅ Aucun'],
        ['🎉 Posts publiés aujourd\'hui', $publishedToday, $publishedToday > 0 ? '✅ Actif' : '💤 Calme'],
        ['👥 Utilisateurs Blog actifs', $blogUsers, '🎯 Avec accès'],
        ['👥 Utilisateurs Social actifs', $socialUsers, '🎯 Avec accès'],
        ['🔄 Générations en cours', $activeGenerations, $activeGenerations > 0 ? '⚡ Actif' : '✅ Repos'],
        ['⏳ Posts Blog en attente', $pendingBlog, $pendingBlog > 0 ? '🎯 À générer' : '✅ Complet'],
        ['⏳ Posts Social en attente', $pendingSocial, $pendingSocial > 0 ? '🎯 À générer' : '✅ Complet']
    ]);

    $this->newLine();
    $this->info('ℹ️  Système entièrement automatique via interface utilisateur');
    $this->info('ℹ️  Génération déclenchée lors de l\'activation des fonctionnalités');
    $this->info('ℹ️  Posts progressifs générés toutes les 10-15 minutes via API');

})->purpose('Afficher le statut du système de génération automatique');

// ✅ Nettoyage cache manuel (maintenance)
Artisan::command('cache:clear-generation {user_id?}', function (int $userId = null) {
    if ($userId) {
        $user = \App\Models\User::find($userId);
        if (!$user) {
            $this->error("❌ Utilisateur {$userId} introuvable");
            return self::FAILURE;
        }

        // Nettoyer cache pour cet utilisateur
        \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$userId}_blog");
        \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$userId}_social_media");
        \Illuminate\Support\Facades\Cache::forget("last_generation_{$userId}_blog");
        \Illuminate\Support\Facades\Cache::forget("last_generation_{$userId}_social_media");

        $this->info("✅ Cache génération vidé pour utilisateur #{$userId}");
        $this->warn("⚠️  L'utilisateur devra réactiver ses fonctionnalités pour relancer la génération");

    } else {
        // Nettoyer tout le cache génération
        $users = \App\Models\User::all();
        $clearedCount = 0;

        foreach ($users as $user) {
            \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$user->id}_blog");
            \Illuminate\Support\Facades\Cache::forget("remaining_posts_{$user->id}_social_media");
            \Illuminate\Support\Facades\Cache::forget("last_generation_{$user->id}_blog");
            \Illuminate\Support\Facades\Cache::forget("last_generation_{$user->id}_social_media");

            $clearedCount++;
        }

        $this->info("✅ Cache génération vidé pour {$clearedCount} utilisateurs");
        $this->warn("⚠️  Tous les utilisateurs devront réactiver leurs fonctionnalités");
    }

    return self::SUCCESS;

})->purpose('Nettoyer le cache de génération (maintenance technique uniquement)');

// ✅ Test publication immédiate (développement)
Artisan::command('posts:test-publish', function () {
    $this->info('🧪 TEST DE PUBLICATION IMMÉDIATE');
    $this->line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Compter les posts programmés prêts à être publiés
    $now = \Carbon\Carbon::now();
    
    $blogPostsReady = \App\Models\BlogPost::where('status', 'scheduled')
        ->where('published_at', '<=', $now)
        ->count();
        
    $socialPostsReady = \App\Models\SocialMediaPost::where('status', 'scheduled')
        ->where('published_at', '<=', $now)
        ->count();

    $totalReady = $blogPostsReady + $socialPostsReady;

    $this->table(['Type', 'Posts prêts'], [
        ['📝 Articles blog', $blogPostsReady],
        ['📱 Posts sociaux', $socialPostsReady],
        ['📊 Total', $totalReady]
    ]);

    if ($totalReady > 0) {
        if ($this->confirm("Voulez-vous publier ces {$totalReady} posts maintenant ?")) {
            $this->call('posts:publish-scheduled');
        } else {
            $this->info('Publication annulée');
        }
    } else {
        $this->info('✅ Aucun post programmé prêt à être publié');
    }

    return self::SUCCESS;

})->purpose('Test manuel de la publication automatique');

// ✅ Statistiques rapides
Artisan::command('stats:generation', function () {
    $this->info('📈 STATISTIQUES GÉNÉRATION');
    $this->line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    $today = now();
    $thisWeek = $today->copy()->startOfWeek();
    $thisMonth = $today->copy()->startOfMonth();

    $postsToday = \App\Models\BlogPost::whereDate('created_at', $today)->count() +
                  \App\Models\SocialMediaPost::whereDate('created_at', $today)->count();

    $postsThisWeek = \App\Models\BlogPost::where('created_at', '>=', $thisWeek)->count() +
                     \App\Models\SocialMediaPost::where('created_at', '>=', $thisWeek)->count();

    $postsThisMonth = \App\Models\BlogPost::where('created_at', '>=', $thisMonth)->count() +
                      \App\Models\SocialMediaPost::where('created_at', '>=', $thisMonth)->count();

    $this->table(['Période', 'Posts Générés'], [
        ['Aujourd\'hui', $postsToday],
        ['Cette semaine', $postsThisWeek],
        ['Ce mois', $postsThisMonth]
    ]);

    return self::SUCCESS;

})->purpose('Statistiques rapides de génération');
