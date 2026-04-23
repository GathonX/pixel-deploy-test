<?php

namespace App\Http\Middleware;

use App\Models\UserSite;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\PlanResolver;

class CheckBookingPlan
{
    /**
     * Vérifie que le site a un plan suffisant pour accéder aux fonctionnalités booking.
     *
     * Usage: middleware('booking.plan:starter') ou middleware('booking.plan:pro')
     */
    public function handle(Request $request, Closure $next, string $requiredPlan = 'starter'): Response
    {
        $siteId = $request->route('siteId');

        if (!$siteId) {
            return response()->json(['message' => 'Site ID manquant.'], 400);
        }

        $site = UserSite::with(['planAssignment', 'workspace'])->find($siteId);

        if (!$site) {
            return response()->json(['message' => 'Site introuvable.'], 404);
        }

        // Vérifier que le site appartient bien au workspace de l'utilisateur
        $workspace = $request->attributes->get('workspace');
        if ($workspace && $site->workspace_id !== $workspace->id) {
            return response()->json(['message' => 'Accès refusé à ce site.'], 403);
        }

        $effectivePlan = $this->getEffectivePlan($site);

        if (!$this->hasSufficientPlan($effectivePlan, $requiredPlan)) {
            return response()->json([
                'message' => "Cette fonctionnalité nécessite le plan {$requiredPlan}.",
                'required_plan' => $requiredPlan,
                'current_plan' => $effectivePlan,
                'upgrade_url' => '/workspace/billing',
            ], 403);
        }

        // Injecter le site dans la requête pour les controllers
        $request->attributes->set('booking_site', $site);

        return $next($request);
    }

    private function getEffectivePlan(UserSite $site): string
    {
        // 1. Site-specific booking plan (highest priority)
        if ($site->planAssignment && $site->planAssignment->isActive()) {
            return $site->planAssignment->effective_plan_key;
        }

        // 2. Fallback: derive from workspace subscription plan
        // Any active workspace subscription gives at least starter booking access
        $workspace = $site->workspace;
        if ($workspace) {
            $subscription = (new PlanResolver())->activeSubscription($workspace);
            if ($subscription) {
                $workspacePlan = $subscription->plan_key ?? 'starter';
                // Map workspace plan key to booking plan
                // ENTREPRISE workspace (plan_key='premium') includes up to 5 STARTER sites
                // FREE workspace has no subscription → no implicit booking access
                $workspaceToBooking = [
                    'premium' => 'starter', // ENTREPRISE = 5 starter sites included
                ];
                return $workspaceToBooking[$workspacePlan] ?? 'draft';
            }
        }

        return 'draft';
    }

    private function hasSufficientPlan(string $current, string $required): bool
    {
        $hierarchy = ['draft' => 0, 'starter' => 1, 'pro' => 2, 'premium' => 3];

        $currentLevel = $hierarchy[$current] ?? 0;
        $requiredLevel = $hierarchy[$required] ?? 1;

        return $currentLevel >= $requiredLevel;
    }
}
