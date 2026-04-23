<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TicketTemplate;
use App\Models\TicketHistory;
use App\Models\Notification;
use App\Models\User;
use App\Http\Resources\TicketResource;
use App\Http\Resources\TicketMessageResource;
// ✅ CORRECTION : Imports corrects (pas de "use", c'est des imports)
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TicketAdminController extends Controller
{
    // GET /api/admin/tickets
    public function index(): JsonResponse
    {
        $tickets = Ticket::with(['user','messages','assignedTo'])
                         ->orderBy('created_at', 'desc')
                         ->get();

        return response()->json(
            TicketResource::collection($tickets)
        );
    }

    // ✅ NOUVEAU : GET /api/admin/tickets/stats - Statistiques dashboard
    public function getStats(): JsonResponse
    {
        try {
            $stats = [
                // Compteurs par statut
                'total_tickets' => Ticket::count(),
                'open_tickets' => Ticket::where('status', 'open')->count(),
                'pending_tickets' => Ticket::where('status', 'pending')->count(),
                'resolved_tickets' => Ticket::where('status', 'resolved')->count(),
                
                // Compteurs nouveaux statuts (avec vérification)
                'in_progress_tickets' => Ticket::where('status', 'in_progress')->count(),
                'waiting_info_tickets' => Ticket::where('status', 'waiting_info')->count(),
                'escalated_tickets' => Ticket::where('status', 'escalated')->count(),
                
                // Tickets en retard (gestion sécurisée)
                'overdue_tickets' => $this->countOverdueTickets(),
                
                // Temps de réponse moyen (en heures)
                'avg_response_time' => $this->calculateAverageResponseTime(),
                
                // Satisfaction moyenne (avec vérification de colonne)
                'avg_satisfaction' => $this->getAverageSatisfaction(),
                
                // Stats par catégorie
                'tickets_by_category' => Ticket::selectRaw('category, COUNT(*) as count')
                    ->groupBy('category')
                    ->pluck('count', 'category')
                    ->toArray(),
                
                // Activité récente (7 derniers jours) - gestion sécurisée
                'recent_activity' => $this->getRecentActivity(),
                
                // Top priorités (gestion sécurisée)
                'urgent_tickets' => $this->getUrgentTicketsCount(),
                
                // Performance SLA
                'sla_performance' => $this->getSLAPerformance(),
            ];

            return response()->json($stats);
        } catch (\Exception $e) {
            \Log::error('Erreur dans getStats(): ' . $e->getMessage());
            
            // Statistiques de base en cas d'erreur
            return response()->json([
                'total_tickets' => Ticket::count(),
                'open_tickets' => Ticket::where('status', 'open')->count(),
                'pending_tickets' => Ticket::where('status', 'pending')->count(),
                'resolved_tickets' => Ticket::where('status', 'resolved')->count(),
                'error' => 'Certaines statistiques avancées ne sont pas disponibles'
            ]);
        }
    }

    /**
     * ✅ Calcule le temps de réponse moyen (sécurisé)
     */
    private function calculateAverageResponseTime(): float
    {
        try {
            $tickets = Ticket::whereNotNull('first_response_at')->get();
            
            if ($tickets->isEmpty()) {
                return 0;
            }
            
            $totalHours = $tickets->sum(function ($ticket) {
                return $ticket->created_at->diffInHours($ticket->first_response_at);
            });
            
            return round($totalHours / $tickets->count(), 1);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * ✅ Compte les tickets en retard de manière sécurisée
     */
    private function countOverdueTickets(): int
    {
        try {
            return Ticket::where('status', '!=', 'resolved')
                ->get()
                ->filter(function ($ticket) {
                    try {
                        return $ticket->isOverdue();
                    } catch (\Exception $e) {
                        return false;
                    }
                })
                ->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * ✅ Obtient la satisfaction moyenne de manière sécurisée
     */
    private function getAverageSatisfaction(): ?float
    {
        try {
            return Ticket::whereNotNull('satisfaction_rating')->avg('satisfaction_rating');
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * ✅ Obtient l'activité récente de manière sécurisée
     */
    private function getRecentActivity(): array
    {
        try {
            return [
                'new_tickets' => Ticket::where('created_at', '>=', now()->subDays(7))->count(),
                'resolved_tickets' => Ticket::whereNotNull('resolved_at')
                    ->where('resolved_at', '>=', now()->subDays(7))->count(),
                'feedbacks_received' => Ticket::whereNotNull('feedback_submitted_at')
                    ->where('feedback_submitted_at', '>=', now()->subDays(7))->count(),
            ];
        } catch (\Exception $e) {
            return [
                'new_tickets' => Ticket::where('created_at', '>=', now()->subDays(7))->count(),
                'resolved_tickets' => 0,
                'feedbacks_received' => 0,
            ];
        }
    }

    /**
     * ✅ Compte les tickets urgents de manière sécurisée
     */
    private function getUrgentTicketsCount(): int
    {
        try {
            return Ticket::where('status', '!=', 'resolved')
                ->where('priority', 'high')
                ->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * ✅ Obtient les performances SLA de manière sécurisée
     */
    private function getSLAPerformance(): array
    {
        try {
            $onTime = Ticket::whereNotNull('first_response_at')
                ->get()
                ->filter(function ($ticket) {
                    try {
                        return !$ticket->isOverdue();
                    } catch (\Exception $e) {
                        return false;
                    }
                })
                ->count();

            $overdue = $this->countOverdueTickets();

            return [
                'on_time' => $onTime,
                'overdue' => $overdue,
            ];
        } catch (\Exception $e) {
            return [
                'on_time' => 0,
                'overdue' => 0,
            ];
        }
    }

    // ✅ NOUVEAU : GET /api/admin/tickets/templates - Liste des templates
    public function getTemplates(Request $request): JsonResponse
    {
        try {
            $query = TicketTemplate::active();

            // Filtrer par catégorie si demandé
            if ($request->has('category') && $request->category !== 'all') {
                $query->byCategory($request->category);
            }

            $templates = $query->orderBy('usage_count', 'desc')
                              ->orderBy('name')
                              ->get();

            return response()->json($templates);
        } catch (\Exception $e) {
            \Log::error('Erreur dans getTemplates(): ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Impossible de récupérer les templates',
                'templates' => []
            ], 500);
        }
    }

    // ✅ NOUVEAU : POST /api/admin/tickets/templates/{template}/use - Utiliser un template
    public function useTemplate(TicketTemplate $template): JsonResponse
    {
        $template->incrementUsage();
        
        return response()->json([
            'success' => true,
            'template' => $template,
        ]);
    }

    // ✅ NOUVEAU : GET /api/admin/users - Liste des admins pour l'assignation
    public function getAdmins(): JsonResponse
    {
        $admins = \App\Models\User::where('is_admin', true)
                                 ->select('id', 'name', 'email')
                                 ->orderBy('name')
                                 ->get();
        
        return response()->json($admins);
    }

    // ✅ NOUVEAU : POST /api/admin/tickets/{ticket}/assign - Assigner un ticket
    public function assignTicket(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'admin_id' => 'nullable|exists:users,id',
        ]);

        // Vérifier que l'admin_id est bien un admin (si fourni)
        if ($data['admin_id']) {
            $admin = \App\Models\User::find($data['admin_id']);
            if (!$admin || !$admin->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Utilisateur invalide ou non-admin.',
                ], 422);
            }
        }

        $ticket->assignTo($data['admin_id'], auth()->id());

        // Recharger le ticket avec les relations
        $ticket->load(['user', 'messages', 'assignedTo']);

        return response()->json([
            'success' => true,
            'message' => $data['admin_id'] 
                ? 'Ticket assigné avec succès.' 
                : 'Assignment retiré avec succès.',
            'ticket' => new TicketResource($ticket),
        ]);
    }

    // GET /api/admin/tickets/{ticket}
    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['user','messages','assignedTo']);
        return response()->json(
            new TicketResource($ticket)
        );
    }

    // PUT /api/admin/tickets/{ticket}
    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status'   => 'sometimes|in:open,pending,resolved,in_progress,waiting_info,escalated',
            'priority' => 'sometimes|in:high,medium,low',
        ]);

        // ✅ Enregistrer les changements dans l'historique
        $oldStatus = $ticket->status;
        $oldPriority = $ticket->priority;

        // ✅ Marquer la date de résolution si le statut change vers 'resolved'
        if (isset($data['status']) && $data['status'] === 'resolved' && $ticket->status !== 'resolved') {
            $data['resolved_at'] = now();
        }

        // ✅ Recalculer l'estimation si la priorité change
        if (isset($data['priority']) && $data['priority'] !== $ticket->priority) {
            $data['estimated_response_hours'] = $ticket->calculateEstimatedResponse();
        }

        $ticket->update($data);

        // ✅ Enregistrer dans l'historique après mise à jour
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            \App\Models\TicketHistory::logChange($ticket->id, auth()->id(), 'status_changed', 'status', $oldStatus, $data['status']);
        }

        if (isset($data['priority']) && $data['priority'] !== $oldPriority) {
            \App\Models\TicketHistory::logChange($ticket->id, auth()->id(), 'priority_changed', 'priority', $oldPriority, $data['priority']);
        }

        return response()->json(
            new TicketResource($ticket)
        );
    }

    // GET /api/admin/tickets/{ticket}/messages
    public function messages(Ticket $ticket): JsonResponse
    {
        $messages = $ticket->messages()
                           ->orderBy('created_at', 'asc')
                           ->get();

        return response()->json(
            TicketMessageResource::collection($messages)
        );
    }

    // ✅ NOUVEAU : GET /api/admin/tickets/{ticket}/history - Historique des modifications
    public function history(Ticket $ticket): JsonResponse
    {
        try {
            $history = $ticket->history()
                              ->with('user:id,name,email')
                              ->get()
                              ->map(function ($entry) {
                                  try {
                                      return [
                                          'id' => $entry->id,
                                          'action' => $entry->action,
                                          'action_label' => $entry->action_label ?? $entry->action,
                                          'description' => $entry->formatted_description ?? 'Modification apportée',
                                          'user' => [
                                              'id' => $entry->user->id ?? 0,
                                              'name' => $entry->user->name ?? 'Utilisateur inconnu',
                                              'email' => $entry->user->email ?? '',
                                          ],
                                          'created_at' => $entry->created_at->toDateTimeString(),
                                          'created_at_human' => $entry->created_at->diffForHumans(),
                                      ];
                                  } catch (\Exception $e) {
                                      \Log::error('Erreur formatage historique: ' . $e->getMessage());
                                      return [
                                          'id' => $entry->id,
                                          'action' => $entry->action ?? 'unknown',
                                          'action_label' => $entry->action ?? 'Modification',
                                          'description' => 'Erreur de formatage',
                                          'user' => [
                                              'id' => 0,
                                              'name' => 'Erreur',
                                              'email' => '',
                                          ],
                                          'created_at' => $entry->created_at ? $entry->created_at->toDateTimeString() : now()->toDateTimeString(),
                                          'created_at_human' => $entry->created_at ? $entry->created_at->diffForHumans() : 'Date inconnue',
                                      ];
                                  }
                              });

            return response()->json($history);
        } catch (\Exception $e) {
            Log::error('Erreur dans history(): ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Impossible de récupérer l\'historique',
                'history' => []
            ]);
        }
    }


// POST /api/admin/tickets/{ticket}/messages
public function storeMessage(Request $request, Ticket $ticket): JsonResponse
{
    $data = $request->validate([
        'text'  => 'required|string',
        'image' => 'nullable|file|max:5120|mimes:jpeg,jpg,png,gif,webp', // Images seulement
        'file'  => 'nullable|file|max:5120|mimes:pdf,doc,docx,txt,zip,rar', // Autres fichiers
    ]);

    $fileUrl = null;

    // ✅ Gestion des images
    if ($request->hasFile('image')) {
        $fileUrl = $request
            ->file('image')
            ->store('ticket_messages', 'public');
    }

    // ✅ Gestion des autres fichiers
    if ($request->hasFile('file')) {
        $fileUrl = $request
            ->file('file')
            ->store('ticket_messages', 'public');
    }

    // Création du message
    $message = $ticket->messages()->create([
        'sender'    => 'admin',
        'text'      => $data['text'],
        'image_url' => $fileUrl, // Stocke l'URL du fichier (image ou autre)
    ]);

    // ✅ Marquer la première réponse si c'est le cas
    if (!$ticket->first_response_at) {
        $ticket->first_response_at = now();
        $ticket->save();
    }

    // 🔔 Notifier l'utilisateur dans l'app
    Notification::create([
        'user_id'     => $ticket->user_id,
        'type'        => 'ticket',
        'priority'    => 'high',
        'status'      => 'unread',
        'title'       => '💬 Nouvelle réponse à votre ticket',
        'message'     => "Un administrateur a répondu à votre ticket: {$ticket->title}",
        'data'        => [
            'ticket_id'    => $ticket->id,
            'message_id'   => $message->id,
            'sender'       => 'admin',
            'excerpt'      => substr($message->text, 0, 50),
            'ticket_title' => $ticket->title,
            'created_at'   => $message->created_at->toDateTimeString(),
        ],
        'href'        => "/tickets/{$ticket->id}",
        'category'    => 'support',
        'tags'        => ['support', 'ticket', 'réponse', 'admin'],
        'show_badge'  => true,
    ]);

    // 📧 Envoyer email à l'utilisateur
    try {
        $this->sendTicketReplyEmail($ticket, $message, $ticket->user);

        Log::info('📧 Email de réponse ticket envoyé', [
            'ticket_id' => $ticket->id,
            'user_email' => $ticket->user->email,
            'admin_id' => auth()->id()
        ]);
    } catch (\Exception $e) {
        Log::error('❌ Erreur envoi email réponse ticket', [
            'ticket_id' => $ticket->id,
            'error' => $e->getMessage()
        ]);
    }

    return response()->json(
        new TicketMessageResource($message),
        201
    );
}


    /**
 * 📧 Envoyer email de réponse admin → utilisateur (VERSION PROFESSIONNELLE)
 */
private function sendTicketReplyEmail($ticket, $message, $user): void
{
    $subject = "Réponse à votre demande de support #{$ticket->id} - {$ticket->title}";

    $emailContent = "Bonjour {$user->name},

Nous accusons réception de votre demande et vous apportons une réponse détaillée.

DÉTAILS DE VOTRE DEMANDE
-----------------------------------------
Titre : {$ticket->title}
Numéro de référence : #{$ticket->id}
Catégorie : {$ticket->category}
Date de création : {$ticket->created_at->format('d/m/Y à H:i')}

RÉPONSE DE NOTRE ÉQUIPE TECHNIQUE
-----------------------------------------
{$message->text}

SUITE À DONNER
-----------------------------------------
Vous pouvez poursuivre cet échange directement depuis votre espace client :
" . config('app.frontend_url') . "/tickets/{$ticket->id}

Vous pouvez également répondre directement à ce message.

Notre équipe support reste à votre entière disposition pour vous accompagner dans vos démarches.

Cordialement,
L'équipe Support PixelRise
" . config('app.frontend_url');

    Mail::raw($emailContent, function ($mailMessage) use ($user, $subject) {
        $mailMessage->to($user->email)
                   ->subject($subject);
    });
}


    // DELETE /api/admin/tickets/{ticket}
    public function destroy(Ticket $ticket): JsonResponse
    {
        $ticket->delete();
        return response()->json(null, 204);
    }


public function approveRequest(Request $request, int $requestId): JsonResponse
{
    $request->validate([
        'admin_response' => 'nullable|string',
    ]);

    try {
        $activationRequest = FeatureActivationRequest::with(['user', 'feature'])
            ->findOrFail($requestId);

        // Approuver la demande
        $activationRequest->approve(auth()->id(), $request->admin_response);

        // 📧 Envoyer email de confirmation à l'utilisateur
        $this->sendApprovalEmail($activationRequest, $request->admin_response);

        // 🔔 Créer notification pour l'utilisateur
        $this->createApprovalNotification($activationRequest);

        Log::info('✅ Demande d\'activation approuvée', [
            'request_id' => $requestId,
            'user_id' => $activationRequest->user_id,
            'feature_id' => $activationRequest->feature_id,
            'admin_id' => auth()->id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande approuvée et accès activé'
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur approbation demande', [
            'request_id' => $requestId,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de l\'approbation'
        ], 500);
    }
}

// Remplacez la méthode rejectRequest par :

public function rejectRequest(Request $request, int $requestId): JsonResponse
{
    $request->validate([
        'admin_response' => 'required|string',
    ]);

    try {
        $activationRequest = FeatureActivationRequest::with(['user', 'feature'])
            ->findOrFail($requestId);

        // Rejeter la demande
        $activationRequest->reject(auth()->id(), $request->admin_response);

        // 📧 Envoyer email de rejet à l'utilisateur
        $this->sendRejectionEmail($activationRequest, $request->admin_response);

        // 🔔 Créer notification pour l'utilisateur
        $this->createRejectionNotification($activationRequest, $request->admin_response);

        Log::info('❌ Demande d\'activation rejetée', [
            'request_id' => $requestId,
            'user_id' => $activationRequest->user_id,
            'feature_id' => $activationRequest->feature_id,
            'admin_id' => auth()->id()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Demande rejetée'
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur rejet demande', [
            'request_id' => $requestId,
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du rejet'
        ], 500);
    }
}

private function sendApprovalEmail($activationRequest, $adminResponse): void
{
    try {
        $subject = "Approbation de votre demande d'activation - {$activationRequest->feature->name}";

        $emailContent = "Bonjour {$activationRequest->full_name},

Nous avons le plaisir de vous confirmer l'approbation de votre demande d'activation.

DÉTAILS DE L'APPROBATION
-----------------------------------------
Fonctionnalité : {$activationRequest->feature->name}
Montant validé : {$activationRequest->amount_claimed}€
Référence : #{$activationRequest->id}
Date d'activation : " . now()->format('d/m/Y à H:i') . "

ACTIVATION DE VOTRE FONCTIONNALITÉ
-----------------------------------------
Pour procéder à l'activation, veuillez suivre ces étapes :

1. Connectez-vous à votre espace client PixelRise
2. Accédez à la section 'Gestion des Fonctionnalités'
3. Activez la fonctionnalité {$activationRequest->feature->name}
4. La fonctionnalité sera immédiatement disponible

Lien direct : " . config('app.frontend_url') . "/features";

        if ($adminResponse) {
            $emailContent .= "\n\nMESSAGE DE NOTRE ÉQUIPE
-----------------------------------------
{$adminResponse}";
        }

        $emailContent .= "\n\nPour toute assistance technique, notre équipe support reste à votre disposition.

Nous vous remercions de votre confiance.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

        Mail::raw($emailContent, function ($message) use ($activationRequest, $subject) {
            $message->to($activationRequest->email)
                   ->subject($subject);
        });

        Log::info('📧 Email d\'approbation envoyé', [
            'user_email' => $activationRequest->email,
            'feature' => $activationRequest->feature->name
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur envoi email approbation', [
            'user_email' => $activationRequest->email,
            'error' => $e->getMessage()
        ]);
    }
}

/**
 * 📧 Email de rejet (VERSION PROFESSIONNELLE)
 */
private function sendRejectionEmail($activationRequest, $reason): void
{
    try {
        $subject = "Demande d'activation {$activationRequest->feature->name} - Informations complémentaires requises";

        $emailContent = "Bonjour {$activationRequest->full_name},

Nous accusons réception de votre demande d'activation et vous remercions de votre intérêt pour nos services.

STATUT DE VOTRE DEMANDE
-----------------------------------------
Fonctionnalité : {$activationRequest->feature->name}
Montant déclaré : {$activationRequest->amount_claimed}€
Référence : #{$activationRequest->id}

OBSERVATIONS DE NOTRE ÉQUIPE
-----------------------------------------
{$reason}

ÉTAPES SUIVANTES
-----------------------------------------
Pour finaliser votre demande, vous pouvez :

• Soumettre une nouvelle demande avec les justificatifs appropriés
• Nous contacter pour obtenir des précisions sur les éléments requis
• Compléter votre dossier en nous transmettant les informations manquantes

Nouvelle demande : " . config('app.frontend_url') . "/features/purchase/{$activationRequest->feature_id}
Support technique : " . config('app.frontend_url') . "/dashboard/tickets

Notre service client reste à votre entière disposition pour vous accompagner dans cette démarche.

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

        Mail::raw($emailContent, function ($message) use ($activationRequest, $subject) {
            $message->to($activationRequest->email)
                   ->subject($subject);
        });

        Log::info('📧 Email de rejet envoyé', [
            'user_email' => $activationRequest->email,
            'feature' => $activationRequest->feature->name
        ]);

    } catch (\Exception $e) {
        Log::error('❌ Erreur envoi email rejet', [
            'user_email' => $activationRequest->email,
            'error' => $e->getMessage()
        ]);
    }
}


/**
 * 🔔 Notification d'approbation dans l'app (VERSION PROFESSIONNELLE)
 */
private function createApprovalNotification($activationRequest): void
{
    Notification::create([
        'user_id' => $activationRequest->user_id,
        'type' => 'feature_approved',
        'priority' => 'high',
        'status' => 'unread',
        'title' => 'Fonctionnalité activée',
        'message' => "Votre demande d'activation de {$activationRequest->feature->name} a été approuvée.",
        'data' => [
            'activation_request_id' => $activationRequest->id,
            'feature_id' => $activationRequest->feature_id,
            'feature_name' => $activationRequest->feature->name,
            'amount' => $activationRequest->amount_claimed,
            'approved_at' => now()->toDateTimeString(),
        ],
        'href' => "/features",
        'category' => 'success',
        'tags' => ['feature', 'activation', 'approved', 'payment'],
        'show_badge' => true,
    ]);
}

/**
 * 🔔 Notification de rejet dans l'app (VERSION PROFESSIONNELLE)
 */
private function createRejectionNotification($activationRequest, $reason): void
{
    Notification::create([
        'user_id' => $activationRequest->user_id,
        'type' => 'feature_rejected',
        'priority' => 'high',
        'status' => 'unread',
        'title' => 'Demande d\'activation',
        'message' => "Votre demande d'activation de {$activationRequest->feature->name} nécessite des informations complémentaires.",
        'data' => [
            'activation_request_id' => $activationRequest->id,
            'feature_id' => $activationRequest->feature_id,
            'feature_name' => $activationRequest->feature->name,
            'reason' => $reason,
            'rejected_at' => now()->toDateTimeString(),
        ],
        'href' => "/features/purchase/{$activationRequest->feature_id}",
        'category' => 'warning',
        'tags' => ['feature', 'activation', 'rejected', 'payment'],
        'show_badge' => true,
    ]);
}

}
