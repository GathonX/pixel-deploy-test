<?php

namespace App\Console\Commands;

use App\Models\BlogPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PublishScheduledAdminPosts extends Command
{
    protected $signature = 'admin:publish-scheduled-posts';
    protected $description = 'Publier automatiquement les posts admin scheduled dont la date est arrivée';

    public function handle()
    {
        $this->info('🚀 Vérification des posts admin à publier...');

        // Récupérer tous les posts scheduled dont la date de publication est <= maintenant
        $postsToPublish = BlogPost::where('status', 'scheduled')
            ->whereNotNull('admin_weekly_objective_id')
            ->where('published_at', '<=', now())
            ->get();

        if ($postsToPublish->isEmpty()) {
            $this->info('ℹ️  Aucun post à publier pour le moment.');
            Log::info('📅 [AUTO-PUBLISH] Aucun post admin à publier');
            return 0;
        }

        $publishedCount = 0;

        foreach ($postsToPublish as $post) {
            try {
                $post->update(['status' => 'published']);
                $publishedCount++;

                Log::info('✅ [AUTO-PUBLISH] Post admin publié automatiquement', [
                    'post_id' => $post->id,
                    'title' => $post->title,
                    'scheduled_date' => $post->published_at->format('Y-m-d H:i:s')
                ]);

                $this->info("✅ Publié: {$post->title}");
            } catch (\Exception $e) {
                Log::error('❌ [AUTO-PUBLISH] Erreur publication post', [
                    'post_id' => $post->id,
                    'error' => $e->getMessage()
                ]);

                $this->error("❌ Erreur: {$post->title}");
            }
        }

        $this->info("🎉 {$publishedCount} post(s) admin publié(s) automatiquement.");
        Log::info('🎉 [AUTO-PUBLISH] Publication automatique terminée', [
            'posts_published' => $publishedCount
        ]);

        return 0;
    }
}
