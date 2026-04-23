<?php

namespace App\Console\Commands;

use App\Models\UserSite;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Commande one-shot : attribue le contenu existant (blog_posts, social_media_posts,
 * tasks, reservations) au site publié de chaque user.
 *
 * Usage : php artisan site:migrate-content [--dry-run]
 */
class MigrateContentToSites extends Command
{
    protected $signature = 'site:migrate-content {--dry-run : Simuler sans modifier la base}';
    protected $description = 'Attribue le contenu existant (blogs, social, tasks, reservations) au site publié de chaque utilisateur.';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');
        $this->info('🔄 Migration du contenu vers les sites' . ($isDryRun ? ' [DRY-RUN]' : ''));

        $stats = ['blog' => 0, 'social' => 0, 'tasks' => 0, 'reservations' => 0, 'users_skipped' => 0];

        // Récupérer tous les users qui ont au moins un site publié
        $publishedSites = UserSite::where('status', 'published')
            ->orderBy('created_at') // le plus ancien en premier
            ->get()
            ->groupBy('user_id'); // grouper par user

        if ($publishedSites->isEmpty()) {
            $this->warn('Aucun site publié trouvé — rien à migrer.');
            return Command::SUCCESS;
        }

        foreach ($publishedSites as $userId => $sites) {
            // Prendre le site publié (s'il y en a plusieurs, prendre le plus ancien)
            $primarySite = $sites->first();
            $siteId = $primarySite->id;

            $this->line("  User #{$userId} → site {$siteId} ({$primarySite->name})");

            if (!$isDryRun) {
                // Blog posts
                $countBlog = DB::table('blog_posts')
                    ->where('user_id', $userId)
                    ->whereNull('site_id')
                    ->update(['site_id' => $siteId]);
                $stats['blog'] += $countBlog;

                // Social media posts
                $countSocial = DB::table('social_media_posts')
                    ->where('user_id', $userId)
                    ->whereNull('site_id')
                    ->update(['site_id' => $siteId]);
                $stats['social'] += $countSocial;

                // Tasks
                $countTasks = DB::table('tasks')
                    ->where('user_id', $userId)
                    ->whereNull('site_id')
                    ->update(['site_id' => $siteId]);
                $stats['tasks'] += $countTasks;

                // Reservations : client_id = user_id (string)
                $countRes = DB::table('reservations')
                    ->where('client_id', (string) $userId)
                    ->whereNull('site_id')
                    ->update(['site_id' => $siteId]);
                $stats['reservations'] += $countRes;

                $this->line("    ✅ Blog:{$countBlog} Social:{$countSocial} Tasks:{$countTasks} Résa:{$countRes}");
            } else {
                $countBlog   = DB::table('blog_posts')->where('user_id', $userId)->whereNull('site_id')->count();
                $countSocial = DB::table('social_media_posts')->where('user_id', $userId)->whereNull('site_id')->count();
                $countTasks  = DB::table('tasks')->where('user_id', $userId)->whereNull('site_id')->count();
                $countRes    = DB::table('reservations')->where('client_id', (string) $userId)->whereNull('site_id')->count();
                $this->line("    [DRY] Blog:{$countBlog} Social:{$countSocial} Tasks:{$countTasks} Résa:{$countRes}");
            }
        }

        $this->newLine();
        $this->table(
            ['Table', 'Enregistrements migrés'],
            [
                ['blog_posts',          $stats['blog']],
                ['social_media_posts',  $stats['social']],
                ['tasks',               $stats['tasks']],
                ['reservations',        $stats['reservations']],
            ]
        );

        if (!$isDryRun) {
            Log::info('site:migrate-content terminé', $stats);
        }

        $this->info($isDryRun ? '✅ Simulation terminée (aucune modification).' : '✅ Migration terminée.');
        return Command::SUCCESS;
    }
}
