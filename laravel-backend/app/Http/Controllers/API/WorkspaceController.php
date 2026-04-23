<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Reservation;
use App\Models\Task;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WorkspaceController extends Controller
{
    public function __construct(private PlanResolver $planResolver) {}

    /**
     * Retourne le workspace de l'utilisateur connecté avec son plan.
     */
    public function show(Request $request): JsonResponse
    {
        $user      = $request->user();
        $workspace = $request->attributes->get('workspace');

        // Charger le nom du propriétaire original (utile côté client pour "demander de l'aide")
        $workspace->load('owner:id,name,email');

        // Déterminer le rôle de l'utilisateur courant dans ce workspace
        if ($workspace->owner_user_id === $user->id) {
            $currentUserRole = 'owner';
        } else {
            $membership = WorkspaceUser::where('workspace_id', $workspace->id)
                ->where('user_id', $user->id)
                ->first();
            $currentUserRole = $membership?->role ?? 'member';
        }

        return response()->json([
            'success' => true,
            'data'    => array_merge(
                $workspace->only(['id', 'name', 'status', 'trial_starts_at', 'trial_ends_at', 'delivered_at', 'delivered_to_user_id']),
                $this->planResolver->summary($workspace),
                [
                    'is_delivered'      => $workspace->isDelivered(),
                    'owner_name'        => $workspace->owner?->name,
                    'owner_email'       => $workspace->owner?->email,
                    'current_user_role' => $currentUserRole,
                ]
            ),
        ]);
    }

    /**
     * Vérifie si le workspace peut publier un site spécifique.
     */
    public function canPublish(Request $request, string $siteId): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');
        $site      = $workspace->sites()->find($siteId);

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $check = $this->planResolver->canPublishSite($site, $workspace);

        return response()->json([
            'success'     => true,
            'allowed'     => $check['allowed'],
            'reason_code' => $check['reason_code'],
            'message'     => $check['message'],
        ]);
    }

    /**
     * Vue d'ensemble pour le dashboard workspace.
     */
    public function overview(Request $request): JsonResponse
    {
        $user      = $request->user();
        $workspace = $request->attributes->get('workspace');

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth   = Carbon::now()->endOfMonth();
        $today        = Carbon::today();

        // Réservations du mois courant
        $baseMonth = Reservation::where('client_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth]);

        $reservationsThisMonth = (clone $baseMonth)->count();
        $pendingCount          = (clone $baseMonth)->where('status', 'pending')->count();
        $confirmedCount        = (clone $baseMonth)->where('status', 'confirmed')->count();

        // Arrivées aujourd'hui
        $todayArrivals = Reservation::where('client_id', $user->id)
            ->whereDate('date', $today)
            ->where('status', 'confirmed')
            ->count();

        // Activité récente (5 dernières)
        $recentReservations = Reservation::where('client_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'name', 'email', 'date', 'guests', 'status', 'created_at']);

        // Sites
        $sitesTotal     = UserSite::where('workspace_id', $workspace->id)->count();
        $sitesPublished = UserSite::where('workspace_id', $workspace->id)->where('status', 'published')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'reservations_this_month' => $reservationsThisMonth,
                'pending_count'           => $pendingCount,
                'confirmed_count'         => $confirmedCount,
                'today_arrivals'          => $todayArrivals,
                'recent_reservations'     => $recentReservations,
                'sites_total'             => $sitesTotal,
                'sites_published'         => $sitesPublished,
            ],
        ]);
    }

    /**
     * Résumé du plan pour le workspace courant.
     */
    public function planSummary(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        return response()->json([
            'success' => true,
            'data'    => $this->planResolver->summary($workspace),
        ]);
    }

    /**
     * Crée le workspace de l'utilisateur (onboarding, hors middleware workspace.active).
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        // Empêcher la double création (uniquement les workspaces non livrés)
        $existing = Workspace::where('owner_user_id', $user->id)
            ->whereNull('delivered_at')
            ->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Workspace déjà existant.',
                'data'    => $existing->only(['id', 'name', 'status', 'trial_ends_at']),
            ]);
        }

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:100',
        ]);

        $trialEnds = now()->addDays(14);

        $workspace = Workspace::create([
            'owner_user_id'  => $user->id,
            'name'           => $validated['name'],
            'status'         => 'trial_active',
            'trial_starts_at'=> now(),
            'trial_ends_at'  => $trialEnds,
        ]);

        // Créer la souscription d'essai
        $workspace->subscriptions()->create([
            'plan_key'   => 'starter',
            'status'     => 'trial_active',
            'starts_at'  => now(),
            'ends_at'    => $trialEnds,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Workspace créé. Bienvenue sur PixelRise !',
            'data'    => $workspace->only(['id', 'name', 'status', 'trial_ends_at']),
        ], 201);
    }

    /**
     * Met à jour le nom du workspace (owner uniquement).
     */
    public function update(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        // Seul l'owner peut modifier
        if ($workspace->owner_user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Seul le propriétaire peut modifier le workspace.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100|min:2',
        ]);

        $workspace->update(['name' => $validated['name']]);

        return response()->json([
            'success' => true,
            'message' => 'Nom du workspace mis à jour.',
            'data'    => ['name' => $workspace->name],
        ]);
    }

    /**
     * Résumé des stats par site pour le dashboard Entreprise.
     */
    public function getSitesSummary(Request $request): JsonResponse
    {
        $user      = $request->user();
        $workspace = $request->attributes->get('workspace');

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth   = Carbon::now()->endOfMonth();

        $sites = UserSite::where('workspace_id', $workspace->id)
            ->orderBy('created_at')
            ->get();

        $summary = $sites->map(function (UserSite $site) use ($user, $startOfMonth, $endOfMonth) {
            $reservationsMonth = Reservation::where('client_id', $user->id)
                ->where('site_id', $site->id)
                ->whereBetween('date', [$startOfMonth, $endOfMonth])
                ->count();

            $tasksPending = Task::where('site_id', $site->id)
                ->where('status', 'pending')
                ->count();

            $languagesCount = $site->languages()->count();

            return [
                'id'                  => $site->id,
                'name'                => $site->name,
                'published'           => $site->status === 'published',
                'reservations_month'  => $reservationsMonth,
                'tasks_pending'       => $tasksPending,
                'languages'           => $languagesCount,
                'updated_at'          => $site->updated_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data'    => $summary,
        ]);
    }

    /**
     * Liste tous les workspaces possédés par l'utilisateur connecté.
     * Utilisé par le frontend pour le sélecteur de workspace dans l'invitation client.
     */
    public function listOwned(Request $request): JsonResponse
    {
        $user = $request->user();

        $workspaces = Workspace::where('owner_user_id', $user->id)
            ->whereNotIn('status', ['pending_deletion', 'deleted'])
            ->orderBy('created_at', 'asc')
            ->with(['subscriptions' => function ($q) {
                $q->whereIn('status', ['trial_active', 'active', 'grace'])
                  ->orderByDesc('starts_at')
                  ->limit(1);
            }])
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $workspaces->map(function ($ws) {
                $sub = $ws->subscriptions->first();
                return [
                    'id'           => $ws->id,
                    'name'         => $ws->name,
                    'status'       => $ws->status,
                    'created_at'   => $ws->created_at,
                    'is_delivered' => $ws->isDelivered(),
                    'plan_key'     => $sub?->plan_key,
                    'sites_count'  => UserSite::where('workspace_id', $ws->id)->count(),
                    'sites'        => UserSite::where('workspace_id', $ws->id)
                                        ->orderBy('created_at', 'desc')
                                        ->get(['id', 'name', 'status']),
                ];
            }),
        ]);
    }

    /**
     * Livre le workspace au client (owner uniquement).
     * Après livraison : l'owner est bloqué, le client a le contrôle total.
     * Route : POST /workspace/deliver
     */
    public function deliver(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        if ($workspace->owner_user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Seul le propriétaire peut livrer le workspace.'], 403);
        }

        if ($workspace->isDelivered()) {
            return response()->json(['success' => false, 'message' => 'Ce workspace a déjà été livré.'], 422);
        }

        // Trouver le client dans workspace_users
        $clientMember = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('role', 'client')
            ->with('user:id,name,email')
            ->first();

        if (!$clientMember) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun client trouvé dans ce workspace. Invitez d\'abord un client avant de livrer.',
            ], 422);
        }

        // Marquer comme livré
        $workspace->update([
            'delivered_at'         => now(),
            'delivered_to_user_id' => $clientMember->user_id,
        ]);

        // Notification au client : le workspace lui est livré
        try {
            Notification::create([
                'user_id'    => $clientMember->user_id,
                'type'       => 'workspace_delivered',
                'priority'   => 'high',
                'status'     => 'unread',
                'title'      => 'Votre workspace est prêt !',
                'message'    => "Le workspace \"{$workspace->name}\" vous a été livré. Il vous appartient entièrement, faites-en ce que vous voulez.",
                'data'       => ['workspace_id' => $workspace->id],
                'href'       => '/workspace',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('WorkspaceDeliver: notification erreur', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => "Workspace livré à {$clientMember->user->name}. Vous n'avez plus accès à ce workspace.",
        ]);
    }

    /**
     * Le client demande de l'aide au propriétaire original.
     * Crée une invitation pour réintégrer l'owner dans le workspace en tant qu'admin.
     * Route : POST /workspace/request-help
     */
    public function requestHelp(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');
        $user      = $request->user();

        // Seul le client du workspace peut demander de l'aide
        if (!$workspace->isDelivered()) {
            return response()->json(['success' => false, 'message' => 'Ce workspace n\'a pas encore été livré.'], 422);
        }

        if ($workspace->delivered_to_user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Seul le client du workspace peut demander de l\'aide.'], 403);
        }

        // Charger le propriétaire original
        $workspace->load('owner:id,name,email');
        $owner = $workspace->owner;

        if (!$owner) {
            return response()->json(['success' => false, 'message' => 'Propriétaire introuvable.'], 404);
        }

        // Vérifier que l'owner n'est pas déjà dans le workspace
        $alreadyIn = WorkspaceUser::where('workspace_id', $workspace->id)
            ->where('user_id', $owner->id)
            ->exists();

        if ($alreadyIn) {
            return response()->json([
                'success' => true,
                'message' => "{$owner->name} a déjà accès à votre workspace.",
            ]);
        }

        // Créer une invitation pour l'owner (token + email)
        $token = Str::random(48);
        \App\Models\WorkspaceInvitation::where('workspace_id', $workspace->id)
            ->where('email', $owner->email)
            ->where('status', 'pending')
            ->update(['status' => 'expired']);

        \App\Models\WorkspaceInvitation::create([
            'workspace_id' => $workspace->id,
            'token'        => $token,
            'email'        => $owner->email,
            'name'         => $owner->name,
            'role'         => 'admin',
            'status'       => 'pending',
            'invited_by'   => $user->id,
            'expires_at'   => now()->addDays(7),
        ]);

        // Notification au propriétaire original
        try {
            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'client_requests_help',
                'priority'   => 'high',
                'status'     => 'unread',
                'title'      => "{$user->name} demande votre aide",
                'message'    => "{$user->name} vous invite à rejoindre son workspace \"{$workspace->name}\" pour collaborer.",
                'data'       => [
                    'workspace_id'    => $workspace->id,
                    'invitation_token'=> $token,
                ],
                'href'       => "/invitation/accept/{$token}",
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('WorkspaceRequestHelp: notification erreur', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => "Demande envoyée à {$owner->name}. Il recevra une notification pour rejoindre votre workspace.",
        ]);
    }

    /**
     * Demande de suppression du workspace (owner uniquement).
     */
    public function destroy(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        if ($workspace->owner_user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Seul le propriétaire peut supprimer le workspace.'], 403);
        }

        $workspace->update([
            'status'     => 'pending_deletion',
            'deleted_at' => now()->addDays(30), // grâce de 30 jours
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Votre workspace sera supprimé dans 30 jours. Contactez le support pour annuler.',
        ]);
    }
}
