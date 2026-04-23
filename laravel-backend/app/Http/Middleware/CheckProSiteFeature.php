<?php

namespace App\Http\Middleware;

use App\Models\SitePlanAssignment;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Vérifie que l'utilisateur a accès aux fonctionnalités Pro (plan site 'pro').
 *
 * Ces fonctionnalités sont réservées au plan site PRO (120 000 Ar/mois) :
 * - Gestion des tâches internes
 * - Export avancé (CSV réservations, leads)
 * - Blog automatique IA
 * - Analytics avancées
 * - Automatisation des tâches
 *
 * Règles de sécurité strictes :
 * - Si la route contient un siteId (ex: /site-builder/sites/{siteId}/tasks),
 *   on vérifie que CE site spécifique a le plan 'pro' actif.
 * - Sinon (routes générales workspace) : vérifier si le workspace est Entreprise
 *   (Analytics multi-sites inclus) OU si l'utilisateur possède au moins un site Pro.
 *
 * IMPORTANT : Le plan workspace 'premium' (Entreprise) ne donne PAS automatiquement
 * les fonctionnalités Pro à chaque site. Les sites inclus ont uniquement les
 * fonctionnalités Starter ('included'). Seul un site avec plan_key='pro' actif
 * accède aux fonctionnalités Pro pour ce site spécifique.
 */
class CheckProSiteFeature
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Si la route contient un siteId → vérification stricte sur CE site
        $routeSiteId = $request->route('siteId') ?? $request->route('id');
        if ($routeSiteId) {
            // S'assurer que ce site appartient à l'utilisateur
            $site = UserSite::with('workspace')
                ->where('id', $routeSiteId)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhereHas('workspace', function ($wq) use ($user) {
                          $wq->where('owner_user_id', $user->id);
                      });
                })
                ->first();

            if (!$site) {
                return response()->json([
                    'success'     => false,
                    'reason_code' => 'SITE_NOT_FOUND',
                    'message'     => 'Site introuvable.',
                ], 404);
            }

            // 1. Site a un plan dédié pro/premium actif → accès direct
            $isProSite = SitePlanAssignment::where('site_id', $routeSiteId)
                ->whereIn('effective_plan_key', ['pro', 'premium'])
                ->where('status', 'active')
                ->exists();

            if ($isProSite) {
                return $next($request);
            }

            // 2. Pas de plan dédié → vérifier si le workspace est en plan 'pro'
            // OFFER.md : workspace 'premium' (ENTREPRISE) inclut uniquement Starter par site
            // Seul workspace 'pro' donne les fonctionnalités Pro à ses sites
            $workspace = $site->workspace;
            if ($workspace) {
                $planResolver = app(\App\Services\PlanResolver::class);
                $sub = $planResolver->activeSubscription($workspace);
                if ($sub?->plan_key === 'pro') {
                    return $next($request);
                }
            }

            return response()->json([
                'success'     => false,
                'reason_code' => 'PRO_REQUIRED',
                'message'     => 'Cette fonctionnalité requiert le plan Pro (120 000 Ar/mois) pour ce site.',
                'upgrade_url' => '/workspace/billing',
            ], 403);
        }

        // Routes générales (sans siteId) : vérifier workspace ou présence d'un site Pro
        $workspace = $this->resolveWorkspace($user, $request);

        if (!$workspace) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'NO_WORKSPACE',
                'message'     => 'Aucun workspace trouvé.',
            ], 403);
        }

        // Workspace Pro ou Entreprise → accès complet aux fonctionnalités Pro
        $planResolver = app(PlanResolver::class);
        $sub          = $planResolver->activeSubscription($workspace);
        $planKey      = $sub?->plan_key ?? 'starter';

        if (in_array($planKey, ['pro', 'premium'])) {
            return $next($request);
        }

        // Sinon : vérifier si l'utilisateur a au moins un site Pro actif dans son workspace
        $siteIds = UserSite::where('workspace_id', $workspace->id)->pluck('id');

        $hasProSite = SitePlanAssignment::whereIn('site_id', $siteIds)
            ->where('effective_plan_key', 'pro')
            ->where('status', 'active')
            ->exists();

        if ($hasProSite) {
            return $next($request);
        }

        return response()->json([
            'success'     => false,
            'reason_code' => 'PRO_REQUIRED',
            'message'     => 'Cette fonctionnalité est disponible avec le plan Pro (120 000 Ar/mois) ou le plan Entreprise.',
            'upgrade_url' => '/workspace/billing',
        ], 403);
    }

    private function resolveWorkspace($user, Request $request): ?Workspace
    {
        $requestedId = $request->header('X-Workspace-Id');

        if ($requestedId) {
            $ws = Workspace::where('id', $requestedId)
                ->where('owner_user_id', $user->id)
                ->first();
            if ($ws) return $ws;

            $membership = WorkspaceUser::where('workspace_id', $requestedId)
                ->where('user_id', $user->id)
                ->first();
            if ($membership) return Workspace::find($requestedId);
        }

        $ws = Workspace::where('owner_user_id', $user->id)
            ->whereNull('delivered_at')
            ->orderBy('id')
            ->first();
        if ($ws) return $ws;

        $membership = WorkspaceUser::where('user_id', $user->id)->first();
        return $membership ? Workspace::find($membership->workspace_id) : null;
    }
}
