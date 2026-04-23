<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserSite;
use App\Models\SocialMediaPost;
use App\Jobs\GenerateActivationPostsJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class CheckMissingSocialPosts extends Command
{
    protected $signature = 'social:check-missing-posts';
    protected $description = 'Vérifier et régénérer les posts sociaux manquants pour les utilisateurs avec un site PRO actif';

    public function handle()
    {
        $this->info('🔍 Vérification des posts sociaux manquants...');

        // Selon OFFER.md : social IA = plan PRO uniquement
        $proSites = UserSite::whereHas('planAssignment', function($q) {
            $q->where('effective_plan_key', 'pro')
              ->where('status', 'active')
              ->where(function($q2) {
                  $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
              });
        })->with('user')->get();

        $processedUserIds = [];

        $this->info("📊 Sites PRO actifs : " . $proSites->count());

        foreach ($proSites as $site) {
            $user = $site->user;
            if (!$user || in_array($user->id, $processedUserIds)) continue;
            $processedUserIds[] = $user->id;

            // Plateformes configurées sur le site ; défaut = toutes les 4
            $enabledPlatforms = $site->social_enabled_platforms ?? ['facebook', 'instagram', 'twitter', 'linkedin'];

            if (empty($enabledPlatforms)) {
                $this->warn("⚠️ User {$user->id} : Aucune plateforme activée, skip");
                continue;
            }

            $this->info("👤 User {$user->id} : {$user->name} — Plateformes : " . implode(', ', $enabledPlatforms));

            $today       = Carbon::now();
            $startOfWeek = $today->copy()->startOfWeek();
            $endOfWeek   = $today->copy()->endOfWeek();

            $firstPost = SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('published_at', [$startOfWeek, $endOfWeek])
                ->orderBy('published_at', 'asc')
                ->first();

            $activationDate = $firstPost
                ? Carbon::parse($firstPost->published_at)->startOfDay()
                : $startOfWeek->copy();

            $daysUntilSunday    = (int) $activationDate->diffInDays($endOfWeek) + 1;
            $expectedTotalPosts = $daysUntilSunday * count($enabledPlatforms);

            $existingPosts = SocialMediaPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('published_at', [$activationDate, $today->copy()->endOfDay()])
                ->whereIn('platform', $enabledPlatforms)
                ->count();

            $missingPosts = max(0, $expectedTotalPosts - $existingPosts);

            $this->info("📊 User {$user->id} : Attendu={$expectedTotalPosts}, Existant={$existingPosts}, Manquant={$missingPosts}");

            if ($missingPosts > 0) {
                $cacheKey = "missing_posts_check_{$user->id}_social_media";

                if (Cache::has($cacheKey)) {
                    $this->warn("⚠️ User {$user->id} : Génération déjà en cours, skip");
                    continue;
                }

                Cache::put($cacheKey, true, now()->addHour());

                Log::info("🔄 [MISSING-SOCIAL] Régénération posts sociaux manquants", [
                    'user_id'          => $user->id,
                    'site_id'          => $site->id,
                    'enabled_platforms' => $enabledPlatforms,
                    'expected_posts'   => $expectedTotalPosts,
                    'existing_posts'   => $existingPosts,
                    'missing_posts'    => $missingPosts,
                ]);

                GenerateActivationPostsJob::dispatch($user, 'social_media', $missingPosts, null, false)
                    ->onQueue('posts');

                $this->info("✅ User {$user->id} : Job dispatché");
            } else {
                $this->info("✅ User {$user->id} : Tous les posts sont présents");
            }
        }

        $this->info('✅ Vérification sociale terminée');
        return 0;
    }
}
