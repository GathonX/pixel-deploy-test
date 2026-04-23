<?php

namespace App\Http\Controllers\API\StudioDomaine;

use App\Http\Controllers\Controller;
use App\Mail\StudioDomaine\StudioRequestActivatedMail;
use App\Mail\StudioDomaine\StudioRequestInProgressMail;
use App\Mail\StudioDomaine\StudioRequestNewMail;
use App\Mail\StudioDomaine\StudioRequestRejectedMail;
use App\Models\Notification;
use App\Models\StudioRequest;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class RequestController extends Controller
{
    /**
     * Liste des demandes de l'utilisateur connecté
     */
    public function index(): JsonResponse
    {
        $requests = StudioRequest::where('user_id', Auth::id())
            ->with(['purchaseOrder:id,source,source_item_id,status,total_eur,total_ariary'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($r) {
                $arr = $r->toArray();
                $arr['purchase_id']        = $r->purchaseOrder?->id;
                $arr['purchase_status']    = $r->purchaseOrder?->status;
                $arr['purchase_total_eur'] = $r->purchaseOrder?->total_eur;
                unset($arr['purchase_order']); // éviter la duplication
                return $arr;
            });

        return response()->json(['success' => true, 'data' => $requests]);
    }

    /**
     * Modifier une demande en attente (utilisateur connecté)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $studioRequest = StudioRequest::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'pending')
            ->first();

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande introuvable ou non modifiable.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'client_name'  => 'sometimes|required|string|max:255',
            'client_email' => 'sometimes|required|email|max:255',
            'client_phone' => 'nullable|string|max:50',
            'company_name' => 'nullable|string|max:255',
            'description'  => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $studioRequest->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Demande mise à jour.',
            'data'    => $studioRequest->fresh(),
        ]);
    }

    /**
     * Créer une nouvelle demande de domaine
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'domain' => 'required|string|max:253',
            'client_name' => 'required|string|max:255',
            'client_email' => 'required|email|max:255',
            'client_phone' => 'nullable|string|max:20',
            'company_name' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $existingRequest = StudioRequest::where('domain', $request->input('domain'))
            ->whereIn('status', ['pending', 'in_progress', 'active'])
            ->first();

        if ($existingRequest) {
            return response()->json(['success' => false, 'error' => 'Ce domaine a déjà été demandé.'], 409);
        }

        $studioRequest = StudioRequest::create([
            'user_id' => Auth::id(),
            'domain' => strtolower(trim($request->input('domain'))),
            'client_name' => $request->input('client_name'),
            'client_email' => $request->input('client_email'),
            'client_phone' => $request->input('client_phone'),
            'company_name' => $request->input('company_name'),
            'description' => $request->input('description'),
            'status' => 'pending',
        ]);

        $this->createRequestTicket($studioRequest);
        $this->createAdminNotification($studioRequest);
        $this->sendAdminEmail($studioRequest);

        return response()->json([
            'success' => true,
            'message' => 'Votre demande de domaine a été soumise avec succès. Nous vous contacterons sous 24-48h.',
            'data' => $studioRequest,
        ], 201);
    }

    /**
     * Afficher une demande spécifique
     */
    public function show(int $id): JsonResponse
    {
        $studioRequest = StudioRequest::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        return response()->json(['success' => true, 'data' => $studioRequest]);
    }

    /**
     * Annuler une demande (si encore en attente)
     */
    public function destroy(int $id): JsonResponse
    {
        $studioRequest = StudioRequest::where('id', $id)
            ->where('user_id', Auth::id())
            ->first();

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        if (!$studioRequest->isPending()) {
            return response()->json(['success' => false, 'error' => 'Seules les demandes en attente peuvent être annulées.'], 400);
        }

        $studioRequest->update(['status' => 'cancelled']);
        $this->addTicketMessage($studioRequest, 'admin', "🚫 **Demande annulée** par le client.\n\nLe ticket est clôturé.", 'resolved');

        return response()->json(['success' => true, 'message' => 'Demande annulée avec succès.']);
    }

    // ===== ROUTES ADMIN =====

    /**
     * Liste de toutes les demandes (admin) — paginée
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = StudioRequest::with([
            'user:id,name,email',
            'purchaseOrder:id,source,source_item_id,status,total_eur,total_ariary',
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('domain', 'like', "%{$search}%")
                    ->orWhere('client_name', 'like', "%{$search}%")
                    ->orWhere('client_email', 'like', "%{$search}%");
            });
        }

        $perPage  = (int) $request->input('per_page', 20);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Injecter purchase_id / purchase_status dans chaque item
        $paginated->getCollection()->transform(function ($r) {
            $arr = $r->toArray();
            $arr['purchase_id']        = $r->purchaseOrder?->id;
            $arr['purchase_status']    = $r->purchaseOrder?->status;
            $arr['purchase_total_eur'] = $r->purchaseOrder?->total_eur;
            unset($arr['purchase_order']);
            return $arr;
        });

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    /**
     * Marquer une demande "en cours" (admin)
     */
    public function markInProgress(int $id): JsonResponse
    {
        $studioRequest = StudioRequest::find($id);

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        if ($studioRequest->status !== 'pending') {
            return response()->json(['success' => false, 'error' => 'Seules les demandes en attente peuvent être mises en cours.'], 400);
        }

        $studioRequest->update(['status' => 'in_progress']);

        $msg = "⚙️ **Demande prise en charge**\n\n";
        $msg .= "Bonjour {$studioRequest->client_name},\n\n";
        $msg .= "Nous avons bien pris en charge votre demande pour **{$studioRequest->domain}**.\n";
        $msg .= "Notre équipe traite votre dossier et vous contactera prochainement.\n\n";
        $msg .= "📋 Référence : #STUDIO-{$studioRequest->id}\n⏱️ Délai estimé : 24 à 48 heures ouvrées";
        $this->addTicketMessage($studioRequest, 'admin', $msg);

        Notification::create([
            'user_id' => $studioRequest->user_id,
            'type' => 'studio_domain_in_progress',
            'priority' => 'normal',
            'status' => 'unread',
            'title' => '⚙️ Domaine en cours de traitement',
            'message' => "Votre demande pour {$studioRequest->domain} est prise en charge par notre équipe.",
            'data' => ['studio_request_id' => $studioRequest->id, 'domain' => $studioRequest->domain],
            'href' => '/studio-domaine',
            'category' => 'info',
            'tags' => ['studio', 'domain', 'in_progress'],
            'show_badge' => true,
        ]);

        try {
            Mail::to($studioRequest->client_email)->send(new StudioRequestInProgressMail($studioRequest));
        } catch (\Exception $e) {
            Log::error('Studio: email in_progress failed', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Demande marquée comme en cours.',
            'data' => $studioRequest->fresh(['user']),
        ]);
    }

    /**
     * Activer une demande (admin)
     */
    public function activate(int $id): JsonResponse
    {
        $studioRequest = StudioRequest::find($id);

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        if (!$studioRequest->isPending() && $studioRequest->status !== 'in_progress') {
            return response()->json(['success' => false, 'error' => 'Cette demande ne peut pas être activée.'], 400);
        }

        $studioRequest->activate(Auth::id());

        $msg = "🎉 **Domaine activé avec succès !**\n\n";
        $msg .= "Votre nom de domaine **{$studioRequest->domain}** a été enregistré et activé.\n";
        $msg .= "📅 Date d'activation : " . now()->format('d/m/Y à H:i') . "\n\n";
        $msg .= "Notre équipe va vous transmettre les informations de configuration DNS dans les prochaines heures.\n\nMerci pour votre confiance ! 🌐";
        $this->addTicketMessage($studioRequest, 'admin', $msg, 'resolved');

        Notification::create([
            'user_id' => $studioRequest->user_id,
            'type' => 'studio_domain_activated',
            'priority' => 'high',
            'status' => 'unread',
            'title' => '✅ Domaine activé !',
            'message' => "Votre domaine {$studioRequest->domain} a été activé avec succès.",
            'data' => ['studio_request_id' => $studioRequest->id, 'domain' => $studioRequest->domain, 'activated_at' => now()->toDateTimeString()],
            'href' => '/studio-domaine',
            'category' => 'success',
            'tags' => ['studio', 'domain', 'activated'],
            'show_badge' => true,
        ]);

        try {
            Mail::to($studioRequest->client_email)->send(new StudioRequestActivatedMail($studioRequest));
        } catch (\Exception $e) {
            Log::error('Studio: email activate failed', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Demande activée avec succès.',
            'data' => $studioRequest->fresh(['user']),
        ]);
    }

    /**
     * Rejeter une demande (admin)
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $studioRequest = StudioRequest::find($id);

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        if (!$studioRequest->isPending() && $studioRequest->status !== 'in_progress') {
            return response()->json(['success' => false, 'error' => 'Cette demande ne peut pas être rejetée.'], 400);
        }

        $reason = $request->input('reason');
        $studioRequest->reject(Auth::id(), $reason);

        $msg = "❌ **Demande non aboutie**\n\nBonjour {$studioRequest->client_name},\n\n";
        $msg .= "Après examen, nous ne pouvons pas traiter votre demande pour **{$studioRequest->domain}**.\n";
        if ($reason) $msg .= "\n**Motif :** {$reason}\n";
        $msg .= "\nVous pouvez soumettre une nouvelle demande ou contacter notre support.";
        $this->addTicketMessage($studioRequest, 'admin', $msg, 'resolved');

        Notification::create([
            'user_id' => $studioRequest->user_id,
            'type' => 'studio_domain_rejected',
            'priority' => 'medium',
            'status' => 'unread',
            'title' => '❌ Demande de domaine non aboutie',
            'message' => "Votre demande pour {$studioRequest->domain} n'a pas pu être traitée." . ($reason ? " Motif : {$reason}" : ''),
            'data' => ['studio_request_id' => $studioRequest->id, 'domain' => $studioRequest->domain, 'reason' => $reason],
            'href' => '/studio-domaine',
            'category' => 'warning',
            'tags' => ['studio', 'domain', 'rejected'],
            'show_badge' => true,
        ]);

        try {
            Mail::to($studioRequest->client_email)->send(new StudioRequestRejectedMail($studioRequest));
        } catch (\Exception $e) {
            Log::error('Studio: email reject failed', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Demande rejetée.',
            'data' => $studioRequest->fresh(['user']),
        ]);
    }

    /**
     * Supprimer définitivement une demande (admin)
     */
    public function adminDestroy(int $id): JsonResponse
    {
        $studioRequest = StudioRequest::find($id);

        if (!$studioRequest) {
            return response()->json(['success' => false, 'error' => 'Demande non trouvée.'], 404);
        }

        $domain = $studioRequest->domain;
        $studioRequest->delete();

        return response()->json([
            'success' => true,
            'message' => "La demande pour {$domain} a été supprimée définitivement.",
        ]);
    }

    /**
     * Statistiques des demandes (admin)
     */
    public function stats(): JsonResponse
    {
        $stats = [
            'total' => StudioRequest::count(),
            'pending' => StudioRequest::where('status', 'pending')->count(),
            'in_progress' => StudioRequest::where('status', 'in_progress')->count(),
            'active' => StudioRequest::where('status', 'active')->count(),
            'rejected' => StudioRequest::where('status', 'rejected')->count(),
            'cancelled' => StudioRequest::where('status', 'cancelled')->count(),
        ];

        return response()->json(['success' => true, 'data' => $stats]);
    }

    // ===== HELPERS PRIVÉS =====

    private function createRequestTicket(StudioRequest $studioRequest): void
    {
        try {
            $description = "Demande d'enregistrement de nom de domaine.\n\n";
            $description .= "**Domaine :** {$studioRequest->domain}\n";
            $description .= "**Client :** {$studioRequest->client_name} ({$studioRequest->client_email})\n";
            if ($studioRequest->client_phone) $description .= "**Téléphone :** {$studioRequest->client_phone}\n";
            if ($studioRequest->company_name) $description .= "**Entreprise :** {$studioRequest->company_name}\n";
            $description .= "\n**Référence :** #STUDIO-{$studioRequest->id}";
            if ($studioRequest->description) $description .= "\n\n**Message :** {$studioRequest->description}";

            $ticket = Ticket::create([
                'user_id' => $studioRequest->user_id,
                'title' => "🌐 Domaine : {$studioRequest->domain} [STUDIO-{$studioRequest->id}]",
                'description' => $description,
                'category' => 'Autre',
                'status' => 'open',
                'priority' => 'medium',
                'estimated_response_hours' => 48,
            ]);

            $userMsg = "Bonjour,\n\nJe souhaite enregistrer le domaine **{$studioRequest->domain}**.\n\n";
            $userMsg .= "📋 Mes informations :\n- Nom : {$studioRequest->client_name}\n- Email : {$studioRequest->client_email}";
            if ($studioRequest->client_phone) $userMsg .= "\n- Téléphone : {$studioRequest->client_phone}";
            if ($studioRequest->company_name) $userMsg .= "\n- Entreprise : {$studioRequest->company_name}";
            if ($studioRequest->description) $userMsg .= "\n\n💬 {$studioRequest->description}";

            TicketMessage::create(['ticket_id' => $ticket->id, 'sender' => 'user', 'text' => $userMsg]);

            Log::info('Studio: ticket créé', ['ticket_id' => $ticket->id, 'studio_request_id' => $studioRequest->id]);
        } catch (\Exception $e) {
            Log::error('Studio: erreur création ticket', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }
    }

    private function addTicketMessage(StudioRequest $studioRequest, string $sender, string $text, ?string $closeStatus = null): void
    {
        try {
            $ticket = Ticket::where('user_id', $studioRequest->user_id)
                ->where('title', 'like', "%[STUDIO-{$studioRequest->id}]%")
                ->whereIn('status', ['open', 'pending'])
                ->first();

            if (!$ticket) {
                Log::warning('Studio: ticket non trouvé', ['studio_request_id' => $studioRequest->id]);
                return;
            }

            TicketMessage::create(['ticket_id' => $ticket->id, 'sender' => $sender, 'text' => $text]);

            $updates = ['first_response_at' => $ticket->first_response_at ?: now()];
            if ($closeStatus) {
                $updates['status'] = $closeStatus;
                if ($closeStatus === 'resolved') $updates['resolved_at'] = now();
            }
            $ticket->update($updates);
        } catch (\Exception $e) {
            Log::error('Studio: erreur message ticket', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }
    }

    private function createAdminNotification(StudioRequest $studioRequest): void
    {
        try {
            $admins = \App\Models\User::where('role', 'admin')->orWhere('is_admin', true)->get();
            foreach ($admins as $admin) {
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'studio_domain_new_request',
                    'priority' => 'high',
                    'status' => 'unread',
                    'title' => '🌐 Nouvelle demande de domaine',
                    'message' => "{$studioRequest->client_name} a soumis une demande pour {$studioRequest->domain}.",
                    'data' => ['studio_request_id' => $studioRequest->id, 'domain' => $studioRequest->domain, 'client_name' => $studioRequest->client_name],
                    'href' => '/admin/studio-domaine',
                    'category' => 'info',
                    'tags' => ['studio', 'domain', 'new'],
                    'show_badge' => true,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Studio: erreur notification admin', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }
    }

    private function sendAdminEmail(StudioRequest $studioRequest): void
    {
        try {
            $adminEmail = env('MAIL_ADMIN_EMAIL', config('mail.from.address'));
            Mail::to($adminEmail)->send(new StudioRequestNewMail($studioRequest));
        } catch (\Exception $e) {
            Log::error('Studio: email admin failed', ['id' => $studioRequest->id, 'error' => $e->getMessage()]);
        }
    }
}
