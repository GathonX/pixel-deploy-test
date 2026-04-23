<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PublishScheduledPostsCommand extends Command
{
    /**
     * ✅ COMMANDE DE PUBLICATION AUTOMATIQUE DES POSTS PROGRAMMÉS
     */
    protected $signature = 'posts:publish-scheduled 
                            {--dry-run : Afficher les posts à publier sans les publier}
                            {--force : Forcer la publication même si déjà exécuté}';

    protected $description = 'Publie automatiquement tous les posts programmés dont la date de publication est arrivée';

    public function handle()
    {
        $this->info("🚀 Démarrage de la publication automatique des posts programmés");
        
        $isDryRun = $this->option('dry-run');
        $startTime = now();

        try {
            $stats = [
                'blog_posts_published' => 0,
                'social_posts_published' => 0,
                'total_published' => 0,
                'errors' => 0
            ];

            if ($isDryRun) {
                $this->warn("🔍 MODE DRY-RUN : Aucune publication ne sera effectuée");
                $this->showScheduledPosts();
                return Command::SUCCESS;
            }

            DB::beginTransaction();

            // 1. Publier les articles de blog programmés
            $blogStats = $this->publishScheduledBlogPosts();
            $stats['blog_posts_published'] = $blogStats['published'];
            $stats['errors'] += $blogStats['errors'];

            // 2. Publier les posts sociaux programmés  
            $socialStats = $this->publishScheduledSocialPosts();
            $stats['social_posts_published'] = $socialStats['published'];
            $stats['errors'] += $socialStats['errors'];

            $stats['total_published'] = $stats['blog_posts_published'] + $stats['social_posts_published'];

            DB::commit();

            // Afficher les résultats
            $duration = $startTime->diffInSeconds(now());
            
            $this->info("✅ Publication automatique terminée");
            $this->table(['Métrique', 'Valeur'], [
                ['📝 Articles blog publiés', $stats['blog_posts_published']],
                ['📱 Posts sociaux publiés', $stats['social_posts_published']],
                ['📊 Total posts publiés', $stats['total_published']],
                ['❌ Erreurs', $stats['errors']],
                ['⏱️ Durée', "{$duration}s"],
                ['🕒 Heure', now()->format('H:i:s')]
            ]);

            Log::info("✅ Publication automatique terminée", array_merge($stats, [
                'duration_seconds' => $duration,
                'timestamp' => now()->toISOString()
            ]));

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            
            $this->error("❌ Erreur lors de la publication automatique: {$e->getMessage()}");
            
            Log::error("💥 Erreur publication automatique", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ PUBLIER LES ARTICLES DE BLOG PROGRAMMÉS
     */
    private function publishScheduledBlogPosts(): array
    {
        $published = 0;
        $errors = 0;

        try {
            // ✅ NOUVELLE LOGIQUE : Publication basée sur le timezone de chaque utilisateur
            $scheduledPosts = BlogPost::where('status', 'scheduled')
                ->with('user') // Charger les infos utilisateur
                ->get();

            $this->line("📝 Articles blog programmés à analyser: {$scheduledPosts->count()}");

            foreach ($scheduledPosts as $post) {
                try {
                    // ✅ Ignorer les posts sans date de publication
                    if (!$post->published_at) {
                        $this->warn("  ⚠️  Post ID {$post->id} ignoré : pas de date de publication");
                        continue;
                    }

                    // ✅ Calculer l'heure dans le timezone de l'utilisateur
                    $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo'; // Madagascar par défaut
                    $userNow = Carbon::now($userTimezone);
                    $postScheduledDate = $post->published_at->setTimezone($userTimezone);

                    // ✅ Vérifier si c'est l'heure de publier pour CET utilisateur
                    if ($postScheduledDate->lte($userNow)) {
                        $this->line("  🕐 Utilisateur {$post->user->name} ({$userTimezone}): {$userNow->format('H:i')} >= {$postScheduledDate->format('H:i')} ✅");

                        $originalDate = $post->published_at;

                        $post->update([
                            'status' => 'published',
                            'published_at' => Carbon::now() // UTC pour cohérence base de données
                        ]);

                        $this->line("  ✅ Publié: {$post->title} (ID: {$post->id}) - Timezone: {$userTimezone}");

                        Log::info("✅ Article blog publié automatiquement avec timezone", [
                            'post_id' => $post->id,
                            'title' => $post->title,
                            'user_id' => $post->user_id,
                            'user_timezone' => $userTimezone,
                            'user_local_time' => $userNow->format('Y-m-d H:i:s'),
                            'scheduled_for' => $originalDate->format('Y-m-d H:i:s'),
                            'published_at' => Carbon::now()->format('Y-m-d H:i:s')
                        ]);

                        $published++;
                    } else {
                        $this->line("  ⏰ Utilisateur {$post->user->name} ({$userTimezone}): {$userNow->format('H:i')} < {$postScheduledDate->format('H:i')} ⏳");
                    }

                } catch (\Exception $e) {
                    $this->error("  ❌ Erreur post ID {$post->id}: {$e->getMessage()}");
                    $errors++;

                    Log::error("❌ Erreur publication article blog avec timezone", [
                        'post_id' => $post->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }

        } catch (\Exception $e) {
            $this->error("❌ Erreur récupération articles blog: {$e->getMessage()}");
            $errors++;
        }

        return [
            'published' => $published,
            'errors' => $errors
        ];
    }

    /**
     * ✅ PUBLIER LES POSTS SOCIAUX PROGRAMMÉS
     */
    private function publishScheduledSocialPosts(): array
    {
        $published = 0;
        $errors = 0;

        try {
            // ✅ NOUVELLE LOGIQUE : Publication basée sur le timezone de chaque utilisateur
            $scheduledPosts = SocialMediaPost::where('status', 'scheduled')
                ->with('user') // Charger les infos utilisateur
                ->get();

            $this->line("📱 Posts sociaux programmés à analyser: {$scheduledPosts->count()}");

            foreach ($scheduledPosts as $post) {
                try {
                    // ✅ Ignorer les posts sans date de publication
                    if (!$post->published_at) {
                        $this->warn("  ⚠️  Post ID {$post->id} ignoré : pas de date de publication");
                        continue;
                    }

                    // ✅ Calculer l'heure dans le timezone de l'utilisateur
                    $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo'; // Madagascar par défaut
                    $userNow = Carbon::now($userTimezone);
                    $postScheduledDate = $post->published_at->setTimezone($userTimezone);

                    // ✅ Vérifier si c'est l'heure de publier pour CET utilisateur
                    if ($postScheduledDate->lte($userNow)) {
                        $this->line("  🕐 Utilisateur {$post->user->name} ({$userTimezone}): {$userNow->format('H:i')} >= {$postScheduledDate->format('H:i')} ✅");

                        $originalDate = $post->published_at;

                        $post->update([
                            'status' => 'published',
                            'published_at' => Carbon::now() // UTC pour cohérence base de données
                        ]);

                        $this->line("  ✅ Publié: {$post->platform} (ID: {$post->id}) - Timezone: {$userTimezone}");

                        Log::info("✅ Post social publié automatiquement avec timezone", [
                            'post_id' => $post->id,
                            'platform' => $post->platform,
                            'user_id' => $post->user_id,
                            'user_timezone' => $userTimezone,
                            'user_local_time' => $userNow->format('Y-m-d H:i:s'),
                            'scheduled_for' => $originalDate->format('Y-m-d H:i:s'),
                            'published_at' => Carbon::now()->format('Y-m-d H:i:s')
                        ]);

                        $published++;
                    } else {
                        $this->line("  ⏰ Utilisateur {$post->user->name} ({$userTimezone}): {$userNow->format('H:i')} < {$postScheduledDate->format('H:i')} ⏳");
                    }

                } catch (\Exception $e) {
                    $this->error("  ❌ Erreur post ID {$post->id}: {$e->getMessage()}");
                    $errors++;

                    Log::error("❌ Erreur publication post social avec timezone", [
                        'post_id' => $post->id,
                        'platform' => $post->platform,
                        'error' => $e->getMessage()
                    ]);
                }
            }

        } catch (\Exception $e) {
            $this->error("❌ Erreur récupération posts sociaux: {$e->getMessage()}");
            $errors++;
        }

        return [
            'published' => $published,
            'errors' => $errors
        ];
    }

    /**
     * ✅ AFFICHER LES POSTS PROGRAMMÉS (DRY-RUN)
     */
    private function showScheduledPosts(): void
    {
        // ✅ NOUVELLE LOGIQUE : Analyser selon le timezone de chaque utilisateur
        $scheduledBlogPosts = BlogPost::where('status', 'scheduled')
            ->with('user')
            ->get(['id', 'title', 'published_at', 'user_id']);

        // Filtrer les posts prêts selon le timezone utilisateur
        $readyBlogPosts = $scheduledBlogPosts->filter(function($post) {
            $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo';
            $userNow = Carbon::now($userTimezone);
            $postScheduledDate = $post->published_at->setTimezone($userTimezone);
            return $postScheduledDate->lte($userNow);
        });

        if ($readyBlogPosts->count() > 0) {
            $this->info("📝 Articles blog prêts à être publiés:");
            $blogData = $readyBlogPosts->map(function($post) {
                $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo';
                $userNow = Carbon::now($userTimezone);
                $postDate = $post->published_at->setTimezone($userTimezone);

                return [
                    'ID' => $post->id,
                    'Titre' => substr($post->title, 0, 30) . '...',
                    'Programmé' => $postDate->format('Y-m-d H:i'),
                    'Utilisateur' => $post->user->name ?? 'Unknown',
                    'Timezone' => $userTimezone,
                    'Maintenant' => $userNow->format('H:i')
                ];
            })->toArray();

            $this->table(['ID', 'Titre', 'Programmé', 'Utilisateur', 'Timezone', 'Maintenant'], $blogData);
        } else {
            $this->line("📝 Aucun article blog à publier");
        }

        // Afficher TOUS les posts programmés pour debug
        if ($scheduledBlogPosts->count() > 0) {
            $this->info("🔍 TOUS les articles blog programmés (DEBUG):");
            $debugData = $scheduledBlogPosts->map(function($post) {
                $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo';
                $userNow = Carbon::now($userTimezone);
                $postDate = $post->published_at->setTimezone($userTimezone);

                return [
                    'ID' => $post->id,
                    'Titre' => substr($post->title, 0, 25) . '...',
                    'Programmé' => $postDate->format('Y-m-d H:i'),
                    'Maintenant' => $userNow->format('Y-m-d H:i'),
                    'Timezone' => $userTimezone,
                    'Prêt?' => $postDate->lte($userNow) ? '✅ OUI' : '❌ NON'
                ];
            })->toArray();

            $this->table(['ID', 'Titre', 'Programmé', 'Maintenant', 'Timezone', 'Prêt?'], $debugData);
        }

        // Posts sociaux programmés - NOUVELLE LOGIQUE TIMEZONE
        $scheduledSocialPosts = SocialMediaPost::where('status', 'scheduled')
            ->with('user')
            ->get(['id', 'platform', 'published_at', 'user_id']);

        // Filtrer les posts prêts selon le timezone utilisateur
        $readySocialPosts = $scheduledSocialPosts->filter(function($post) {
            $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo';
            $userNow = Carbon::now($userTimezone);
            $postScheduledDate = $post->published_at->setTimezone($userTimezone);
            return $postScheduledDate->lte($userNow);
        });

        if ($readySocialPosts->count() > 0) {
            $this->info("📱 Posts sociaux prêts à être publiés:");
            $socialData = $readySocialPosts->map(function($post) {
                $userTimezone = $post->user->timezone ?? 'Indian/Antananarivo';
                $userNow = Carbon::now($userTimezone);
                $postDate = $post->published_at->setTimezone($userTimezone);

                return [
                    'ID' => $post->id,
                    'Plateforme' => $post->platform,
                    'Programmé' => $postDate->format('Y-m-d H:i'),
                    'Utilisateur' => $post->user->name ?? 'Unknown',
                    'Timezone' => $userTimezone,
                    'Maintenant' => $userNow->format('H:i')
                ];
            })->toArray();

            $this->table(['ID', 'Plateforme', 'Programmé', 'Utilisateur', 'Timezone', 'Maintenant'], $socialData);
        } else {
            $this->line("📱 Aucun post social à publier");
        }

        // Statistiques générales
        $totalScheduled = BlogPost::where('status', 'scheduled')->count() + 
                         SocialMediaPost::where('status', 'scheduled')->count();
        
        $totalReadyToPublish = $readyBlogPosts->count() + $readySocialPosts->count();

        $this->newLine();
        $this->info("📊 Résumé:");
        $this->line("  • Total posts programmés: {$totalScheduled}");
        $this->line("  • Prêts à publier maintenant: {$totalReadyToPublish}");
        $this->line("  • Heure actuelle Madagascar: " . Carbon::now('Indian/Antananarivo')->format('Y-m-d H:i:s'));
    }
}