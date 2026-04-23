<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\UserFeatureAccess;

class CheckPostAccessCommand extends Command
{
    protected $signature = 'blog:check-post-access {post_id}';
    protected $description = 'Vérifier l\'access_id d\'un post';

    public function handle()
    {
        $postId = $this->argument('post_id');

        $post = BlogPost::find($postId);

        if (!$post) {
            $this->error("Post ID {$postId} introuvable");
            return 1;
        }

        $this->info("=== POST ID {$postId} ===");
        $this->line("Titre: {$post->title}");
        $this->line("User ID: {$post->user_id}");
        $this->line("Status: {$post->status}");
        $this->line("user_feature_access_id: " . ($post->user_feature_access_id ?? 'NULL'));

        $this->newLine();
        $this->info("=== ACCESS ACTIF POUR USER {$post->user_id} ===");

        $access = UserFeatureAccess::where('user_id', $post->user_id)
            ->whereHas('feature', function($q) {
                $q->where('key', 'blog');
            })
            ->where('status', 'active')
            ->with('feature')
            ->first();

        if ($access) {
            $this->line("Access ID: {$access->id}");
            $this->line("Feature: " . ($access->feature ? $access->feature->name : 'N/A'));
            $this->line("Status: {$access->status}");

            if ($post->user_feature_access_id != $access->id) {
                $this->warn("\n⚠️  PROBLÈME: Le post a access_id = " . ($post->user_feature_access_id ?? 'NULL') . " mais l'access actif est {$access->id}");
                $this->line("\nCorrection automatique...");

                $post->user_feature_access_id = $access->id;
                $post->save();

                $this->info("✅ Corrigé: user_feature_access_id = {$access->id}");
            } else {
                $this->info("\n✅ L'access_id est correct");
            }
        } else {
            $this->error("Aucun access actif trouvé pour user {$post->user_id}");
        }

        return 0;
    }
}
