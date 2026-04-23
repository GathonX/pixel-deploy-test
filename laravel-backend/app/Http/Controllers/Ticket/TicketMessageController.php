<?php

namespace App\Http\Controllers\Ticket;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use App\Models\Ticket;
use App\Http\Resources\TicketMessageResource;
use App\Notifications\NewTicketMessageNotification;

class TicketMessageController extends Controller
{
    /**
     * GET /api/tickets/{ticket}/messages
     * Récupère les messages (Resource pour URL complètes).
     */
    public function index(Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $messages = $ticket->messages()
                           ->orderBy('created_at', 'asc')
                           ->get();

        return response()->json(
            TicketMessageResource::collection($messages)
        );
    }

    /**
     * POST /api/tickets/{ticket}/messages
     * Crée un message, notifie les admins, et renvoie la Resource.
     */
    public function store(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('update', $ticket);

        $data = $request->validate([
            'text'  => 'required|string',
            // ✅ CORRECTION : Validation unifiée pour tous types de fichiers
            'image' => 'nullable|file|max:5120|mimes:jpeg,jpg,png,gif,webp,pdf,doc,docx,txt,zip,rar',
            'file'  => 'nullable|file|max:5120|mimes:jpeg,jpg,png,gif,webp,pdf,doc,docx,txt,zip,rar',
        ]);

        $fileUrl = null;

        // ✅ Gestion des fichiers (priorité au champ 'file', sinon 'image')
        if ($request->hasFile('file')) {
            $fileUrl = $request
                ->file('file')
                ->store('ticket_messages', 'public');
        } elseif ($request->hasFile('image')) {
            $fileUrl = $request
                ->file('image')
                ->store('ticket_messages', 'public');
        }

        // 1) Création du message
        $message = $ticket->messages()->create([
            'sender'    => 'user',
            'text'      => $data['text'],
            'image_url' => $fileUrl, // Stocke l'URL du fichier (image ou autre)
        ]);

        // 2) ✅ CORRECTION : Créer notifications manuellement pour éviter l'erreur user_id
        try {
            $admins = \App\Models\User::where('is_admin', true)->get();

            foreach ($admins as $admin) {
                \App\Models\Notification::create([
                    'user_id' => $admin->id, // ✅ IMPORTANT : user_id pour notre table custom
                    'type' => 'ticket',
                    'priority' => 'high',
                    'status' => 'unread',
                    'title' => '💬 Nouveau message de ticket',
                    'message' => "Message de {$ticket->user->name} sur le ticket: {$ticket->title}",
                    'data' => [
                        'ticket_id' => $ticket->id,
                        'message_id' => $message->id,
                        'sender' => 'user',
                        'excerpt' => substr($message->text, 0, 50),
                        'ticket_title' => $ticket->title,
                        'created_at' => $message->created_at->toDateTimeString(),
                    ],
                    'href' => "/admin/tickets/{$ticket->id}",
                    'category' => 'support',
                    'tags' => ['support', 'ticket', 'message', 'user'],
                    'show_badge' => true,
                ]);
            }

            \Illuminate\Support\Facades\Log::info('✅ Notifications admins créées', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'admin_count' => $admins->count()
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('⌐ Erreur création notifications', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage()
            ]);
        }

        // 3) Renvoyer la Resource (201 Created)
        return response()->json(
            new TicketMessageResource($message),
            201
        );
    }
}
