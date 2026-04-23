<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use App\Models\WorkspaceUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WorkspaceActiveMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        $workspace = null;

        // Sélection explicite via header X-Workspace-Id (sélecteur multi-workspace)
        $requestedId = $request->header('X-Workspace-Id');
        if ($requestedId) {
            // L'utilisateur possède ce workspace (non livré) ?
            $owned = Workspace::where('id', $requestedId)
                ->where('owner_user_id', $user->id)
                ->whereNull('delivered_at')
                ->first();

            if ($owned) {
                $workspace = $owned;
            } else {
                // Sinon : membre/admin/client de ce workspace ?
                $membership = WorkspaceUser::where('workspace_id', $requestedId)
                    ->where('user_id', $user->id)
                    ->first();
                if ($membership) {
                    $workspace = Workspace::find($requestedId);
                }
            }
        }

        if (!$workspace) {
            // Owner first — ignorer les workspaces livrés (delivered) sauf si réinvité dessus
            $workspace = Workspace::where('owner_user_id', $user->id)
                ->whereNull('delivered_at')   // workspace actif non livré
                ->orderBy('id')
                ->first();
        }

        if (!$workspace) {
            // Pas de workspace actif en propre → chercher une entrée workspace_users
            // (membre, admin, client, ou propriétaire réinvité sur un workspace livré)
            $membership = WorkspaceUser::where('user_id', $user->id)->first();
            if ($membership) {
                $workspace = Workspace::find($membership->workspace_id);
            }
        }

        if (!$workspace) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'NO_WORKSPACE',
                'message'     => 'Aucun workspace trouvé pour ce compte.',
            ], 403);
        }

        // Statuts bloquants
        if (in_array($workspace->status, ['suspended', 'pending_deletion', 'deleted'])) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'WORKSPACE_SUSPENDED',
                'message'     => 'Nous sommes ravis de vous revoir ! Pour réactiver votre compte, veuillez cliquer sur "Je me réabonne".',
            ], 403);
        }

        // Injecter le workspace dans la requête pour les controllers
        $request->attributes->set('workspace', $workspace);

        return $next($request);
    }
}
