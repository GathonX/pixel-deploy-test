<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;

class CheckManualPostsCommand extends Command
{
    protected $signature = 'blog:check-manual-posts';
    protected $description = 'Vérifier les posts manuels dans la base';

    public function handle()
    {
        $this->info('=== POSTS MANUELS ===');

        $manualPosts = BlogPost::where('is_ai_generated', false)
            ->orWhereNull('is_ai_generated')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'status', 'published_at', 'is_ai_generated', 'user_id']);

        $this->table(
            ['ID', 'Title', 'Status', 'Published At', 'AI', 'User ID'],
            $manualPosts->map(fn($p) => [
                $p->id,
                substr($p->title, 0, 50),
                $p->status,
                $p->published_at,
                $p->is_ai_generated ? 'OUI' : 'NON',
                $p->user_id
            ])
        );

        $this->info("\n=== POSTS PUBLIÉS ===");

        $publishedPosts = BlogPost::where('status', 'published')
            ->orderBy('published_at', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'status', 'published_at', 'is_ai_generated']);

        $this->table(
            ['ID', 'Title', 'Status', 'Published At', 'AI'],
            $publishedPosts->map(fn($p) => [
                $p->id,
                substr($p->title, 0, 50),
                $p->status,
                $p->published_at,
                $p->is_ai_generated ? 'OUI' : 'NON'
            ])
        );

        return 0;
    }
}
