<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\WorkspaceInvitationMail;
use App\Models\Notification;
use App\Models\User;
use App\Models\UserSite;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class WorkspaceInvitationController extends Controller
{
    /**
     * POST /workspace/invitations
     * Crée une invitation et envoie l'email (utilisateur existant OU nouveau).
     */
    public function store(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $request->validate([
            'name'                => 'required|string|max:150',
            'email'               => 'required|email',
            'role'                => 'nullable|in:admin,member,client',
            'site_id'             => 'nullable|string|exists:user_sites,id',
            'target_workspace_id' => 'nullable|string',
        ]);

        $role              = $request->get('role', 'member');
        $email             = strtolower(trim($request->email));
        $name              = trim($request->name);
        $siteId            = $request->get('site_id');
        $targetWorkspaceId = $request->get('target_workspace_id');

        // Pour le rôle "client" avec un workspace cible différent :
        // l'owner invite le client dans un workspace délégué (W2) depuis son workspace principal (W1)
        if ($role === 'client' && $targetWorkspaceId && $targetWorkspaceId !== $workspace->id) {
            $targetWorkspace = \App\Models\Workspace::where('id', $targetWorkspaceId)
                ->where('owner_user_id', Auth::id())
                ->first();

            if (!$targetWorkspace) {
                return response()->json(['success' => false, 'message' => 'Workspace cible introuvable ou non autorisé.'], 403);
            }

            // Utiliser le workspace cible pour cette invitation
            $workspace = $targetWorkspace;
        }

        // Vérifier que le site appartient bien au workspace
        if ($siteId) {
            $site = UserSite::where('id', $siteId)
                ->where('workspace_id', $workspace->id)
                ->first();
            if (!$site) {
                return response()->json(['success' => false, 'message' => 'Site introuvable dans votre workspace.'], 422);
            }
        }

        // Vérifier si l'utilisateur est déjà membre du workspace
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            $isAlreadyMember = WorkspaceUser::where('workspace_id', $workspace->id)
                ->where('user_id', $existingUser->id)
                ->exists();
            if ($isAlreadyMember) {
                return response()->json(['success' => false, 'message' => 'Cet utilisateur est déjà membre du workspace.'], 422);
            }

            // Un propriétaire de workspace ne peut pas être invité en tant que client
            if ($role === 'client') {
                $isOwner = \App\Models\Workspace::where('owner_user_id', $existingUser->id)->exists();
                if ($isOwner) {
                    return response()->json([
                        'success' => false,
                        'message' => "Cet utilisateur est propriétaire d'un workspace et ne peut pas être invité en tant que client. Seuls les nouveaux utilisateurs ou les membres simples peuvent recevoir un accès client.",
                    ], 422);
                }
            }
        }

        // Pour les invitations client : vérifier que le workspace délégué est bien actif (paiement confirmé)
        if ($role === 'client' && !$workspace->isActive()) {
            return response()->json([
                'success' => false,
                'message' => "Ce workspace n'est pas encore actif. Le paiement doit être validé par l'équipe PixelRise avant de pouvoir inviter le client.",
            ], 422);
        }

        // Les invitations "client" vers un workspace délégué sont libres (quota non vérifié)
        $isClientDelegation = ($role === 'client');

        if (!$isClientDelegation) {
            // Vérifier le quota utilisateurs du plan (membres/admins uniquement)
            $resolver   = app(PlanResolver::class);
            $quotaCheck = $resolver->canAddUser($workspace);

            if (!$quotaCheck['allowed']) {
                // Créer une invitation "en attente de paiement" (sans envoyer l'email)
                WorkspaceInvitation::where('workspace_id', $workspace->id)
                    ->where('email', $email)
                    ->whereIn('status', ['pending', 'awaiting_payment'])
                    ->update(['status' => 'expired']);

                $invitation = WorkspaceInvitation::create([
                    'workspace_id' => $workspace->id,
                    'site_id'      => $siteId,
                    'token'        => Str::random(48),
                    'email'        => $email,
                    'name'         => $name,
                    'role'         => $role,
                    'status'       => 'awaiting_payment',
                    'invited_by'   => Auth::id(),
                    'expires_at'   => now()->addDays(7),
                ]);

                return response()->json([
                    'success'           => false,
                    'reason_code'       => 'USER_QUOTA_EXCEEDED',
                    'message'           => $quotaCheck['message'],
                    'extra_price'       => $quotaCheck['extra_price'],
                    'extra_price_eur'   => $quotaCheck['extra_price_eur'] ?? 3.00,
                    'invitation_token'  => $invitation->token,
                ], 402);
            }
        }

        // Annuler les invitations pending précédentes pour ce même email + workspace
        WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->where('email', $email)
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        // Créer l'invitation
        $invitation = WorkspaceInvitation::create([
            'workspace_id' => $workspace->id,
            'site_id'      => $siteId,
            'token'        => Str::random(48),
            'email'        => $email,
            'name'         => $name,
            'role'         => $role,
            'status'       => 'pending',
            'invited_by'   => Auth::id(),
            'expires_at'   => now()->addDays(7),
        ]);

        $invitation->load(['workspace', 'site', 'inviter']);

        // Envoyer l'email d'invitation
        try {
            Mail::to($email)->send(new WorkspaceInvitationMail($invitation));
        } catch (\Throwable $e) {
            Log::error('WorkspaceInvitation: email erreur', ['error' => $e->getMessage(), 'invitation_id' => $invitation->id]);
        }

        return response()->json([
            'success' => true,
            'message' => "Invitation envoyée à {$email}.",
            'data'    => [
                'id'         => $invitation->id,
                'email'      => $invitation->email,
                'name'       => $invitation->name,
                'role'       => $invitation->role,
                'site_id'    => $invitation->site_id,
                'expires_at' => $invitation->expires_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * GET /invitation/accept/{token}  (route publique)
     * Valide le token et retourne les informations de l'invitation.
     */
    public function validateToken(string $token): JsonResponse
    {
        $invitation = WorkspaceInvitation::where('token', $token)
            ->where('status', 'pending')
            ->with(['workspace', 'site', 'inviter'])
            ->first();

        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation introuvable ou expirée.'], 404);
        }

        if ($invitation->expires_at->isPast()) {
            $invitation->update(['status' => 'expired']);
            return response()->json(['success' => false, 'message' => 'Ce lien d\'invitation a expiré.'], 410);
        }

        // Vérifier si l'email a déjà un compte (l'utilisateur doit utiliser son mdp existant)
        $userAlreadyExists = User::where('email', $invitation->email)->exists();

        return response()->json([
            'success' => true,
            'data'    => [
                'name'           => $invitation->name,
                'email'          => $invitation->email,
                'role'           => $invitation->role,
                'workspace_name' => $invitation->workspace->name,
                'site_name'      => $invitation->site?->name,
                'site_id'        => $invitation->site_id,
                'inviter_name'   => $invitation->inviter->name ?? 'Un administrateur',
                'user_exists'    => $userAlreadyExists,
            ],
        ]);
    }

    /**
     * POST /invitation/accept/{token}  (route publique)
     * Crée le compte (si inexistant) + ajoute au workspace/site.
     */
    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = WorkspaceInvitation::where('token', $token)
            ->where('status', 'pending')
            ->with(['workspace', 'site'])
            ->first();

        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation introuvable ou expirée.'], 404);
        }

        if ($invitation->expires_at->isPast()) {
            $invitation->update(['status' => 'expired']);
            return response()->json(['success' => false, 'message' => 'Ce lien d\'invitation a expiré.'], 410);
        }

        // Vérifier si l'email a déjà un compte
        $existingUser = User::where('email', $invitation->email)->first();

        if ($existingUser) {
            // ── Compte existant : vérifier le mot de passe (PAS de confirmation requise) ──
            $request->validate(['password' => 'required|string']);

            if (!Hash::check($request->password, $existingUser->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Mot de passe incorrect. Veuillez utiliser votre mot de passe PixelRise existant.',
                ], 422);
            }
            $user = $existingUser;
        } else {
            // ── Nouveau compte : créer avec le mot de passe choisi ──
            $request->validate([
                'password'              => 'required|string|min:8|confirmed',
                'password_confirmation' => 'required|string',
            ]);

            $user = User::create([
                'name'              => $invitation->name,
                'email'             => $invitation->email,
                'password'          => Hash::make($request->password),
                'email_verified_at' => now(),
            ]);
        }

        // Ajouter au workspace (si pas déjà membre)
        $existingMember = WorkspaceUser::where('workspace_id', $invitation->workspace_id)
            ->where('user_id', $user->id)
            ->first();

        if (!$existingMember) {
            WorkspaceUser::create([
                'workspace_id' => $invitation->workspace_id,
                'user_id'      => $user->id,
                'role'         => $invitation->role,
                'site_id'      => $invitation->site_id,
                'joined_at'    => now(),
            ]);
        } else {
            // Mettre à jour site_id si l'utilisateur était déjà membre
            $existingMember->update(['site_id' => $invitation->site_id]);
        }

        // Marquer l'invitation comme acceptée
        $invitation->update([
            'status'      => 'accepted',
            'accepted_at' => now(),
        ]);

        // Notification in-app au propriétaire du workspace
        try {
            $workspace = $invitation->workspace;
            Notification::create([
                'user_id'    => $workspace->owner_user_id,
                'type'       => 'workspace_member_joined',
                'priority'   => 'normal',
                'status'     => 'unread',
                'title'      => "Nouveau membre : {$user->name}",
                'message'    => "{$user->name} a accepté votre invitation et rejoint le workspace.",
                'data'       => ['workspace_id' => $workspace->id, 'user_id' => $user->id],
                'href'       => '/workspace/users',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('WorkspaceInvitation: notification erreur', ['error' => $e->getMessage()]);
        }

        // Générer un token d'authentification pour connecter l'user directement
        $authToken = $user->createToken('invitation-accept')->plainTextToken;

        // Déterminer la page de redirection
        $redirectTo = $invitation->site_id
            ? "/dashboard/site/{$invitation->site_id}"
            : '/workspace';

        return response()->json([
            'success'     => true,
            'message'     => 'Invitation acceptée. Bienvenue sur PixelRise !',
            'token'       => $authToken,
            'redirect_to' => $redirectTo,
        ], 201);
    }

    /**
     * GET /workspace/invitations  (protégé)
     * Liste les invitations en cours du workspace.
     */
    public function index(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $invitations = WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->with('site:id,name')
            ->latest()
            ->get()
            ->map(fn($inv) => [
                'id'         => $inv->id,
                'name'       => $inv->name,
                'email'      => $inv->email,
                'role'       => $inv->role,
                'site_name'  => $inv->site?->name,
                'expires_at' => $inv->expires_at->toISOString(),
            ]);

        return response()->json(['success' => true, 'data' => $invitations]);
    }

    /**
     * DELETE /workspace/invitations/{id}  (protégé)
     * Annule une invitation.
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $invitation = WorkspaceInvitation::where('id', $id)
            ->where('workspace_id', $workspace->id)
            ->first();

        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation introuvable.'], 404);
        }

        $invitation->update(['status' => 'expired']);

        return response()->json(['success' => true, 'message' => 'Invitation annulée.']);
    }
}
