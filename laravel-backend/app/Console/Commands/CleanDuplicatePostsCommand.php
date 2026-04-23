<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CleanDuplicatePostsCommand extends Command
{
    protected $signature = 'posts:clean-duplicates 
                            {--user= : ID utilisateur spécifique}
                            {--dry-run : Simuler sans supprimer}';

    protected $description = 'Nettoyer les posts en double générés par erreur';

    public function handle()
    {
        $this->info('🧹 Nettoyage des posts en double...');
        
        $dryRun = $this->option('dry-run');
        $userId = $this->option('user');

        if ($dryRun) {
            $this->warn('⚠️ MODE DRY-RUN : Aucune suppression ne sera effectuée');
        }

        // Nettoyer les posts blog
        $blogCleaned = $this->cleanBlogDuplicates($userId, $dryRun);
        
        // Nettoyer les posts social
        $socialCleaned = $this->cleanSocialDuplicates($userId, $dryRun);

        $this->info('');
        $this->info('✅ Nettoyage terminé !');
        $this->table(
            ['Type', 'Posts nettoyés'],
            [
                ['Blog', $blogCleaned],
                ['Social Media', $socialCleaned],
                ['Total', $blogCleaned + $socialCleaned]
            ]
        );

        return Command::SUCCESS;
    }

    private function cleanBlogDuplicates($userId, $dryRun): int
    {
        $this->line('📝 Nettoyage posts blog...');
        
        $query = BlogPost::where('is_ai_generated', true);
        
        if ($userId) {
            $query->where('user_id', $userId);
        }

        $posts = $query->orderBy('created_at', 'desc')->get();
        
        $cleaned = 0;
        $grouped = $posts->groupBy(function($post) {
            return $post->user_id . '_' . Carbon::parse($post->created_at)->format('Y-m-d');
        });

        foreach ($grouped as $key => $dayPosts) {
            if ($dayPosts->count() > 1) {
                // Garder le premier (le plus récent), supprimer les autres
                $toKeep = $dayPosts->first();
                $toDelete = $dayPosts->slice(1);

                foreach ($toDelete as $post) {
                    $this->line("  ❌ Doublon trouvé : Post #{$post->id} (user: {$post->user_id}, date: {$post->created_at})");
                    
                    if (!$dryRun) {
                        $post->delete();
                        $cleaned++;
                    } else {
                        $cleaned++; // Compter quand même en dry-run
                    }
                }
            }
        }

        return $cleaned;
    }

    private function cleanSocialDuplicates($userId, $dryRun): int
    {
        $this->line('📱 Nettoyage posts social media...');
        
        $query = SocialMediaPost::where('is_ai_generated', true);
        
        if ($userId) {
            $query->where('user_id', $userId);
        }

        $posts = $query->orderBy('created_at', 'desc')->get();
        
        $cleaned = 0;
        $grouped = $posts->groupBy(function($post) {
            return $post->user_id . '_' . $post->platform . '_' . Carbon::parse($post->created_at)->format('Y-m-d');
        });

        foreach ($grouped as $key => $dayPosts) {
            if ($dayPosts->count() > 1) {
                // Garder le premier (le plus récent), supprimer les autres
                $toKeep = $dayPosts->first();
                $toDelete = $dayPosts->slice(1);

                foreach ($toDelete as $post) {
                    $this->line("  ❌ Doublon trouvé : Post #{$post->id} (user: {$post->user_id}, platform: {$post->platform}, date: {$post->created_at})");
                    
                    if (!$dryRun) {
                        $post->delete();
                        $cleaned++;
                    } else {
                        $cleaned++; // Compter quand même en dry-run
                    }
                }
            }
        }

        return $cleaned;
    }
}
