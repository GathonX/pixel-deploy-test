<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Jobs\GenerateActivationPostsJob;
use App\Services\ContentGeneration\WeeklyPostGenerationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class RegenerateSocialPostsCommand extends Command
{
    protected $signature = 'posts:regenerate-social 
                            {user : ID utilisateur}';

    protected $description = 'Régénérer les posts social media pour un utilisateur';

    public function handle()
    {
        $userId = $this->argument('user');
        $user = User::find($userId);

        if (!$user) {
            $this->error("❌ Utilisateur #{$userId} introuvable");
            return Command::FAILURE;
        }

        $this->info("🚀 Régénération posts social pour {$user->name} (ID: {$userId})");

        // Récupérer l'access_id pour social_media (NON EXPIRÉ)
        // ✅ SÉCURITÉ CRITIQUE : Vérifier expires_at pour bloquer génération si expiré
        $socialAccess = \App\Models\UserFeatureAccess::whereHas('feature', function($query) {
                $query->where('key', 'social_media');
            })
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where('status', 'active')
            ->where(function($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now()); // ✅ SÉCURITÉ : Non expiré uniquement
            })
            ->first();

        if (!$socialAccess) {
            $this->error("❌ Fonctionnalité social_media non activée ou EXPIRÉE pour cet utilisateur");
            return Command::FAILURE;
        }

        $accessId = $socialAccess->id;
        $this->info("✅ Access ID trouvé: {$accessId}");

        // Calculer le nombre de posts selon le jour (lundi = 7)
        $dayOfWeek = strtolower(Carbon::now()->format('l'));
        $postsCount = $this->getPostsCountByDay($dayOfWeek);

        $this->info("📅 Jour: {$dayOfWeek} - Posts à générer: {$postsCount}");

        // Générer le premier post immédiatement
        $this->info("📱 Génération du post immédiat (facebook)...");
        $weeklyService = app(WeeklyPostGenerationService::class);
        
        $todayResult = $weeklyService->generateTodayPostOnly($user);
        
        if ($todayResult['success']) {
            $socialPosts = $todayResult['data']['social_posts'] ?? [];
            $this->info("✅ Post immédiat généré: " . count($socialPosts) . " post(s)");
        } else {
            $this->error("❌ Échec génération post immédiat");
        }

        // Générer les posts restants (6 pour lundi)
        if ($postsCount > 1) {
            $remainingPosts = $postsCount - 1;
            $this->info("📅 Génération des {$remainingPosts} posts restants...");

            GenerateActivationPostsJob::dispatch($user, 'social_media', $remainingPosts, $accessId)
                ->onQueue('posts');

            $this->info("✅ Job programmé pour {$remainingPosts} posts restants");
        }

        $this->info("");
        $this->info("🎉 Régénération lancée avec succès !");
        $this->info("⏳ Les posts seront générés dans quelques minutes...");

        return Command::SUCCESS;
    }

    private function getPostsCountByDay(string $dayOfWeek): int
    {
        $rules = [
            'sunday' => 1,
            'monday' => 7,
            'tuesday' => 6,
            'wednesday' => 5,
            'thursday' => 4,
            'friday' => 3,
            'saturday' => 2,
        ];

        return $rules[$dayOfWeek] ?? 1;
    }
}
