<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SiteBuilderSetting;
use App\Models\UserSite;
use App\Models\SiteTemplate;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SiteBuilderController extends Controller
{
    /**
     * Statistiques du dashboard
     */
    public function stats(): JsonResponse
    {
        $now = Carbon::now();
        $lastMonth = $now->copy()->subMonth();

        // Sites
        $totalSites = UserSite::count();
        $publishedSites = UserSite::where('status', 'published')->count();
        $sitesLastMonth = UserSite::where('created_at', '<', $lastMonth)->count();
        $sitesTrend = $sitesLastMonth > 0
            ? round((($totalSites - $sitesLastMonth) / $sitesLastMonth) * 100)
            : ($totalSites > 0 ? 100 : 0);

        // Templates
        $activeTemplates = SiteTemplate::where('status', 'active')->count();
        $totalTemplates = SiteTemplate::count();

        // Utilisateurs ayant un site
        $totalUsers = User::count();
        $usersLastMonth = User::where('created_at', '<', $lastMonth)->count();
        $usersTrend = $usersLastMonth > 0
            ? round((($totalUsers - $usersLastMonth) / $usersLastMonth) * 100)
            : ($totalUsers > 0 ? 100 : 0);

        // Sites récents
        $recentSites = UserSite::with('template')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'status' => $site->status,
                'created_at' => $site->created_at,
                'template_name' => $site->template?->name,
            ]);

        // Templates populaires (par nombre de sites)
        $popularTemplates = SiteTemplate::where('status', 'active')
            ->withCount('sites')
            ->orderByDesc('sites_count')
            ->limit(5)
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'category' => $t->category,
                'thumbnail' => $t->thumbnail,
                'version' => $t->version,
                'sites_count' => $t->sites_count,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'total_sites' => $totalSites,
                'published_sites' => $publishedSites,
                'sites_trend' => $sitesTrend,
                'total_users' => $totalUsers,
                'users_trend' => $usersTrend,
                'active_templates' => $activeTemplates,
                'total_templates' => $totalTemplates,
                'published_percent' => $totalSites > 0 ? round(($publishedSites / $totalSites) * 100) : 0,
                'recent_sites' => $recentSites,
                'popular_templates' => $popularTemplates,
            ]
        ]);
    }

    /**
     * Récupérer les paramètres
     */
    public function show(): JsonResponse
    {
        $settings = SiteBuilderSetting::getSettings();

        return response()->json([
            'success' => true,
            'data' => $settings
        ]);
    }

    /**
     * Mettre à jour les paramètres
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'domain_settings' => 'nullable|array',
            'domain_settings.defaultDomain' => 'nullable|string|max:255',
            'domain_settings.allowCustomDomains' => 'nullable|boolean',
            'branding' => 'nullable|array',
            'branding.platformName' => 'nullable|string|max:255',
            'branding.primaryColor' => 'nullable|string|max:20',
            'branding.logoUrl' => 'nullable|string|max:500',
            'limits' => 'nullable|array',
            'limits.maxSitesPerUser' => 'nullable|integer|min:1',
            'limits.maxPagesPerSite' => 'nullable|integer|min:1',
            'limits.maxStorageGB' => 'nullable|integer|min:1',
            'features' => 'nullable|array',
            'features.enableAnalytics' => 'nullable|boolean',
            'features.enableSEO' => 'nullable|boolean',
            'features.enableCustomCode' => 'nullable|boolean',
            'notifications' => 'nullable|array',
            'notifications.emailNotifications' => 'nullable|boolean',
            'notifications.adminAlerts' => 'nullable|boolean',
        ]);

        $settings = SiteBuilderSetting::getSettings();
        $settings->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Paramètres mis à jour',
            'data' => $settings
        ]);
    }
}
