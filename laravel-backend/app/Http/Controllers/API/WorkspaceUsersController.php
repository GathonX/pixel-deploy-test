<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class WorkspaceUsersController extends Controller
{
    /**
     * GET /workspace/users — Liste les membres du workspace
     */
    public function index(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $members = WorkspaceUser::where('workspace_id', $workspace->id)
            ->with('user:id,name,email')
            ->orderByRaw("FIELD(role, 'owner', 'admin', 'member', 'client')")
            ->get()
            ->map(fn($m) => [
                'id'           => $m->user_id,
                'name'         => $m->user->name,
                'email'        => $m->user->email,
                'role'         => $m->role,
                'joined_at'    => $m->joined_at?->toDateString(),
                'is_owner'     => $m->isOwner(),
                'is_client'    => $m->isClient(),
                'has_data_pin' => $m->hasDataPin(),
            ]);

        return response()->json(['success' => true, 'data' => $members]);
    }

    /**
     * POST /workspace/users/invite — Invite un utilisateur existant par email
     */
    public function invite(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $request->validate([
            'email' => 'required|email',
            'role'  => 'nullable|in:admin,member',
        ]);

        $invitedUser = User::where('email', $request->email)->first();

        if (!$invitedUser) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun compte PixelRise trouvé avec cet email.',
            ], 404);
        }

        if ($invitedUser->id === $workspace->owner_user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Ce compte est déjà propriétaire du workspace.',
            ], 422);
        }

        $existing = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $invitedUser->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Cet utilisateur est déjà membre du workspace.',
            ], 422);
        }

        // Vérifier le quota utilisateurs selon le plan workspace
        $quotaCheck = app(PlanResolver::class)->canAddUser($workspace);
        if (!$quotaCheck['allowed']) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'USER_QUOTA_EXCEEDED',
                'message'     => $quotaCheck['message'] ?? 'Limite d\'utilisateurs atteinte pour votre plan. Passez à un plan supérieur.',
                'upgrade_url' => '/workspace/billing',
            ], 403);
        }

        $role = $request->get('role', 'member');

        WorkspaceUser::create([
            'workspace_id' => $workspace->id,
            'user_id'      => $invitedUser->id,
            'role'         => $role,
            'joined_at'    => now(),
        ]);

        // Notification email à l'utilisateur invité
        $this->notifyInvitedUser($invitedUser, $workspace, $role);

        return response()->json([
            'success' => true,
            'message' => "{$invitedUser->name} a été ajouté au workspace.",
            'data'    => [
                'id'       => $invitedUser->id,
                'name'     => $invitedUser->name,
                'email'    => $invitedUser->email,
                'role'     => $role,
                'joined_at'=> now()->toDateString(),
                'is_owner' => false,
            ],
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function notifyInvitedUser(User $invitedUser, Workspace $workspace, string $role): void
    {
        $inviter = Auth::user();
        $roleLabel = $role === 'admin' ? 'Administrateur' : 'Membre';
        $frontendUrl = config('app.frontend_url', 'https://app.pixelrise.com');

        // Email
        try {
            $subject = "🎉 Vous avez été ajouté au workspace \"{$workspace->name}\"";
            $body = "Bonjour {$invitedUser->name},

{$inviter->name} vous a ajouté au workspace \"{$workspace->name}\" avec le rôle {$roleLabel}.

Accédez dès maintenant à votre workspace :
👉 {$frontendUrl}/workspace

Cordialement,
L'équipe PixelRise";

            Mail::raw($body, fn($m) => $m->to($invitedUser->email)->subject($subject));
        } catch (\Throwable $e) {
            Log::error('notifyInvitedUser email erreur', ['error' => $e->getMessage()]);
        }

        // Notification in-app
        try {
            Notification::create([
                'user_id'    => $invitedUser->id,
                'type'       => 'workspace_invitation',
                'priority'   => 'normal',
                'status'     => 'unread',
                'title'      => "Ajouté au workspace \"{$workspace->name}\"",
                'message'    => "{$inviter->name} vous a ajouté avec le rôle {$roleLabel}.",
                'data'       => ['workspace_id' => $workspace->id, 'role' => $role],
                'href'       => '/workspace',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('notifyInvitedUser notification erreur', ['error' => $e->getMessage()]);
        }
    }

    /**
     * PUT /workspace/users/{userId}/role — Change le rôle d'un membre
     */
    public function updateRole(Request $request, int $userId): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $request->validate(['role' => 'required|in:admin,member']);

        $member = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            return response()->json(['success' => false, 'message' => 'Membre introuvable.'], 404);
        }

        if ($member->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de modifier le rôle du propriétaire.',
            ], 403);
        }

        $member->update(['role' => $request->role]);

        return response()->json(['success' => true, 'message' => 'Rôle mis à jour.']);
    }

    /**
     * DELETE /workspace/users/{userId} — Retire un membre du workspace
     */
    public function remove(Request $request, int $userId): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $member = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $userId)
            ->first();

        if (!$member) {
            return response()->json(['success' => false, 'message' => 'Membre introuvable.'], 404);
        }

        if ($member->isOwner()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de retirer le propriétaire du workspace.',
            ], 403);
        }

        $member->delete();

        return response()->json(['success' => true, 'message' => 'Membre retiré du workspace.']);
    }

    /**
     * POST /workspace/users/set-pin
     * Le client connecté définit ou modifie son code de protection de données.
     */
    public function setClientPin(Request $request): JsonResponse
    {
        $user      = Auth::user();
        $workspace = $request->attributes->get('workspace');

        $membership = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership) {
            return response()->json(['success' => false, 'message' => 'Membre introuvable.'], 404);
        }

        $request->validate([
            'new_pin'     => 'required|string|min:4|max:50',
            'current_pin' => 'nullable|string',
        ]);

        // Si un PIN est déjà défini, vérifier l'ancien
        if ($membership->hasDataPin()) {
            if (!$request->current_pin || !Hash::check($request->current_pin, $membership->client_data_pin)) {
                return response()->json(['success' => false, 'message' => 'Code PIN actuel incorrect.'], 422);
            }
        }

        $membership->update(['client_data_pin' => Hash::make($request->new_pin)]);

        return response()->json(['success' => true, 'message' => 'Code de protection défini.', 'has_data_pin' => true]);
    }

    /**
     * DELETE /workspace/users/remove-pin
     * Le client supprime son code de protection (nécessite le PIN actuel).
     */
    public function removeClientPin(Request $request): JsonResponse
    {
        $user      = Auth::user();
        $workspace = $request->attributes->get('workspace');

        $membership = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$membership || !$membership->hasDataPin()) {
            return response()->json(['success' => false, 'message' => 'Aucun code PIN défini.'], 422);
        }

        $request->validate(['current_pin' => 'required|string']);

        if (!Hash::check($request->current_pin, $membership->client_data_pin)) {
            return response()->json(['success' => false, 'message' => 'Code PIN incorrect.'], 422);
        }

        $membership->update(['client_data_pin' => null]);

        return response()->json(['success' => true, 'message' => 'Protection supprimée.', 'has_data_pin' => false]);
    }
}
