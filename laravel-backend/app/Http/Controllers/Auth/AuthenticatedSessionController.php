<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkspaceUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;

class AuthenticatedSessionController extends Controller
{
    /**
     * Handle an incoming authentication request.
     */
    public function store(Request $request): JsonResponse
    {
        // 1) Validation basique
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        // 2) On cherche l'utilisateur
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => "Aucun compte n'est associé à cette adresse email."
            ], 404);
        }

        // 3) Vérification du mot de passe
        try {
            if (!Hash::check($request->password, $user->password)) {
                return response()->json([
                    'message' => 'Mot de passe incorrect.'
                ], 422);
            }
        } catch (\Exception $hashError) {
            return response()->json([
                'message' => 'Erreur de vérification mot de passe.',
                'debug' => config('app.debug') ? $hashError->getMessage() : null
            ], 500);
        }

        // 4) ✅ VÉRIFICATION EMAIL VÉRIFIÉ (WORKFLOW SÉCURISÉ)
        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Votre email n\'est pas encore vérifié. Veuillez vérifier votre boîte email.',
                'email_verified' => false,
                'user_id' => $user->id,
                'email' => $user->email,
            ], 403);
        }

        // 5) Login (seulement si email vérifié)
        Auth::login($user, $request->boolean('remember', false));

        // 6) Régénération session sécurisée (seulement si session disponible)
        try {
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
        } catch (\Exception $e) {
            // Pas critique si la régénération échoue
        }

        // 7) Récupérer le rôle workspace pour la restriction d'accès côté frontend.
        // RÈGLE : si l'utilisateur possède au moins un workspace actif, il est traité
        // comme "owner" (accès complet) — peu importe s'il est aussi membre ailleurs.
        // Seuls les utilisateurs sans workspace propre sont restreints comme membre/client.
        $ownsWorkspace = \App\Models\Workspace::where('owner_user_id', $user->id)
            ->whereNotIn('status', ['deleted', 'pending_deletion'])
            ->exists();

        $workspaceMember = null;
        if (!$ownsWorkspace) {
            $workspaceMember = WorkspaceUser::where('user_id', $user->id)
                ->whereIn('role', ['member', 'admin', 'client'])
                ->orderBy('joined_at', 'desc')
                ->first();
        }

        // 8) ✅ SANCTUM SPA : Retour avec informations complètes + is_admin + workspace_role
        return response()->json([
            'message' => 'Connexion réussie.',
            'user' => [
                'id'                  => $user->id,
                'name'                => $user->name,
                'email'               => $user->email,
                'is_admin'            => $user->is_admin,
                'email_verified_at'   => $user->email_verified_at,
                'created_at'          => $user->created_at,
                'updated_at'          => $user->updated_at,
                'workspace_role'      => $workspaceMember?->role,      // null = propriétaire/indépendant
                'workspace_site_id'   => $workspaceMember?->site_id,   // non null = accès restreint au site
            ],
            'authenticated' => true,
            'session_id' => $request->hasSession() ? $request->session()->getId() : null,
        ], 200)->withCookie(cookie('sanctum_authenticated', 'true', 60 * 24, '/', null, false, false, false, 'none'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        try {
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }
        } catch (\Exception $e) {
            // Pas critique si échoue
        }

        return response()->json([
            'message' => 'Déconnexion réussie',
            'authenticated' => false,
        ], 200)->withCookie(cookie('sanctum_authenticated', '', -1, '/', null, false, false, false, 'none'));
    }
}