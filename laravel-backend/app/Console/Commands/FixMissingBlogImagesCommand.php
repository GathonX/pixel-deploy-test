<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Services\ContentGeneration\ImageContextService;
use Illuminate\Support\Facades\Log;

class FixMissingBlogImagesCommand extends Command
{
    protected $signature = 'blog:fix-missing-images {--limit=10 : Nombre maximum de posts à traiter}';
    protected $description = 'Répare les images manquantes des posts de blog';

    public function handle(ImageContextService $imageService)
    {
        $this->info('🔍 Recherche des posts sans image...');

        $limit = (int) $this->option('limit');

        $postsWithoutImages = BlogPost::where(function($query) {
            $query->whereNull('header_image')
                  ->orWhere('header_image', '')
                  ->orWhere('header_image', '/placeholder.svg');
        })
        ->limit($limit)
        ->get();

        $count = $postsWithoutImages->count();

        if ($count === 0) {
            $this->info('✅ Aucun post sans image trouvé');
            return 0;
        }

        $this->info("📋 {$count} post(s) sans image trouvé(s)");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        $fixed = 0;
        $fallback = 0;

        foreach ($postsWithoutImages as $post) {
            try {
                $content = $post->title . ' ' . $post->summary . ' ' . strip_tags($post->content);

                $result = $imageService->generateCoherentImage(
                    'technology',
                    $content,
                    [
                        'unique_seed' => $post->id . '_fix_' . time(),
                        'post_type' => 'blog'
                    ]
                );

                if ($result['success'] && !empty($result['image_url'])) {
                    $post->header_image = $result['image_url'];
                    $post->save();
                    $fixed++;

                    Log::info("✅ Image générée pour post #{$post->id}", [
                        'title' => $post->title,
                        'image_url' => substr($result['image_url'], 0, 60)
                    ]);
                } else {
                    // Fallback Unsplash
                    $fallbackUrl = "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed={$post->id}";
                    $post->header_image = $fallbackUrl;
                    $post->save();
                    $fallback++;

                    Log::warning("⚠️ Fallback Unsplash pour post #{$post->id}", [
                        'title' => $post->title
                    ]);
                }

                // Pause pour éviter rate limiting
                usleep(500000); // 0.5 seconde

            } catch (\Exception $e) {
                Log::error("❌ Erreur génération image pour post #{$post->id}", [
                    'error' => $e->getMessage()
                ]);

                // Fallback en cas d'erreur
                $post->header_image = "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=600&fit=crop&auto=format&q=80&seed={$post->id}";
                $post->save();
                $fallback++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✅ Images Pexels générées: {$fixed}");
        $this->info("⚠️  Fallback Unsplash: {$fallback}");
        $this->info("📊 Total traité: {$count}");

        return 0;
    }
}
