<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAiPlanMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Résoudre le workspace
        $workspace = Workspace::where('owner_user_id', $user->id)->first();
        if (!$workspace) {
            $membership = WorkspaceUser::where('user_id', $user->id)->first();
            if ($membership) {
                $workspace = Workspace::find($membership->workspace_id);
            }
        }

        if (!$workspace) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'NO_WORKSPACE',
                'message'     => 'Aucun workspace trouvé.',
            ], 403);
        }

        // Résoudre le plan actif
        $planResolver = app(PlanResolver::class);
        $sub          = $planResolver->activeSubscription($workspace);
        $planKey      = $sub?->plan_key ?? 'starter';

        if (!(PlanResolver::PLAN_AI_ENABLED[$planKey] ?? false)) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'AI_NOT_INCLUDED',
                'plan_key'    => $planKey,
                'message'     => "La génération IA n'est pas incluse dans votre plan " . ucfirst($planKey) . ". Passez au plan Pro ou Premium pour en bénéficier.",
                'upgrade_url' => '/workspace/billing',
            ], 403);
        }

        return $next($request);
    }
}
