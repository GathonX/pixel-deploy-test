<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class EmergencyCleanDuplicatesCommand extends Command
{
    protected $signature = 'posts:emergency-clean
                            {--days=7 : Nettoyer les posts des X derniers jours}
                            {--user= : Nettoyer seulement cet utilisateur}
                            {--dry-run : Simulation sans suppression}';

    protected $description = '🚨 Nettoyage d\'urgence des posts en double générés par la sur-génération';

    public function handle()
    {
        $this->error("🚨 NETTOYAGE D'URGENCE - POSTS EN DOUBLE");
        $this->line("═══════════════════════════════════════════════");

        $daysBack = $this->option('days') ?? 7;
        $userFilter = $this->option('user');
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->warn("🔍 MODE SIMULATION - Aucune suppression réelle");
        }

        $cutoffDate = now()->subDays($daysBack);
        $stats = [
            'blog_duplicates' => 0,
            'social_duplicates' => 0,
            'blog_deleted' => 0,
            'social_deleted' => 0
        ];

        // 1. Nettoyer doublons Blog Posts
        $this->info("📝 Nettoyage des doublons blog posts...");
        $blogStats = $this->cleanBlogDuplicates($cutoffDate, $userFilter, $isDryRun);
        $stats['blog_duplicates'] = $blogStats['found'];
        $stats['blog_deleted'] = $blogStats['deleted'];

        // 2. Nettoyer doublons Social Posts
        $this->info("📱 Nettoyage des doublons social posts...");
        $socialStats = $this->cleanSocialDuplicates($cutoffDate, $userFilter, $isDryRun);
        $stats['social_duplicates'] = $socialStats['found'];
        $stats['social_deleted'] = $socialStats['deleted'];

        // 3. Rapport final
        $this->displayReport($stats, $isDryRun);

        return Command::SUCCESS;
    }

    private function cleanBlogDuplicates(Carbon $cutoffDate, $userFilter, bool $isDryRun): array
    {
        $query = BlogPost::where('is_ai_generated', true)
            ->where('created_at', '>=', $cutoffDate);

        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->orderBy('user_id')
            ->orderBy('created_at')
            ->get();

        $duplicates = [];
        $found = 0;
        $deleted = 0;

        // Grouper par utilisateur et date
        $postsByUserAndDate = $posts->groupBy(function($post) {
            return $post->user_id . '_' . $post->created_at->format('Y-m-d');
        });

        foreach ($postsByUserAndDate as $group => $userPosts) {
            if ($userPosts->count() > 7) { // Plus de 7 posts par jour = anormal
                $this->warn("  🔍 Utilisateur avec {$userPosts->count()} posts le même jour");

                // Garder les 7 premiers, marquer le reste comme doublons
                $toDelete = $userPosts->slice(7);
                $found += $toDelete->count();

                foreach ($toDelete as $duplicate) {
                    $this->line("    ❌ Doublon blog: ID {$duplicate->id} - {$duplicate->title}");

                    if (!$isDryRun) {
                        $duplicate->delete();
                        $deleted++;
                    }
                }
            }
        }

        return ['found' => $found, 'deleted' => $deleted];
    }

    private function cleanSocialDuplicates(Carbon $cutoffDate, $userFilter, bool $isDryRun): array
    {
        $query = SocialMediaPost::where('is_ai_generated', true)
            ->where('created_at', '>=', $cutoffDate);

        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->orderBy('user_id')
            ->orderBy('platform')
            ->orderBy('created_at')
            ->get();

        $found = 0;
        $deleted = 0;

        // Grouper par utilisateur, plateforme et date
        $postsByUserPlatformDate = $posts->groupBy(function($post) {
            return $post->user_id . '_' . $post->platform . '_' . $post->created_at->format('Y-m-d');
        });

        foreach ($postsByUserPlatformDate as $group => $platformPosts) {
            if ($platformPosts->count() > 3) { // Plus de 3 posts par plateforme par jour = anormal
                $this->warn("  🔍 {$platformPosts->count()} posts {$platformPosts->first()->platform} le même jour");

                // Garder les 3 premiers, supprimer le reste
                $toDelete = $platformPosts->slice(3);
                $found += $toDelete->count();

                foreach ($toDelete as $duplicate) {
                    $this->line("    ❌ Doublon social: ID {$duplicate->id} - {$duplicate->platform}");

                    if (!$isDryRun) {
                        $duplicate->delete();
                        $deleted++;
                    }
                }
            }
        }

        return ['found' => $found, 'deleted' => $deleted];
    }

    private function displayReport(array $stats, bool $isDryRun): void
    {
        $this->line("═══════════════════════════════════════════════");
        $this->info("📊 RAPPORT DE NETTOYAGE");

        $this->table([
            'Type', 'Doublons détectés', 'Supprimés'
        ], [
            ['📝 Blog Posts', $stats['blog_duplicates'], $stats['blog_deleted']],
            ['📱 Social Posts', $stats['social_duplicates'], $stats['social_deleted']],
            ['📊 TOTAL',
             $stats['blog_duplicates'] + $stats['social_duplicates'],
             $stats['blog_deleted'] + $stats['social_deleted']
            ]
        ]);

        $totalCleaned = $stats['blog_deleted'] + $stats['social_deleted'];

        if ($isDryRun) {
            $this->warn("🔍 MODE SIMULATION : {$totalCleaned} posts seraient supprimés");
        } elseif ($totalCleaned > 0) {
            $this->info("✅ {$totalCleaned} posts en double supprimés avec succès");
        } else {
            $this->info("✅ Aucun doublon détecté - Système propre");
        }

        Log::info("🧹 Nettoyage d'urgence terminé", $stats);
    }
}