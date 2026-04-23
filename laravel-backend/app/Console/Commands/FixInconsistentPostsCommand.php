<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\Log;

class FixInconsistentPostsCommand extends Command
{
    protected $signature = 'posts:fix-inconsistent';
    protected $description = 'Corriger les posts en statut "scheduled" sans date de publication';

    public function handle()
    {
        $this->info('🔍 Recherche des posts incohérents...');

        // Blog posts
        $inconsistentBlogs = BlogPost::where('status', 'scheduled')
            ->whereNull('published_at')
            ->get();

        $this->info("📝 Blog posts incohérents trouvés: {$inconsistentBlogs->count()}");

        foreach ($inconsistentBlogs as $post) {
            $this->line("  Post ID {$post->id}: {$post->title}");
            $this->line("    Status actuel: scheduled, published_at: NULL");

            // Changer le statut à draft
            $post->status = 'draft';
            $post->save();

            $this->line("    ✅ Corrigé: status = draft");

            Log::info("✅ Post incohérent corrigé", [
                'post_id' => $post->id,
                'title' => $post->title,
                'old_status' => 'scheduled',
                'new_status' => 'draft',
                'user_id' => $post->user_id
            ]);
        }

        // Social media posts
        $inconsistentSocial = SocialMediaPost::where('status', 'scheduled')
            ->whereNull('published_at')
            ->get();

        $this->info("\n📱 Social posts incohérents trouvés: {$inconsistentSocial->count()}");

        foreach ($inconsistentSocial as $post) {
            $this->line("  Post ID {$post->id}: {$post->platform}");
            $this->line("    Status actuel: scheduled, published_at: NULL");

            // Changer le statut à draft
            $post->status = 'draft';
            $post->save();

            $this->line("    ✅ Corrigé: status = draft");

            Log::info("✅ Social post incohérent corrigé", [
                'post_id' => $post->id,
                'platform' => $post->platform,
                'old_status' => 'scheduled',
                'new_status' => 'draft',
                'user_id' => $post->user_id
            ]);
        }

        $total = $inconsistentBlogs->count() + $inconsistentSocial->count();

        $this->newLine();
        $this->info("✅ Total de posts corrigés: {$total}");

        if ($total === 0) {
            $this->comment("ℹ️  Aucun post incohérent trouvé");
        }

        return 0;
    }
}
