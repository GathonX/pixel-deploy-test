<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\WorkspaceInvitationMail;
use App\Models\LifecycleEvent;
use App\Models\Notification;
use App\Models\PurchaseOrder;
use App\Models\SiteLanguage;
use App\Models\SitePlanAssignment;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceSubscription;
use App\Models\SiteGlobalSection;
use App\Models\SitePage;
use App\Models\SiteSection;
use App\Models\SiteTemplate;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Models\UserSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PurchaseController extends Controller
{
    private const SOURCE_LABELS = [
        'site-builder'           => 'Site Builder - Template Premium',
        'studio-domain'          => 'Studio Domaine - Nom de domaine',
        'marketplace'            => 'Marketplace',
        'workspace-subscription' => 'Abonnement Workspace',
        'site-language'          => 'Langue supplémentaire',
        'workspace-user'         => 'Utilisateur supplémentaire',
        'client-workspace'       => 'Workspace Client',
        'site-subscription'      => 'Abonnement Site',
    ];

    /**
     * Créer une commande d'achat
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => 'required|string|in:site-builder,studio-domain,marketplace,workspace-subscription,site-language,workspace-user,client-workspace,site-subscription',
            'source_item_id' => 'required|string|max:100',
            'site_name' => 'nullable|string|max:255',
            'item_name' => 'required|string|max:255',
            'item_description' => 'nullable|string',
            'item_thumbnail' => 'nullable|string|max:500',
            'price_eur' => 'required|numeric|min:0',
            'price_ariary' => 'required|integer|min:0',
        ]);

        $order = PurchaseOrder::create([
            'id' => Str::random(20),
            'user_id' => $request->user()->id,
            'source' => $validated['source'],
            'source_item_id' => $validated['source_item_id'],
            'site_name' => $validated['site_name'] ?? null,
            'item_name' => $validated['item_name'],
            'item_description' => $validated['item_description'] ?? null,
            'item_thumbnail' => $validated['item_thumbnail'] ?? null,
            'total_eur' => $validated['price_eur'],
            'total_ariary' => $validated['price_ariary'],
            'status' => 'awaiting_payment',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Commande créée',
            'data' => $this->transformOrder($order),
        ], 201);
    }

    /**
     * Lister les commandes de l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        $orders = PurchaseOrder::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($o) => $this->transformOrder($o));

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Voir une commande
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $query = PurchaseOrder::with('user')->where('id', $id);

        // L'admin peut voir n'importe quelle commande, l'utilisateur seulement les siennes
        if (!$request->user()->is_admin) {
            $query->where('user_id', $request->user()->id);
        }

        $order = $query->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->transformOrder($order),
        ]);
    }

    /**
     * Soumettre la preuve de paiement
     */
    public function submitProof(Request $request, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        if (!in_array($order->status, ['pending', 'awaiting_payment'])) {
            return response()->json(['success' => false, 'message' => 'Impossible de soumettre une preuve pour cette commande'], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|in:mobile_money,bank_transfer,card',
            'payment_proof_url' => 'required|string|max:500',
        ]);

        $order->update([
            'payment_method' => $validated['payment_method'],
            'payment_proof_url' => $validated['payment_proof_url'],
            'status' => 'payment_submitted',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Preuve de paiement soumise',
            'data' => $this->transformOrder($order),
        ]);
    }

    /**
     * Upload de la preuve de paiement (fichier)
     */
    public function uploadProof(Request $request, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $path = $request->file('proof')->store('payment-proofs', 'public');

        return response()->json([
            'success' => true,
            'data' => ['url' => '/storage/' . $path],
        ]);
    }

    /**
     * Soumettre le paiement complet avec formulaire et fichiers multiples
     */
    public function submitPayment(Request $request, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        if (!in_array($order->status, ['pending', 'awaiting_payment'])) {
            return response()->json(['success' => false, 'message' => 'Impossible de soumettre un paiement pour cette commande'], 422);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'contact_number' => 'required|string|max:50',
            'order_reference' => 'nullable|string|max:100',
            'amount_claimed' => 'required|string|max:50',
            'payment_method' => 'required|string|max:50',
            'user_message' => 'nullable|string',
            'payment_proofs' => 'required|array|min:1|max:5',
            'payment_proofs.*' => 'file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        // Upload des fichiers de preuve
        $proofUrls = [];
        if ($request->hasFile('payment_proofs')) {
            foreach ($request->file('payment_proofs') as $file) {
                $path = $file->store('purchase-proofs/' . $order->id, 'public');
                $proofUrls[] = '/storage/' . $path;
            }
        }

        $order->update([
            'full_name' => $validated['full_name'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'amount_claimed' => $validated['amount_claimed'],
            'payment_method' => $validated['payment_method'],
            'user_message' => $validated['user_message'] ?? null,
            'payment_proofs' => $proofUrls,
            'payment_proof_url' => $proofUrls[0] ?? null,
            'status' => 'payment_submitted',
        ]);

        // Notifications: ticket + emails + cloche
        $user = $request->user();
        $sourceLabel = self::SOURCE_LABELS[$order->source] ?? $order->source;

        $ticket = $this->createPaymentTicket($user, $order, $proofUrls, $validated);
        $this->sendAdminPaymentEmail($user, $order, $proofUrls, $validated, $ticket, $sourceLabel);
        $this->sendUserConfirmationEmail($order, $validated, $sourceLabel);
        $this->notifyAdminsNewPayment($user, $order, $ticket, $sourceLabel);

        return response()->json([
            'success' => true,
            'message' => 'Paiement soumis avec succès',
            'data' => $this->transformOrder($order),
        ]);
    }

    /**
     * Annuler une commande
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $order = PurchaseOrder::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        if (in_array($order->status, ['confirmed', 'cancelled'])) {
            return response()->json(['success' => false, 'message' => 'Impossible d\'annuler cette commande'], 422);
        }

        $order->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'message' => 'Commande annulée',
            'data' => $this->transformOrder($order),
        ]);
    }

    // ============ ADMIN ============

    /**
     * Lister toutes les commandes (admin)
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with('user')->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Par défaut, exclure les commandes incomplètes (awaiting_payment)
            $query->where('status', '!=', 'awaiting_payment');
        }

        $orders = $query->get()->map(fn($o) => $this->transformOrder($o));

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    /**
     * Confirmer ou rejeter une commande (admin)
     */
    public function confirm(Request $request, string $id): JsonResponse
    {
        $order = PurchaseOrder::with('user')->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Commande non trouvée'], 404);
        }

        if ($order->status !== 'payment_submitted') {
            return response()->json(['success' => false, 'message' => 'Cette commande ne peut pas être confirmée'], 422);
        }

        $validated = $request->validate([
            'approved' => 'required|boolean',
            'admin_note' => 'nullable|string|max:500',
        ]);

        $approved = $validated['approved'];
        $adminNote = $validated['admin_note'] ?? null;

        $order->update([
            'status' => $approved ? 'confirmed' : 'rejected',
            'admin_note' => $adminNote,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        // Notifications: ticket response + email + cloche
        $sourceLabel = self::SOURCE_LABELS[$order->source] ?? $order->source;

        // Si approuvé et source site-builder, créer le site automatiquement
        $siteCreated = null;
        if ($approved && $order->source === 'site-builder') {
            $siteCreated = $this->createSiteFromPurchase($order);
        }

        // Si approuvé et source studio-domain, activer la demande de domaine automatiquement
        if ($approved && $order->source === 'studio-domain') {
            $this->activateStudioDomainRequest($order, $request->user()->id);
        }

        // Si approuvé et source workspace-subscription, activer l'abonnement workspace
        if ($approved && $order->source === 'workspace-subscription') {
            $this->activateWorkspaceSubscription($order);
        }

        // Si approuvé et source site-language, ajouter la langue supplémentaire au site
        if ($approved && $order->source === 'site-language') {
            $this->activateSiteLanguage($order);
        }

        // Si approuvé et source workspace-user, activer l'invitation utilisateur workspace
        if ($approved && $order->source === 'workspace-user') {
            $this->activateWorkspaceUser($order);
        }

        // Si approuvé et source client-workspace, créer le workspace client
        if ($approved && $order->source === 'client-workspace') {
            $this->activateClientWorkspace($order);
        }

        // Si approuvé et source site-subscription, activer le plan du site
        if ($approved && $order->source === 'site-subscription') {
            $this->activateSiteSubscription($order);
        }

        if ($approved) {
            $this->sendApprovalCommunications($order, $request->user(), $adminNote, $sourceLabel, $siteCreated);
        } else {
            $this->sendRejectionCommunications($order, $request->user(), $adminNote, $sourceLabel);
        }

        return response()->json([
            'success' => true,
            'message' => $approved ? 'Commande confirmée' : 'Commande rejetée',
            'data' => $this->transformOrder($order),
            'site_created' => $siteCreated ? true : false,
        ]);
    }

    // ============ ACTIVATION PLAN SITE (SITE-SUBSCRIPTION) ============

    private function activateSiteSubscription(PurchaseOrder $order): void
    {
        try {
            // source_item_id format: "{siteId}|{planKey}"
            [$siteId, $planKey] = explode('|', $order->source_item_id, 2);

            $site = UserSite::find($siteId);
            if (!$site) {
                Log::warning('activateSiteSubscription : site introuvable', [
                    'source_item_id' => $order->source_item_id,
                    'order_id'       => $order->id,
                ]);
                return;
            }

            DB::transaction(function () use ($siteId, $planKey) {
                // Expirer toute assignment active existante pour ce site
                SitePlanAssignment::where('site_id', $siteId)
                    ->where('status', 'active')
                    ->update(['status' => 'expired']);

                // Créer la nouvelle assignment dédiée (30 jours renouvelables)
                SitePlanAssignment::create([
                    'site_id'                   => $siteId,
                    'workspace_subscription_id' => null,
                    'dedicated_subscription_id' => null,
                    'effective_plan_key'        => $planKey,
                    'billing_mode'              => 'dedicated_site_plan',
                    'status'                    => 'active',
                    'starts_at'                 => now(),
                    'ends_at'                   => now()->addDays(30),
                ]);
            });

            $user = $order->user;
            if ($user) {
                Notification::create([
                    'user_id'    => $user->id,
                    'type'       => 'site_plan_activated',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => '✅ Plan site activé !',
                    'message'    => 'Votre site "' . ($site->name ?? $siteId) . '" est maintenant sur le plan ' . ucfirst($planKey) . '.',
                    'data'       => ['site_id' => $siteId, 'plan_key' => $planKey],
                    'href'       => "/dashboard/site/{$siteId}/billing",
                    'category'   => 'success',
                    'show_badge' => true,
                ]);
            }

            Log::info('Site subscription activée après paiement', [
                'site_id'        => $siteId,
                'plan_key'       => $planKey,
                'purchase_order' => $order->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur activateSiteSubscription', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ============ ACTIVATION LANGUE SUPPLÉMENTAIRE (SITE-LANGUAGE) ============

    private function activateSiteLanguage(PurchaseOrder $order): void
    {
        try {
            // source_item_id format : "{siteId}|{languageCode}"
            [$siteId, $languageCode] = explode('|', $order->source_item_id, 2);

            $site = UserSite::find($siteId);
            if (!$site) {
                Log::warning('activateSiteLanguage : site introuvable', [
                    'source_item_id' => $order->source_item_id,
                    'order_id'       => $order->id,
                ]);
                return;
            }

            // Éviter le doublon
            if ($site->languages()->where('language_code', $languageCode)->exists()) {
                Log::info('activateSiteLanguage : langue déjà existante', [
                    'site_id'       => $siteId,
                    'language_code' => $languageCode,
                ]);
                return;
            }

            SiteLanguage::create([
                'site_id'       => $siteId,
                'language_code' => $languageCode,
                'status'        => 'active',
                'is_default'    => false,
                'is_paid_extra' => true,
            ]);

            // Notification in-app
            $user = $order->user;
            if ($user) {
                Notification::create([
                    'user_id'    => $user->id,
                    'type'       => 'site_language_activated',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => '✅ Langue activée !',
                    'message'    => "La langue « {$languageCode} » a été ajoutée à votre site.",
                    'data'       => ['site_id' => $siteId, 'language_code' => $languageCode],
                    'href'       => '/dashboard/languages',
                    'category'   => 'success',
                    'show_badge' => true,
                ]);
            }

            Log::info('Langue supplémentaire activée après paiement', [
                'site_id'        => $siteId,
                'language_code'  => $languageCode,
                'purchase_order' => $order->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur activateSiteLanguage', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ============ ACTIVATION UTILISATEUR WORKSPACE ============

    private function activateWorkspaceUser(PurchaseOrder $order): void
    {
        try {
            $token = $order->source_item_id;

            $invitation = WorkspaceInvitation::where('token', $token)
                ->where('status', 'awaiting_payment')
                ->with(['workspace', 'site', 'inviter'])
                ->first();

            if (!$invitation) {
                Log::warning('activateWorkspaceUser: invitation introuvable ou mauvais statut', [
                    'token'    => $token,
                    'order_id' => $order->id,
                ]);
                return;
            }

            // Activer l'invitation (reset expiry + status pending)
            $invitation->update([
                'status'     => 'pending',
                'expires_at' => now()->addDays(7),
            ]);

            // Envoyer l'email d'invitation
            try {
                Mail::to($invitation->email)->send(new WorkspaceInvitationMail($invitation));
            } catch (\Throwable $e) {
                Log::error('activateWorkspaceUser: email erreur', ['error' => $e->getMessage()]);
            }

            // Notification in-app à l'expéditeur de la commande
            $user = $order->user;
            if ($user) {
                Notification::create([
                    'user_id'    => $user->id,
                    'type'       => 'workspace_user_invitation_sent',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => '✅ Invitation envoyée !',
                    'message'    => "L'invitation pour {$invitation->name} ({$invitation->email}) a été envoyée.",
                    'data'       => ['invitation_id' => $invitation->id],
                    'href'       => '/workspace/users',
                    'category'   => 'success',
                    'show_badge' => true,
                ]);
            }

            Log::info('Invitation utilisateur workspace activée après paiement', [
                'invitation_id' => $invitation->id,
                'email'         => $invitation->email,
                'order_id'      => $order->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur activateWorkspaceUser', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ============ ACTIVATION WORKSPACE CLIENT ============

    private function activateClientWorkspace(PurchaseOrder $order): void
    {
        try {
            // item_name = "Workspace Client — {nom}" → extraire la partie après le tiret
            $rawName       = $order->item_name ?? $order->source_item_id;
            $workspaceName = trim(preg_replace('/^Workspace Client\s*[—-]\s*/u', '', $rawName)) ?: $rawName;
            $owner         = $order->user;

            // Créer le workspace client (actif immédiatement, aucun trial)
            $workspace = Workspace::create([
                'owner_user_id'   => $owner->id,
                'name'            => $workspaceName,
                'status'          => 'active',
                'trial_starts_at' => now(),
                'trial_ends_at'   => now()->addYear(),
            ]);

            // Créer un abonnement actif sans expiration définie
            WorkspaceSubscription::create([
                'workspace_id' => $workspace->id,
                'plan_key'     => 'starter',
                'status'       => 'active',
                'starts_at'    => now(),
                'ends_at'      => null,
                'source'       => 'purchase:' . $order->id,
            ]);

            // Notification in-app au propriétaire
            Notification::create([
                'user_id'    => $owner->id,
                'type'       => 'client_workspace_created',
                'priority'   => 'high',
                'status'     => 'unread',
                'title'      => "Workspace client créé : {$workspaceName}",
                'message'    => "Votre workspace client \"{$workspaceName}\" est prêt. Vous pouvez maintenant inviter votre client.",
                'data'       => ['workspace_id' => $workspace->id],
                'href'       => '/workspace/users',
                'category'   => 'workspace_lifecycle',
                'show_badge' => true,
            ]);

            Log::info('Workspace client activé', [
                'owner_id'     => $owner->id,
                'workspace_id' => $workspace->id,
                'name'         => $workspaceName,
            ]);
        } catch (\Throwable $e) {
            Log::error('activateClientWorkspace erreur', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ============ ACTIVATION ABONNEMENT WORKSPACE ============

    private function activateWorkspaceSubscription(PurchaseOrder $order): void
    {
        try {
            $user      = $order->user;
            $workspace = Workspace::where('owner_user_id', $order->user_id)->first();
            $planKey   = $order->source_item_id; // 'starter' | 'pro' | 'premium'

            if (!$workspace) {
                Log::warning('activateWorkspaceSubscription : workspace introuvable', [
                    'user_id'  => $order->user_id,
                    'order_id' => $order->id,
                ]);
                return;
            }

            DB::transaction(function () use ($workspace, $planKey, $order) {
                // Désactiver les subscriptions trial/actives existantes
                $workspace->subscriptions()
                    ->whereIn('status', ['trial_active', 'active', 'grace'])
                    ->update(['status' => 'canceled']);

                // Créer la nouvelle subscription payée (30 jours)
                WorkspaceSubscription::create([
                    'workspace_id' => $workspace->id,
                    'plan_key'     => $planKey,
                    'status'       => 'active',
                    'starts_at'    => now(),
                    'ends_at'      => now()->addDays(30),
                    'source'       => 'purchase:' . $order->id,
                ]);

                // Activer le workspace
                $workspace->update([
                    'status'        => 'active',
                    'trial_ends_at' => null,
                    'suspended_at'  => null,
                ]);

                // Retirer de la file de suppression si présent
                $workspace->deletionQueue()
                    ->where('status', 'pending')
                    ->delete();

                // Log lifecycle
                LifecycleEvent::create([
                    'workspace_id' => $workspace->id,
                    'event_type'   => 'SUBSCRIPTION_ACTIVATED',
                    'event_at'     => now(),
                    'payload_json' => [
                        'plan_key'       => $planKey,
                        'purchase_id'    => $order->id,
                        'ends_at'        => now()->addDays(30)->toISOString(),
                    ],
                    'created_at'   => now(),
                ]);
            });

            // Notification in-app
            if ($user) {
                Notification::create([
                    'user_id'    => $user->id,
                    'type'       => 'subscription_activated',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => '✅ Abonnement activé !',
                    'message'    => "Votre abonnement " . ucfirst($planKey) . " est maintenant actif. Profitez de toutes les fonctionnalités PixelRise.",
                    'data'       => ['workspace_id' => $workspace->id, 'plan_key' => $planKey],
                    'href'       => '/workspace/billing',
                    'category'   => 'success',
                    'show_badge' => true,
                ]);
            }

            Log::info('Workspace subscription activée après paiement', [
                'workspace_id'    => $workspace->id,
                'plan_key'        => $planKey,
                'purchase_order'  => $order->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur activateWorkspaceSubscription', [
                'order_id' => $order->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ============ ACTIVATION DOMAINE (STUDIO-DOMAIN) ============

    private function activateStudioDomainRequest(PurchaseOrder $order, int $adminId): void
    {
        try {
            $studioRequest = \App\Models\StudioRequest::find((int) $order->source_item_id);

            if (!$studioRequest || !in_array($studioRequest->status, ['pending', 'in_progress'])) {
                Log::warning('StudioRequest introuvable ou déjà traitée', [
                    'source_item_id' => $order->source_item_id,
                    'status'         => $studioRequest?->status,
                ]);
                return;
            }

            $studioRequest->activate($adminId);

            // Email d'activation au client
            try {
                Mail::to($studioRequest->client_email)
                    ->send(new \App\Mail\StudioDomaine\StudioRequestActivatedMail($studioRequest));
            } catch (\Exception $e) {
                Log::error('Erreur email activation domain via purchase', ['error' => $e->getMessage()]);
            }

            // Notification in-app pour le client
            $user = $studioRequest->user;
            if ($user) {
                Notification::create([
                    'id'         => \Illuminate\Support\Str::uuid(),
                    'user_id'    => $user->id,
                    'type'       => 'studio_domain_activated',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => '✅ Domaine activé !',
                    'message'    => "Votre paiement a été confirmé. Votre domaine {$studioRequest->domain} est maintenant actif.",
                    'data'       => ['studio_request_id' => $studioRequest->id, 'domain' => $studioRequest->domain],
                    'href'       => '/studio-domaine/dashboard',
                    'category'   => 'success',
                    'tags'       => ['studio', 'domain', 'activated'],
                    'show_badge' => true,
                ]);
            }

            Log::info('StudioRequest auto-activée après confirmation paiement', [
                'studio_request_id' => $studioRequest->id,
                'purchase_order_id' => $order->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur auto-activation StudioRequest', [
                'source_item_id' => $order->source_item_id,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    // ============ CRÉATION DE SITE (SITE-BUILDER) ============

    private function createSiteFromPurchase(PurchaseOrder $order): ?UserSite
    {
        try {
            $template = SiteTemplate::with(['pages.sections.sectionType'])->find($order->source_item_id);

            if (!$template) {
                Log::error('Template introuvable pour création de site après achat', [
                    'order_id' => $order->id,
                    'template_id' => $order->source_item_id,
                ]);
                return null;
            }

            DB::beginTransaction();

            $site = UserSite::create([
                'user_id' => $order->user_id,
                'name' => $order->site_name ?? $order->item_name,
                'source_template_id' => $template->id,
                'status' => 'draft',
                'global_styles' => [],
            ]);

            // Sections globales (navbar et footer) - supporte variantes premium
            $isGlobalSection = fn(string $typeId) => str_starts_with($typeId, 'navbar') || str_starts_with($typeId, 'footer');
            $globalSectionsCreated = [];

            $firstPage = $template->pages->first();
            if ($firstPage) {
                foreach ($firstPage->sections as $templateSection) {
                    $sectionTypeId = $templateSection->section_type_id;
                    $position = str_starts_with($sectionTypeId, 'navbar') ? 'navbar' : 'footer';
                    if ($isGlobalSection($sectionTypeId) && !isset($globalSectionsCreated[$position])) {
                        $sectionType = $templateSection->sectionType;

                        SiteGlobalSection::create([
                            'site_id' => $site->id,
                            'section_type_id' => $sectionTypeId,
                            'position' => $position,
                            'content' => array_merge(
                                $sectionType->default_content ?? [],
                                $templateSection->default_content ?? []
                            ),
                            'styles' => array_merge(
                                $sectionType->default_styles ?? [],
                                $templateSection->default_styles ?? []
                            ),
                        ]);

                        $globalSectionsCreated[$position] = true;
                    }
                }
            }

            // Copier les pages du template
            foreach ($template->pages as $templatePage) {
                $page = SitePage::create([
                    'site_id' => $site->id,
                    'name' => $templatePage->name,
                    'slug' => $templatePage->slug,
                    'order' => $templatePage->order,
                    'is_published' => false,
                ]);

                $order_index = 0;
                foreach ($templatePage->sections as $templateSection) {
                    if ($isGlobalSection($templateSection->section_type_id)) {
                        continue;
                    }

                    $sectionType = $templateSection->sectionType;

                    SiteSection::create([
                        'page_id' => $page->id,
                        'section_type_id' => $templateSection->section_type_id,
                        'order' => $order_index++,
                        'content' => array_merge(
                            $sectionType->default_content ?? [],
                            $templateSection->default_content ?? []
                        ),
                        'styles' => array_merge(
                            $sectionType->default_styles ?? [],
                            $templateSection->default_styles ?? []
                        ),
                    ]);
                }
            }

            DB::commit();

            Log::info('Site créé automatiquement après approbation achat', [
                'order_id' => $order->id,
                'site_id' => $site->id,
                'user_id' => $order->user_id,
                'template_id' => $template->id,
            ]);

            return $site;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur création site après achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            return null;
        }
    }

    // ============ NOTIFICATIONS: SOUMISSION PAIEMENT ============

    private function createPaymentTicket($user, PurchaseOrder $order, array $proofUrls, array $validated): ?Ticket
    {
        try {
            $sourceLabel = self::SOURCE_LABELS[$order->source] ?? $order->source;

            $description = "DEMANDE D'ACHAT - {$sourceLabel}\n\n";
            $description .= "ARTICLE COMMANDÉ\n";
            $description .= "Nom : {$order->item_name}\n";
            if ($order->item_description) {
                $description .= "Description : {$order->item_description}\n";
            }
            if ($order->site_name) {
                $description .= "Nom du site : {$order->site_name}\n";
            }
            $description .= "Prix : {$order->total_eur}€ / " . number_format($order->total_ariary, 0, ',', ' ') . " Ar\n";
            $description .= "Commande : #{$order->id}\n\n";

            $description .= "INFORMATIONS CLIENT\n";
            $description .= "Nom complet : {$validated['full_name']}\n";
            $description .= "Email : {$validated['email']}\n";
            $description .= "Téléphone : {$validated['contact_number']}\n";
            $description .= "ID Utilisateur : {$user->id}\n\n";

            $description .= "DÉTAILS DU PAIEMENT\n";
            $description .= "Montant déclaré : {$validated['amount_claimed']}€\n";
            $description .= "Méthode de paiement : {$validated['payment_method']}\n\n";

            $description .= "PIÈCES JUSTIFICATIVES (" . count($proofUrls) . " fichiers)\n";
            foreach ($proofUrls as $index => $url) {
                $description .= "Justificatif " . ($index + 1) . " : {$url}\n";
            }

            if (!empty($validated['user_message'])) {
                $description .= "\nMESSAGE DU CLIENT\n{$validated['user_message']}";
            }

            $ticket = Ticket::create([
                'user_id' => $user->id,
                'title' => "Achat - {$order->item_name} ({$sourceLabel})",
                'description' => $description,
                'category' => 'payment',
                'status' => 'open',
            ]);

            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'sender' => 'user',
                'text' => $description,
            ]);

            return $ticket;
        } catch (\Exception $e) {
            Log::error('Erreur création ticket achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
            return null;
        }
    }

    private function sendAdminPaymentEmail($user, PurchaseOrder $order, array $proofUrls, array $validated, ?Ticket $ticket, string $sourceLabel): void
    {
        try {
            $subject = "Nouveau paiement d'achat - {$order->item_name} - {$validated['amount_claimed']}€";

            $emailContent = "NOUVEAU PAIEMENT D'ACHAT SOUMIS

Un nouveau paiement d'achat a été soumis sur la plateforme PixelRise.

DÉTAILS DE LA COMMANDE
-----------------------------------------
Source : {$sourceLabel}
Article : {$order->item_name}";

            if ($order->site_name) {
                $emailContent .= "\nNom du site : {$order->site_name}";
            }

            $emailContent .= "
Prix : {$order->total_eur}€ / " . number_format($order->total_ariary, 0, ',', ' ') . " Ar
Commande : #{$order->id}";

            if ($ticket) {
                $emailContent .= "\nTicket associé : #{$ticket->id}";
            }

            $emailContent .= "

INFORMATIONS CLIENT
-----------------------------------------
Nom complet : {$validated['full_name']}
Email : {$validated['email']}
Téléphone : {$validated['contact_number']}
ID Utilisateur : {$user->id}

DÉTAILS DU PAIEMENT
-----------------------------------------
Montant déclaré : {$validated['amount_claimed']}€
Méthode de paiement : {$validated['payment_method']}

PIÈCES JUSTIFICATIVES (" . count($proofUrls) . " fichiers)
-----------------------------------------";

            foreach ($proofUrls as $index => $url) {
                $emailContent .= "\nJustificatif " . ($index + 1) . " : " . config('app.url') . $url;
            }

            if (!empty($validated['user_message'])) {
                $emailContent .= "\n\nMESSAGE DU CLIENT
-----------------------------------------
{$validated['user_message']}";
            }

            $emailContent .= "\n\nACTIONS DISPONIBLES
-----------------------------------------
• Interface d'administration : " . config('app.frontend_url') . "/admin/site-builder/purchases";

            if ($ticket) {
                $emailContent .= "\n• Consulter le ticket : " . config('app.frontend_url') . "/admin/tickets/{$ticket->id}";
            }

            $emailContent .= "\n• Profil utilisateur : " . config('app.frontend_url') . "/admin/users/{$user->id}

Date de réception : " . now()->format('d/m/Y à H:i:s') . "

Cordialement,
Système de notification PixelRise";

            $mc = $emailContent; $ms = $subject; $mt = env('MAIL_ADMIN_EMAIL', 'admin@pixel-rise.com'); $oid = $order->id;
            dispatch(function() use ($mc, $ms, $mt, $oid) {
                try {
                    Mail::raw($mc, function ($message) use ($ms, $mt) {
                        $message->to($mt)->subject($ms);
                    });
                    Log::info('Email admin achat envoyé', ['order_id' => $oid]);
                } catch (\Throwable $e) {
                    Log::error('Erreur envoi email admin achat (deferred)', ['error' => $e->getMessage(), 'order_id' => $oid]);
                }
            })->afterResponse();
        } catch (\Exception $e) {
            Log::error('Erreur envoi email admin achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function sendUserConfirmationEmail(PurchaseOrder $order, array $validated, string $sourceLabel): void
    {
        try {
            $subject = "Confirmation de réception - Achat {$order->item_name}";

            $emailContent = "Bonjour {$validated['full_name']},

Nous accusons réception de votre demande d'achat et vous remercions de votre confiance.

RÉCAPITULATIF DE VOTRE COMMANDE
-----------------------------------------
Source : {$sourceLabel}
Article : {$order->item_name}";

            if ($order->site_name) {
                $emailContent .= "\nNom du site : {$order->site_name}";
            }

            $emailContent .= "
Montant : {$validated['amount_claimed']}€
Méthode de paiement : {$validated['payment_method']}
Référence de commande : #{$order->id}

TRAITEMENT DE VOTRE COMMANDE
-----------------------------------------
1. Notre équipe procède à la vérification de vos justificatifs
2. Vous recevrez une notification de validation sous 24 à 48 heures
3. Une fois approuvée, votre achat sera confirmé

ACCÈS À VOTRE ESPACE CLIENT
-----------------------------------------
• Tableau de bord : " . config('app.frontend_url') . "/dashboard
• Suivi de commande : " . config('app.frontend_url') . "/purchases/invoice/{$order->id}
• Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Pour toute question, n'hésitez pas à nous contacter en répondant à ce message.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            $mc = $emailContent; $ms = $subject; $mt = $validated['email']; $oid = $order->id;
            dispatch(function() use ($mc, $ms, $mt, $oid) {
                try {
                    Mail::raw($mc, function ($message) use ($ms, $mt) {
                        $message->to($mt)->subject($ms);
                    });
                    Log::info('Email confirmation achat envoyé', ['order_id' => $oid, 'user_email' => $mt]);
                } catch (\Throwable $e) {
                    Log::error('Erreur envoi email confirmation achat (deferred)', ['error' => $e->getMessage(), 'order_id' => $oid]);
                }
            })->afterResponse();
        } catch (\Exception $e) {
            Log::error('Erreur envoi email confirmation achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function notifyAdminsNewPayment($user, PurchaseOrder $order, ?Ticket $ticket, string $sourceLabel): void
    {
        try {
            $admins = User::where('is_admin', true)->get();

            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'payment_request',
                    'priority' => 'high',
                    'status' => 'unread',
                    'title' => 'Nouveau paiement d\'achat',
                    'message' => "{$user->name} a soumis un paiement pour {$order->item_name} ({$sourceLabel}) - {$order->amount_claimed}€",
                    'data' => [
                        'order_id' => $order->id,
                        'ticket_id' => $ticket?->id,
                        'source' => $order->source,
                        'item_name' => $order->item_name,
                        'site_name' => $order->site_name,
                        'user_id' => $user->id,
                        'user_name' => $user->name,
                        'user_email' => $user->email,
                        'amount_claimed' => $order->amount_claimed,
                        'payment_method' => $order->payment_method,
                        'proof_count' => count($order->payment_proofs ?? []),
                    ],
                    'href' => "/admin/site-builder/purchases",
                    'category' => 'payment',
                    'tags' => ['payment', 'purchase', $order->source, 'urgent'],
                    'show_badge' => true,
                ]);
            }

            Log::info('Notifications admin achat créées', [
                'order_id' => $order->id,
                'admin_count' => $admins->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur notification admin achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    // ============ NOTIFICATIONS: APPROBATION/REJET ADMIN ============

    private function sendApprovalCommunications(PurchaseOrder $order, $admin, ?string $adminNote, string $sourceLabel, ?UserSite $siteCreated = null): void
    {
        $this->createAdminTicketResponse($order, true, $adminNote, $sourceLabel);
        $this->sendApprovalEmail($order, $adminNote, $sourceLabel, $siteCreated);
        $this->createUserApprovalNotification($order, $sourceLabel, $siteCreated);
    }

    private function sendRejectionCommunications(PurchaseOrder $order, $admin, ?string $adminNote, string $sourceLabel): void
    {
        $this->createAdminTicketResponse($order, false, $adminNote, $sourceLabel);
        $this->sendRejectionEmail($order, $adminNote, $sourceLabel);
        $this->createUserRejectionNotification($order, $adminNote, $sourceLabel);
    }

    private function createAdminTicketResponse(PurchaseOrder $order, bool $approved, ?string $adminNote, string $sourceLabel): void
    {
        try {
            // Chercher le ticket lié à cette commande
            $ticket = Ticket::where('user_id', $order->user_id)
                ->where('title', 'LIKE', "%{$order->item_name}%")
                ->where('category', 'payment')
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$ticket) {
                return;
            }

            if ($approved) {
                $message = "ACHAT APPROUVÉ\n\n";
                $message .= "Votre achat a été validé par notre équipe.\n\n";
                $message .= "DÉTAILS\n";
                $message .= "Article : {$order->item_name}\n";
                $message .= "Source : {$sourceLabel}\n";
                $message .= "Montant validé : {$order->amount_claimed}€\n";
                $message .= "Date de validation : " . now()->format('d/m/Y à H:i') . "\n";

                if ($adminNote) {
                    $message .= "\nNote de l'administrateur : {$adminNote}\n";
                }

                $message .= "\nMerci pour votre achat !";
            } else {
                $message = "ACHAT REJETÉ\n\n";
                $message .= "Votre demande d'achat n'a pas pu être validée.\n\n";
                $message .= "DÉTAILS\n";
                $message .= "Article : {$order->item_name}\n";
                $message .= "Source : {$sourceLabel}\n";
                $message .= "Montant déclaré : {$order->amount_claimed}€\n";

                if ($adminNote) {
                    $message .= "\nRaison du rejet : {$adminNote}\n";
                }

                $message .= "\nSi vous pensez qu'il s'agit d'une erreur, veuillez nous contacter via le support.";
            }

            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'sender' => 'admin',
                'text' => $message,
            ]);

            $ticket->update([
                'status' => $approved ? 'resolved' : 'pending',
                'resolved_at' => $approved ? now() : null,
                'first_response_at' => $ticket->first_response_at ?? now(),
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur réponse ticket achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function sendApprovalEmail(PurchaseOrder $order, ?string $adminNote, string $sourceLabel, ?UserSite $siteCreated = null): void
    {
        try {
            if (!$order->email) return;

            $subject = "Achat confirmé - {$order->item_name}";

            $emailContent = "Bonjour {$order->full_name},

Nous avons le plaisir de vous confirmer que votre achat a été validé.

DÉTAILS DE VOTRE ACHAT
-----------------------------------------
Source : {$sourceLabel}
Article : {$order->item_name}";

            if ($order->site_name) {
                $emailContent .= "\nNom du site : {$order->site_name}";
            }

            $emailContent .= "
Montant validé : {$order->amount_claimed}€
Référence : #{$order->id}
Date de validation : " . now()->format('d/m/Y à H:i');

            if ($adminNote) {
                $emailContent .= "\n\nMessage de l'équipe : {$adminNote}";
            }

            if ($siteCreated) {
                $emailContent .= "

VOTRE SITE A ÉTÉ CRÉÉ
-----------------------------------------
Votre site \"{$siteCreated->name}\" a été créé automatiquement à partir du template {$order->item_name}.
Vous pouvez maintenant le personnaliser depuis le Site Builder.

• Accéder au Site Builder : " . config('app.frontend_url') . "/site-builder
• Modifier votre site : " . config('app.frontend_url') . "/site-builder/editor/{$siteCreated->id}";
            }

            // Déterminer l'URL d'accès selon la source
            $dashboardUrl  = config('app.frontend_url') . '/workspace';
            $accessSection = '';

            if ($order->source === 'workspace-user' && $order->source_item_id) {
                // Récupérer l'invitation pour informer l'admin du résultat
                $invitation = WorkspaceInvitation::where('token', $order->source_item_id)
                    ->with('site')
                    ->first();
                if ($invitation) {
                    $inviteeName = $invitation->name;
                    $inviteeEmail = $invitation->email;
                    $inviteeRole  = $invitation->role;
                    $dashboardUrl = config('app.frontend_url') . '/workspace/users';

                    if ($invitation->site_id) {
                        $siteName     = $invitation->site?->name ?? $invitation->site_id;
                        $siteUrl      = config('app.frontend_url') . "/dashboard/site/{$invitation->site_id}";
                        $accessSection = "

INVITATION ENVOYÉE
-----------------------------------------
Un email d'invitation a été envoyé à {$inviteeName} ({$inviteeEmail}).
Rôle attribué : {$inviteeRole}
Site accessible : {$siteName}
URL du site : {$siteUrl}

Le nouvel utilisateur doit cliquer sur le lien dans son email pour créer son mot de passe.
Il n'aura accès qu'au site : {$siteName}";
                    } else {
                        $accessSection = "

INVITATION ENVOYÉE
-----------------------------------------
Un email d'invitation a été envoyé à {$inviteeName} ({$inviteeEmail}).
Rôle attribué : {$inviteeRole}
Accès : workspace complet

Le nouvel utilisateur doit cliquer sur le lien dans son email pour créer son mot de passe.";
                    }
                }
            }

            $emailContent .= $accessSection;

            $emailContent .= "

ACCÈS À VOTRE ESPACE
-----------------------------------------
• Gestion des membres : {$dashboardUrl}
• Détails de la commande : " . config('app.frontend_url') . "/purchases/confirmation/{$order->id}
• Support technique : " . config('app.frontend_url') . "/workspace/demandes

Merci pour votre confiance !

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            $mc = $emailContent; $ms = $subject; $mt = $order->email; $oid = $order->id;
            dispatch(function() use ($mc, $ms, $mt, $oid) {
                try {
                    Mail::raw($mc, function ($message) use ($ms, $mt) {
                        $message->to($mt)->subject($ms);
                    });
                    Log::info('Email approbation achat envoyé', ['order_id' => $oid]);
                } catch (\Throwable $e) {
                    Log::error('Erreur envoi email approbation achat (deferred)', ['error' => $e->getMessage(), 'order_id' => $oid]);
                }
            })->afterResponse();
        } catch (\Exception $e) {
            Log::error('Erreur envoi email approbation achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function sendRejectionEmail(PurchaseOrder $order, ?string $adminNote, string $sourceLabel): void
    {
        try {
            if (!$order->email) return;

            $subject = "Achat non validé - {$order->item_name}";

            $emailContent = "Bonjour {$order->full_name},

Nous vous informons que votre demande d'achat n'a pas pu être validée.

DÉTAILS DE VOTRE COMMANDE
-----------------------------------------
Source : {$sourceLabel}
Article : {$order->item_name}";

            if ($order->site_name) {
                $emailContent .= "\nNom du site : {$order->site_name}";
            }

            $emailContent .= "
Montant déclaré : {$order->amount_claimed}€
Référence : #{$order->id}";

            if ($adminNote) {
                $emailContent .= "\n\nRaison du rejet : {$adminNote}";
            }

            $emailContent .= "

QUE FAIRE ?
-----------------------------------------
1. Vérifiez les informations de votre paiement
2. Assurez-vous que les preuves de paiement sont lisibles et complètes
3. Vous pouvez soumettre une nouvelle demande d'achat

ACCÈS À VOTRE ESPACE
-----------------------------------------
• Tableau de bord : " . config('app.frontend_url') . "/dashboard
• Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            $mc = $emailContent; $ms = $subject; $mt = $order->email; $oid = $order->id;
            dispatch(function() use ($mc, $ms, $mt, $oid) {
                try {
                    Mail::raw($mc, function ($message) use ($ms, $mt) {
                        $message->to($mt)->subject($ms);
                    });
                    Log::info('Email rejet achat envoyé', ['order_id' => $oid]);
                } catch (\Throwable $e) {
                    Log::error('Erreur envoi email rejet achat (deferred)', ['error' => $e->getMessage(), 'order_id' => $oid]);
                }
            })->afterResponse();
        } catch (\Exception $e) {
            Log::error('Erreur envoi email rejet achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function createUserApprovalNotification(PurchaseOrder $order, string $sourceLabel, ?UserSite $siteCreated = null): void
    {
        try {
            $message = "Votre achat de {$order->item_name} ({$sourceLabel}) a été validé. Montant : {$order->amount_claimed}€";
            $href = "/purchases/confirmation/{$order->id}";

            if ($siteCreated) {
                $message .= " Votre site \"{$siteCreated->name}\" est prêt à être personnalisé !";
                $href = "/site-builder";
            }

            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'purchase_approved',
                'priority' => 'high',
                'status' => 'unread',
                'title' => $siteCreated ? 'Achat confirmé - Site créé !' : 'Achat confirmé !',
                'message' => $message,
                'data' => [
                    'order_id' => $order->id,
                    'source' => $order->source,
                    'item_name' => $order->item_name,
                    'site_name' => $order->site_name,
                    'amount_claimed' => $order->amount_claimed,
                    'approved_at' => now()->toDateTimeString(),
                    'site_id' => $siteCreated?->id,
                ],
                'href' => $href,
                'category' => 'success',
                'tags' => ['purchase', 'approved', $order->source],
                'show_badge' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur notification approbation achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    private function createUserRejectionNotification(PurchaseOrder $order, ?string $adminNote, string $sourceLabel): void
    {
        try {
            $message = "Votre achat de {$order->item_name} ({$sourceLabel}) n'a pas été validé.";
            if ($adminNote) {
                $message .= " Raison : {$adminNote}";
            }

            Notification::create([
                'user_id' => $order->user_id,
                'type' => 'purchase_rejected',
                'priority' => 'high',
                'status' => 'unread',
                'title' => 'Achat non validé',
                'message' => $message,
                'data' => [
                    'order_id' => $order->id,
                    'source' => $order->source,
                    'item_name' => $order->item_name,
                    'site_name' => $order->site_name,
                    'amount_claimed' => $order->amount_claimed,
                    'admin_note' => $adminNote,
                    'rejected_at' => now()->toDateTimeString(),
                ],
                'href' => "/purchases/invoice/{$order->id}",
                'category' => 'error',
                'tags' => ['purchase', 'rejected', $order->source],
                'show_badge' => true,
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur notification rejet achat', [
                'error' => $e->getMessage(),
                'order_id' => $order->id,
            ]);
        }
    }

    // ============ TRANSFORM ============

    private function transformOrder(PurchaseOrder $order): array
    {
        $user = $order->relationLoaded('user') ? $order->user : null;

        // Si l'utilisateur n'a pas de téléphone dans son profil,
        // utiliser le client_phone de la StudioRequest liée (source studio-domain)
        $userPhone = $user?->phone;
        if (!$userPhone && $order->source === 'studio-domain' && $order->source_item_id) {
            $studioRequest = \App\Models\StudioRequest::find((int) $order->source_item_id);
            $userPhone = $studioRequest?->client_phone;
        }

        return [
            'id' => $order->id,
            'userId' => (string) $order->user_id,
            'userName' => $user?->name,
            'userEmail' => $user?->email,
            'userPhone' => $userPhone,
            'siteName' => $order->site_name,
            'items' => [
                [
                    'id' => $order->source_item_id,
                    'source' => $order->source,
                    'sourceItemId' => $order->source_item_id,
                    'name' => $order->item_name,
                    'description' => $order->item_description,
                    'thumbnail' => $order->item_thumbnail,
                    'priceEur' => (float) $order->total_eur,
                    'priceAriary' => (int) $order->total_ariary,
                ],
            ],
            'totalEur' => (float) $order->total_eur,
            'totalAriary' => (int) $order->total_ariary,
            'status' => $order->status,
            'paymentMethod' => $order->payment_method,
            'paymentProofUrl' => $order->payment_proof_url,
            'paymentProofs' => $order->payment_proofs,
            'fullName' => $order->full_name,
            'email' => $order->email,
            'contactNumber' => $order->contact_number,
            'userMessage' => $order->user_message,
            'amountClaimed' => $order->amount_claimed,
            'adminNote' => $order->admin_note,
            'confirmedBy' => $order->confirmed_by ? (string) $order->confirmed_by : null,
            'createdAt' => $order->created_at->toISOString(),
            'updatedAt' => $order->updated_at->toISOString(),
            'confirmedAt' => $order->confirmed_at?->toISOString(),
        ];
    }
}
