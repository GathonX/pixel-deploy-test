<?php

namespace App\Http\Controllers\Ticket;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Ticket;
use App\Models\Notification; // ✅ AJOUTÉ : Ton modèle personnalisé
use App\Http\Resources\TicketResource;

class TicketController extends Controller
{
    /**
     * GET /api/tickets
     * Récupère les tickets avec leurs messages (Resource pour URL complètes).
     */
    public function index(Request $request): JsonResponse
    {
        $tickets = $request->user()
                           ->tickets()
                           ->with('messages')
                           ->orderBy('created_at', 'desc')
                           ->get();

        return response()->json(
            TicketResource::collection($tickets)
        );
    }

    /**
     * POST /api/tickets
     * Crée un ticket + message initial + notifie les admins.
     * ✅ CORRECTION : Support images ET fichiers (PDF, DOC, etc.)
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'required|string',
            'category'    => 'required|string',
            'image'       => 'nullable|file|max:5120|mimes:jpeg,jpg,png,gif,webp', // Images seulement
            'file'        => 'nullable|file|max:5120|mimes:pdf,doc,docx,txt,zip,rar', // Autres fichiers
        ]);

        $fileUrl = null;

        // ✅ Gestion des images
        if ($request->hasFile('image')) {
            $fileUrl = $request
                ->file('image')
                ->store('tickets', 'public');
        }

        // ✅ Gestion des autres fichiers (PDFs, DOCs, etc.)
        if ($request->hasFile('file')) {
            $fileUrl = $request
                ->file('file')
                ->store('tickets', 'public');
        }

        // 1) Création du ticket avec SLA
        $ticket = $request->user()->tickets()->create([
            'title'       => $data['title'],
            'description' => $data['description'],
            'category'    => $data['category'],
            'image_url'   => $fileUrl, // ✅ Stocke l'URL du fichier (image ou autre)
            'status'      => 'open',
            'priority'    => 'medium', // Par défaut
        ]);
        
        // ✅ Calculer et sauvegarder l'estimation SLA
        $ticket->estimated_response_hours = $ticket->calculateEstimatedResponse();
        $ticket->save();

        // 2) Message initial
        $ticket->messages()->create([
            'sender'    => 'user',
            'text'      => $data['description'],
            'image_url' => $fileUrl, // ✅ Stocke l'URL du fichier (image ou autre)
        ]);

        // 3) Charger les messages
        $ticket->load('messages');

        // ✅ 4) CORRECTION : Notifier tous les admins avec ton système personnalisé
        $admins = \App\Models\User::where('is_admin', true)->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id'     => $admin->id,
                'type'        => 'ticket',
                'priority'    => 'normal',
                'status'      => 'unread',
                'title'       => 'Nouveau ticket de support',
                'message'     => "Un nouveau ticket a été créé par {$request->user()->name}: {$ticket->title}",
                'data'        => [
                    'ticket_id'  => $ticket->id,
                    'title'      => $ticket->title,
                    'excerpt'    => substr($ticket->description, 0, 50),
                    'user_name'  => $request->user()->name,
                    'user_email' => $request->user()->email,
                    'category'   => $ticket->category,
                    'created_at' => $ticket->created_at->toDateTimeString(),
                    'has_file'   => !is_null($fileUrl), // ✅ NOUVEAU : Indique si fichier joint
                    'file_type'  => $fileUrl ? pathinfo($fileUrl, PATHINFO_EXTENSION) : null, // ✅ NOUVEAU : Type de fichier
                ],
                'href'        => "/admin/tickets/{$ticket->id}",
                'category'    => 'support',
                'tags'        => ['support', 'ticket', 'nouveau'],
                'show_badge'  => true,
            ]);
        }

        // ✅ LOG DEBUG : Création ticket avec fichier
        \Illuminate\Support\Facades\Log::info('✅ [TicketController] Ticket créé', [
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'has_image' => $request->hasFile('image'),
            'has_file' => $request->hasFile('file'),
            'file_url' => $fileUrl,
            'file_stored' => !is_null($fileUrl),
        ]);

        // 5) Renvoyer la Resource (201 Created)
        return response()->json(
            new TicketResource($ticket),
            201
        );
    }

    /**
     * DELETE /api/tickets/{ticket}
     * Supprime un ticket (uniquement si autorisé).
     */
    public function destroy(Ticket $ticket): JsonResponse
    {
        $this->authorize('delete', $ticket);
        $ticket->delete();

        // 204 No Content
        return response()->json(null, 204);
    }

    /**
     * POST /api/tickets/{ticket}/feedback
     * Soumet un feedback de satisfaction après résolution
     */
    public function submitFeedback(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket); // Seul le propriétaire peut donner un feedback

        // Vérifier que le feedback peut être soumis
        if (!$ticket->canSubmitFeedback()) {
            return response()->json([
                'success' => false,
                'message' => 'Ce ticket ne peut pas recevoir de feedback.'
            ], 422);
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Sauvegarder le feedback
        $ticket->update([
            'satisfaction_rating' => $data['rating'],
            'satisfaction_comment' => $data['comment'] ?? null,
            'feedback_submitted_at' => now(),
        ]);

        // ✅ Notifier les admins du nouveau feedback
        $admins = \App\Models\User::where('is_admin', true)->get();
        
        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'feedback',
                'priority' => 'normal',
                'status' => 'unread',
                'title' => '⭐ Nouveau feedback client',
                'message' => "Feedback {$data['rating']}/5 étoiles de {$ticket->user->name} sur le ticket #{$ticket->id}",
                'data' => [
                    'ticket_id' => $ticket->id,
                    'rating' => $data['rating'],
                    'comment' => $data['comment'],
                    'ticket_title' => $ticket->title,
                    'user_name' => $ticket->user->name,
                    'emoji' => $ticket->satisfaction_emoji,
                ],
                'href' => "/admin/tickets/{$ticket->id}",
                'category' => 'feedback',
                'tags' => ['feedback', 'satisfaction', 'ticket'],
                'show_badge' => true,
            ]);
        }

        \Illuminate\Support\Facades\Log::info('✅ Feedback soumis', [
            'ticket_id' => $ticket->id,
            'user_id' => $ticket->user_id,
            'rating' => $data['rating'],
            'has_comment' => !empty($data['comment']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Merci pour votre feedback !',
            'data' => [
                'rating' => $data['rating'],
                'emoji' => $ticket->satisfaction_emoji,
            ]
        ], 201);
    }
}
