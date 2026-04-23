<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\Log;

class FixPostStatusCommand extends Command
{
    /**
     * ✅ COMMANDE : Corriger les status des posts selon leur date
     */
    protected $signature = 'posts:fix-status
                            {--user= : ID utilisateur spécifique}
                            {--type= : Type de posts (blog|social|all)}
                            {--dry-run : Simulation sans modifications réelles}';

    protected $description = 'Corriger les status des posts selon leurs dates (passé/présent = published, futur = scheduled)';

    public function handle()
    {
        $this->info("🔧 Correction des status de posts selon leurs dates");
        $this->line("═══════════════════════════════════════════════════");

        $startTime = now();
        $stats = [
            'blog_corrected' => 0,
            'social_corrected' => 0,
            'already_correct' => 0,
            'total_processed' => 0
        ];

        try {
            $isDryRun = $this->option('dry-run');
            $userFilter = $this->option('user');
            $typeFilter = $this->option('type') ?? 'all';

            if ($isDryRun) {
                $this->warn("🔍 MODE SIMULATION - Aucune modification réelle");
            }

            // Corriger les blog posts
            if ($typeFilter === 'all' || $typeFilter === 'blog') {
                $blogStats = $this->fixBlogPostStatus($userFilter, $isDryRun);
                $stats['blog_corrected'] = $blogStats['corrected'];
                $stats['already_correct'] += $blogStats['already_correct'];
                $stats['total_processed'] += $blogStats['total_processed'];
            }

            // Corriger les social posts
            if ($typeFilter === 'all' || $typeFilter === 'social') {
                $socialStats = $this->fixSocialPostStatus($userFilter, $isDryRun);
                $stats['social_corrected'] = $socialStats['corrected'];
                $stats['already_correct'] += $socialStats['already_correct'];
                $stats['total_processed'] += $socialStats['total_processed'];
            }

            // Afficher les résultats
            $duration = $startTime->diffInSeconds(now());
            $this->displayResults($stats, $duration, $isDryRun);

            Log::info("✅ Correction status posts terminée", array_merge($stats, [
                'duration_seconds' => $duration,
                'dry_run' => $isDryRun,
                'user_filter' => $userFilter,
                'type_filter' => $typeFilter
            ]));

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ ERREUR: {$e->getMessage()}");
            
            Log::error("❌ Erreur correction status posts", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ Corriger status des blog posts
     */
    private function fixBlogPostStatus(?int $userFilter, bool $isDryRun): array
    {
        $query = BlogPost::where('is_ai_generated', true);
        
        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->get();
        
        $stats = ['corrected' => 0, 'already_correct' => 0, 'total_processed' => $posts->count()];

        $this->info("📝 Analyse de {$posts->count()} blog posts...");

        foreach ($posts as $post) {
            $isToday = $post->created_at->isToday();
            $isPast = $post->created_at->isPast();
            $correctStatus = ($isToday || $isPast) ? 'published' : 'scheduled';
            
            if ($post->status !== $correctStatus) {
                $this->line("   🔧 Blog ID {$post->id}: {$post->status} → {$correctStatus} ({$post->created_at})");
                
                if (!$isDryRun) {
                    $post->update(['status' => $correctStatus]);
                }
                
                $stats['corrected']++;
            } else {
                $stats['already_correct']++;
            }
        }

        return $stats;
    }

    /**
     * ✅ Corriger status des social media posts
     */
    private function fixSocialPostStatus(?int $userFilter, bool $isDryRun): array
    {
        $query = SocialMediaPost::where('is_ai_generated', true);
        
        if ($userFilter) {
            $query->where('user_id', $userFilter);
        }

        $posts = $query->get();
        
        $stats = ['corrected' => 0, 'already_correct' => 0, 'total_processed' => $posts->count()];

        $this->info("📱 Analyse de {$posts->count()} social media posts...");

        foreach ($posts as $post) {
            $isToday = $post->created_at->isToday();
            $isPast = $post->created_at->isPast();
            $correctStatus = ($isToday || $isPast) ? 'published' : 'scheduled';
            
            if ($post->status !== $correctStatus) {
                $this->line("   🔧 Social ID {$post->id}: {$post->status} → {$correctStatus} ({$post->created_at})");
                
                if (!$isDryRun) {
                    $post->update(['status' => $correctStatus]);
                }
                
                $stats['corrected']++;
            } else {
                $stats['already_correct']++;
            }
        }

        return $stats;
    }

    /**
     * ✅ Afficher résultats finaux
     */
    private function displayResults(array $stats, int $duration, bool $isDryRun): void
    {
        $this->line("═══════════════════════════════════════════════════");
        $this->info("🏁 CORRECTION STATUS TERMINÉE");

        $this->table([
            'Métrique', 'Valeur'
        ], [
            ['📝 Blog posts corrigés', $stats['blog_corrected']],
            ['📱 Social posts corrigés', $stats['social_corrected']],
            ['✅ Déjà corrects', $stats['already_correct']],
            ['📊 Total traités', $stats['total_processed']],
            ['⏱️ Durée', "{$duration}s"],
            ['🔍 Mode simulation', $isDryRun ? 'Oui' : 'Non'],
        ]);

        $totalCorrected = $stats['blog_corrected'] + $stats['social_corrected'];

        if ($totalCorrected > 0) {
            if ($isDryRun) {
                $this->warn("🔍 {$totalCorrected} posts seraient corrigés en mode réel");
            } else {
                $this->info("✅ {$totalCorrected} posts corrigés avec succès");
            }
        } else {
            $this->info("✅ Tous les posts ont déjà le bon status");
        }
    }
}
