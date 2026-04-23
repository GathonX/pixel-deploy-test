<?php

namespace App\Console\Commands;

use App\Models\BlogPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CleanDuplicateBlogPostsCommand extends Command
{
    /**
     * 🧹 NETTOYAGE : Supprimer les posts de blog avec des dates de publication identiques
     *
     * @var string
     */
    protected $signature = 'posts:clean-duplicates
                            {--user_id= : ID utilisateur spécifique}
                            {--dry-run : Simulation sans suppression réelle}';

    /**
     * @var string
     */
    protected $description = 'Nettoyer les posts de blog ayant la même date de publication pour un même utilisateur';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🧹 Démarrage du nettoyage des posts en double...');
        $isDryRun = $this->option('dry-run');
        $userId = $this->option('user_id');

        if ($isDryRun) {
            $this->warn('⚠️ MODE DRY-RUN : Aucune suppression ne sera effectuée');
        }

        // Construire la requête
        $query = BlogPost::select('user_id', DB::raw('DATE(published_at) as published_date'))
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('GROUP_CONCAT(id ORDER BY id) as ids')
            ->where('is_ai_generated', true)
            ->whereNotNull('published_at')
            ->groupBy('user_id', DB::raw('DATE(published_at)'))
            ->having('count', '>', 1);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $duplicates = $query->get();

        if ($duplicates->isEmpty()) {
            $this->info('✅ Aucun doublon détecté !');
            return 0;
        }

        $this->warn("⚠️ {$duplicates->count()} groupes de doublons détectés");

        $totalDeleted = 0;

        foreach ($duplicates as $duplicate) {
            $ids = explode(',', $duplicate->ids);
            $keepId = array_shift($ids); // Garder le premier (plus ancien)
            $deleteIds = $ids; // Supprimer les autres

            $posts = BlogPost::whereIn('id', array_merge([$keepId], $deleteIds))->get();

            $this->warn("\n📅 Date : {$duplicate->published_date} | User : {$duplicate->user_id}");
            $this->line("   ✅ Garder  : ID {$keepId} - " . $posts->where('id', $keepId)->first()->title);

            foreach ($deleteIds as $deleteId) {
                $post = $posts->where('id', $deleteId)->first();
                $this->line("   ❌ Supprimer : ID {$deleteId} - " . $post->title);

                if (!$isDryRun) {
                    $post->delete();
                    $totalDeleted++;
                    Log::info("🗑️ [CLEAN] Post supprimé", [
                        'id' => $deleteId,
                        'user_id' => $duplicate->user_id,
                        'published_date' => $duplicate->published_date,
                        'title' => $post->title
                    ]);
                }
            }
        }

        if ($isDryRun) {
            $this->info("\n✅ DRY-RUN terminé : {$totalDeleted} posts seraient supprimés");
        } else {
            $this->info("\n✅ Nettoyage terminé : {$totalDeleted} posts supprimés");
        }

        return 0;
    }
}
