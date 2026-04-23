<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ContentGeneration\AdminPostGenerationService;
use Illuminate\Console\Command;

class TestGeneratePostsCommand extends Command
{
    protected $signature = 'test:generate-posts {user_id}';
    protected $description = 'Test génération posts';

    public function handle(AdminPostGenerationService $service)
    {
        $user = User::findOrFail($this->argument('user_id'));

        $this->info("🚀 Génération pour user {$user->id}...");

        $result = $service->generateWeeklyPostsForAdmin($user);

        if (!$result['success']) {
            $this->error("Erreur: " . $result['error']);
            return 1;
        }

        $posts = $result['data']['posts'];
        $this->info("✅ {count($posts)} posts générés:");

        foreach ($posts as $post) {
            $this->line("  ID:{$post->id} | Date: {$post->published_at->format('Y-m-d')} | {$post->status}");
        }

        return 0;
    }
}
