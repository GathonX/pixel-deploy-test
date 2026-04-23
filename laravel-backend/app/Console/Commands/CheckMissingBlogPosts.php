<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserSite;
use App\Models\BlogPost;
use App\Jobs\GenerateActivationPostsJob;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class CheckMissingBlogPosts extends Command
{
    protected $signature = 'blog:check-missing-posts';
    protected $description = 'Vérifier et régénérer les posts blog manquants pour les utilisateurs avec un site PRO actif';

    public function handle()
    {
        $this->info('🔍 Vérification des posts blog manquants...');

        // Selon OFFER.md : blog IA = plan PRO uniquement
        $proSites = UserSite::whereHas('planAssignment', function($q) {
            $q->where('effective_plan_key', 'pro')
              ->where('status', 'active')
              ->where(function($q2) {
                  $q2->whereNull('ends_at')->orWhere('ends_at', '>', now());
              });
        })->with('user')->get();

        // Un user peut avoir plusieurs sites PRO — dédoublonner par user_id
        $processedUserIds = [];

        $this->info("📊 Sites PRO actifs : " . $proSites->count());

        foreach ($proSites as $site) {
            $user = $site->user;
            if (!$user || in_array($user->id, $processedUserIds)) continue;
            $processedUserIds[] = $user->id;

            $this->info("👤 User {$user->id} : {$user->name}");

            $today       = Carbon::now();
            $startOfWeek = $today->copy()->startOfWeek();
            $endOfWeek   = $today->copy()->endOfWeek();

            // Premier post IA de la semaine (pour déterminer la date de départ)
            $firstPost = BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                ->orderBy('created_at', 'asc')
                ->first();

            $activationDate = $firstPost
                ? Carbon::parse($firstPost->created_at)->startOfDay()
                : $startOfWeek->copy();

            $daysUntilSunday   = (int) $activationDate->diffInDays($endOfWeek) + 1;
            $expectedTotalPosts = $daysUntilSunday;

            $existingPosts = BlogPost::where('user_id', $user->id)
                ->where('is_ai_generated', true)
                ->whereBetween('created_at', [$activationDate, $today->copy()->endOfDay()])
                ->count();

            $missingPosts = max(0, $expectedTotalPosts - $existingPosts);

            $this->info("📊 User {$user->id} : Attendu={$expectedTotalPosts}, Existant={$existingPosts}, Manquant={$missingPosts}");

            if ($missingPosts > 0) {
                $cacheKey = "missing_posts_check_{$user->id}_blog";

                if (Cache::has($cacheKey)) {
                    $this->warn("⚠️ User {$user->id} : Génération déjà en cours, skip");
                    continue;
                }

                Cache::put($cacheKey, true, now()->addHour());

                Log::info("🔄 [MISSING-BLOG] Régénération posts blog manquants", [
                    'user_id'         => $user->id,
                    'site_id'         => $site->id,
                    'expected_posts'  => $expectedTotalPosts,
                    'existing_posts'  => $existingPosts,
                    'missing_posts'   => $missingPosts,
                ]);

                GenerateActivationPostsJob::dispatch($user, 'blog', $missingPosts, null, false)
                    ->onQueue('posts');

                $this->info("✅ User {$user->id} : Job dispatché");
            } else {
                $this->info("✅ User {$user->id} : Tous les posts sont présents");
            }
        }

        $this->info('✅ Vérification blog terminée');
        return 0;
    }
}
