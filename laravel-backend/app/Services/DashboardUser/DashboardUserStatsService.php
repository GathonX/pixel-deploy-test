<?php

namespace App\Services\DashboardUser;

use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardUserStatsService
{
    /**
     * Générer toutes les statistiques pour le dashboard utilisateur
     */
    public function generateUserDashboardStats(User $user, ?string $siteId = null): array
    {
        return [
            'blog_stats'       => $this->getBlogStats($user, $siteId),
            'social_stats'     => $this->getSocialStats($user, $siteId),
            'engagement_stats' => $this->getEngagementStats($user, $siteId),
            'content_stats'    => $this->getContentStats($user, $siteId),
            'time_stats'       => $this->getTimeStats($user, $siteId),
            'growth_stats'     => $this->getGrowthStats($user, $siteId)
        ];
    }

    /**
     * Statistiques des articles de blog
     */
    private function getBlogStats(User $user, ?string $siteId = null): array
    {
        $blogPosts = $user->blogPosts()->when($siteId, fn($q) => $q->where('site_id', $siteId));

        $totalViews = (clone $blogPosts)->sum('views') ?: 0;
        $totalLikes = (clone $blogPosts)->sum('likes') ?: 0;
        $totalShares = (clone $blogPosts)->sum('shares') ?: 0;
        $totalComments = $this->getTotalBlogComments($user, $siteId);

        $publishedCount = (clone $blogPosts)->where('status', 'published')->count();

        return [
            'total_posts'       => (clone $blogPosts)->count(),
            'published_posts'   => $publishedCount,
            'draft_posts'       => (clone $blogPosts)->where('status', 'draft')->count(),
            'scheduled_posts'   => (clone $blogPosts)->where('status', 'scheduled')->count(),
            'total_views'       => $totalViews,
            'total_likes'       => $totalLikes,
            'total_comments'    => $totalComments,
            'total_shares'      => $totalShares,
            'avg_views_per_post' => $publishedCount > 0 ? round($totalViews / $publishedCount, 1) : 0,
            'avg_reading_time'  => $this->calculateAvgReadingTime($user, $siteId)
        ];
    }

    /**
     * Statistiques des réseaux sociaux
     */
    private function getSocialStats(User $user, ?string $siteId = null): array
    {
        $socialPosts = $user->socialMediaPosts()->when($siteId, fn($q) => $q->where('site_id', $siteId));

        return [
            'total_posts'     => (clone $socialPosts)->count(),
            'published_posts' => (clone $socialPosts)->where('status', 'published')->count(),
            'total_views'     => (clone $socialPosts)->sum('views') ?: 0,
            'total_likes'     => (clone $socialPosts)->sum('likes') ?: 0,
            'total_shares'    => (clone $socialPosts)->sum('shares') ?: 0,
            'platforms'       => $this->getPlatformBreakdown($user, $siteId)
        ];
    }

    /**
     * Statistiques d'engagement globales
     */
    private function getEngagementStats(User $user, ?string $siteId = null): array
    {
        $blogStats = $this->getBlogStats($user, $siteId);
        $socialStats = $this->getSocialStats($user, $siteId);

        $totalViews = $blogStats['total_views'] + $socialStats['total_views'];
        $totalLikes = $blogStats['total_likes'] + $socialStats['total_likes'];
        $totalComments = $blogStats['total_comments'] + $this->getTotalSocialComments($user, $siteId);
        $totalShares = $blogStats['total_shares'] + $socialStats['total_shares'];
        
        $totalEngagement = $totalLikes + $totalComments + $totalShares;
        $engagementRate = $totalViews > 0 ? round(($totalEngagement / $totalViews) * 100, 2) : 0;
        
        return [
            'total_views' => $totalViews,
            'total_likes' => $totalLikes,
            'total_comments' => $totalComments,
            'total_shares' => $totalShares,
            'engagement_rate' => $engagementRate,
            'total_interactions' => $totalEngagement
        ];
    }

    /**
     * Statistiques de contenu
     */
    private function getContentStats(User $user, ?string $siteId = null): array
    {
        $blogPosts   = $user->blogPosts()->when($siteId, fn($q) => $q->where('site_id', $siteId));
        $socialPosts = $user->socialMediaPosts()->when($siteId, fn($q) => $q->where('site_id', $siteId));

        $aiGeneratedBlog   = (clone $blogPosts)->where('is_ai_generated', true)->count();
        $aiGeneratedSocial = (clone $socialPosts)->where('is_ai_generated', true)->count();

        $totalPosts      = (clone $blogPosts)->count() + (clone $socialPosts)->count();
        $totalAiGenerated = $aiGeneratedBlog + $aiGeneratedSocial;
        
        return [
            'total_content_pieces' => $totalPosts,
            'blog_posts' => $blogPosts->count(),
            'social_posts' => $socialPosts->count(),
            'ai_generated_content' => $totalAiGenerated,
            'human_written_content' => $totalPosts - $totalAiGenerated,
            'ai_percentage' => $totalPosts > 0 ? round(($totalAiGenerated / $totalPosts) * 100, 1) : 0
        ];
    }

    /**
     * Statistiques temporelles
     */
    private function getTimeStats(User $user, ?string $siteId = null): array
    {
        $lastWeek  = Carbon::now()->subDays(7);
        $lastMonth = Carbon::now()->subDays(30);

        return [
            'posts_this_week'  => $this->getPostsInPeriod($user, $lastWeek, null, $siteId),
            'posts_this_month' => $this->getPostsInPeriod($user, $lastMonth, null, $siteId),
            'views_this_week'  => $this->getViewsInPeriod($user, $lastWeek, null, $siteId),
            'views_this_month' => $this->getViewsInPeriod($user, $lastMonth, null, $siteId)
        ];
    }

    /**
     * Statistiques de croissance
     */
    private function getGrowthStats(User $user, ?string $siteId = null): array
    {
        $lastWeek     = Carbon::now()->subDays(7);
        $previousWeek = Carbon::now()->subDays(14);

        $currentWeekViews  = $this->getViewsInPeriod($user, $lastWeek, null, $siteId);
        $previousWeekViews = $this->getViewsInPeriod($user, $previousWeek, $lastWeek, $siteId);
        
        $viewsGrowth = $previousWeekViews > 0 ? 
            round((($currentWeekViews - $previousWeekViews) / $previousWeekViews) * 100, 1) : 0;
        
        return [
            'views_growth_percentage' => $viewsGrowth,
            'followers_count' => $user->getFollowersCount(),
            'following_count' => $user->getFollowingCount()
        ];
    }

    /**
     * Calculer le temps de lecture moyen
     */
    private function calculateAvgReadingTime(User $user, ?string $siteId = null): string
    {
        $posts = $user->blogPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->where('status', 'published')->get();
        
        if ($posts->isEmpty()) {
            return '0m 0s';
        }
        
        $totalWords = $posts->sum(function ($post) {
            return str_word_count(strip_tags($post->content));
        });
        
        $avgWords = $totalWords / $posts->count();
        $readingTimeMinutes = ceil($avgWords / 200); // 200 mots par minute
        
        return $readingTimeMinutes . 'm 0s';
    }

    /**
     * Obtenir le total des commentaires blog
     */
    private function getTotalBlogComments(User $user, ?string $siteId = null): int
    {
        $query = DB::table('comments')
            ->join('blog_posts', 'comments.commentable_id', '=', 'blog_posts.id')
            ->where('comments.commentable_type', BlogPost::class)
            ->where('blog_posts.user_id', $user->id);
        if ($siteId) {
            $query->where('blog_posts.site_id', $siteId);
        }
        return $query->count();
    }

    /**
     * Obtenir le total des commentaires réseaux sociaux
     */
    private function getTotalSocialComments(User $user, ?string $siteId = null): int
    {
        $query = DB::table('comments')
            ->join('social_media_posts', 'comments.commentable_id', '=', 'social_media_posts.id')
            ->where('comments.commentable_type', SocialMediaPost::class)
            ->where('social_media_posts.user_id', $user->id);
        if ($siteId) {
            $query->where('social_media_posts.site_id', $siteId);
        }
        return $query->count();
    }

    /**
     * Répartition par plateforme sociale
     */
    private function getPlatformBreakdown(User $user, ?string $siteId = null): array
    {
        return $user->socialMediaPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->select('platform', DB::raw('count(*) as count'))
            ->groupBy('platform')
            ->pluck('count', 'platform')
            ->toArray();
    }

    /**
     * Obtenir les posts dans une période
     */
    private function getPostsInPeriod(User $user, Carbon $startDate, Carbon $endDate = null, ?string $siteId = null): int
    {
        $endDate = $endDate ?: Carbon::now();

        $blogPosts = $user->blogPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $socialPosts = $user->socialMediaPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        return $blogPosts + $socialPosts;
    }

    /**
     * Obtenir les vues dans une période
     */
    private function getViewsInPeriod(User $user, Carbon $startDate, Carbon $endDate = null, ?string $siteId = null): int
    {
        $endDate = $endDate ?: Carbon::now();

        $blogViews = $user->blogPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('views') ?: 0;

        $socialViews = $user->socialMediaPosts()
            ->when($siteId, fn($q) => $q->where('site_id', $siteId))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('views') ?: 0;

        return $blogViews + $socialViews;
    }
}