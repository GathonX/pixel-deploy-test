<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\Notification;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications - Liste des notifications avec filtres
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $query = Notification::where('user_id', $user->id)
                ->notExpired()
                ->orderBy('created_at', 'desc');

            // ✅ NOUVEAU : Filtres compatibles avec le frontend
            if ($request->has('types')) {
                $types = explode(',', $request->get('types'));
                $query->whereIn('type', $types);
            }

            if ($request->has('statuses')) {
                $statuses = explode(',', $request->get('statuses'));
                $query->whereIn('status', $statuses);
            }

            if ($request->has('priorities')) {
                $priorities = explode(',', $request->get('priorities'));
                $query->whereIn('priority', $priorities);
            }

            // Recherche dans titre et message
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('message', 'like', "%{$search}%");
                });
            }

            // Pagination
            $perPage = min($request->get('per_page', 20), 50);
            $notifications = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Notifications récupérées avec succès',
                'data' => $notifications->items(),
                'meta' => [
                    'total' => $notifications->total(),
                    'unread' => Notification::countUnread($user->id), // ✅ CORRECTION
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur récupération notifications', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des notifications',
                'error' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * ✅ CORRECTION : GET /api/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $count = Notification::countUnread($user->id); // ✅ Utilise la méthode du model

            return response()->json([
                'success' => true,
                'count' => $count
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur count notifications', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'count' => 0
            ]);
        }
    }

    /**
     * ✅ CORRECTION : GET /api/notifications/stats
     */
    public function stats(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            $stats = [
                'total' => Notification::where('user_id', $user->id)->notExpired()->count(),
                'unread' => Notification::countUnread($user->id), // ✅ Utilise la méthode du model
                'byType' => Notification::where('user_id', $user->id)
                    ->notExpired()
                    ->selectRaw('type, COUNT(*) as count')
                    ->groupBy('type')
                    ->pluck('count', 'type')
                    ->toArray(),
                'byPriority' => Notification::where('user_id', $user->id)
                    ->notExpired()
                    ->selectRaw('priority, COUNT(*) as count')
                    ->groupBy('priority')
                    ->pluck('count', 'priority')
                    ->toArray(),
                'last24Hours' => Notification::where('user_id', $user->id)
                    ->notExpired()
                    ->where('created_at', '>=', now()->subDay())
                    ->count(),
                'last7Days' => Notification::where('user_id', $user->id)
                    ->notExpired()
                    ->where('created_at', '>=', now()->subWeek())
                    ->count(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur statistiques notifications', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => app()->environment('local') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * POST /api/notifications/{id}/read - Marquer comme lue (amélioré)
     */
   public function markAsRead(Request $request, $id): JsonResponse
{
    try {
        $user = $request->user();
        $notification = Notification::where('user_id', $user->id)->where('id', $id)->firstOrFail();
        $notification->markAsRead();
        Log::info('Notification marquée comme lue', [
            'notification_id' => $notification->id,
            'user_id' => $user->id,
            'type' => $notification->type
        ]);
        return response()->json([
            'success' => true,
            'message' => 'Notification marquée comme lue',
            'data' => $this->formatNotification($notification)
        ]);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Notification non trouvée'
        ], 404);
    } catch (\Exception $e) {
        Log::error('Erreur marquage notification', [
            'notification_id' => $id,
            'user_id' => $request->user()->id,
            'error' => $e->getMessage()
        ]);
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du marquage de la notification'
        ], 500);
    }
}
    /**
     * ✅ NOUVEAU : POST /api/notifications/mark-all-read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $type = $request->get('type'); // Optionnel : marquer seulement un type

            $query = Notification::where('user_id', $user->id)
                ->where('status', 'unread')
                ->notExpired();

            if ($type) {
                $query->where('type', $type);
            }

            $count = $query->count();
            $query->update([
                'status' => 'read',
                'read_at' => now()
            ]);

            Log::info('Notifications marquées comme lues en masse', [
                'user_id' => $user->id,
                'count' => $count,
                'type' => $type
            ]);

            return response()->json([
                'success' => true,
                'message' => $type
                    ? "Toutes les notifications {$type} ont été marquées comme lues"
                    : 'Toutes les notifications ont été marquées comme lues',
                'count' => $count
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur marquage multiple notifications', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du marquage des notifications'
            ], 500);
        }
    }

    /**
     * DELETE /api/notifications/{id} - Supprimer (amélioré)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $notification = Notification::where('user_id', $user->id)->where('id', $id)->firstOrFail(); // ✅ CORRECTION

            // Empêcher la suppression des notifications persistantes
            if ($notification->persistent ?? false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette notification ne peut pas être supprimée'
                ], 403);
            }

            $notification->delete();

            Log::info('Notification supprimée', [
                'notification_id' => $id,
                'user_id' => $user->id,
                'type' => $notification->type
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification supprimée avec succès'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Notification non trouvée'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Erreur suppression notification', [
                'notification_id' => $id,
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : POST /api/notifications/{id}/archive
     */
    public function archive(Request $request, $id): JsonResponse
    {
        try {
            $user = $request->user();
            $notification = Notification::where('user_id', $user->id)->where('id', $id)->firstOrFail(); // ✅ CORRECTION

            $notification->update(['status' => 'archived']);

            return response()->json([
                'success' => true,
                'message' => 'Notification archivée',
                'data' => $this->formatNotification($notification)
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Notification non trouvée'
            ], 404);

        } catch (\Exception $e) {
            Log::error('Erreur archivage notification', [
                'notification_id' => $id,
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'archivage'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : POST /api/notifications - Créer une notification (pour admins)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'type' => 'required|string|in:order,ticket,payment,user,system,marketing,security,funnel,email,project,admin,custom',
                'priority' => 'sometimes|string|in:low,normal,high,urgent',
                'title' => 'required|string|max:255',
                'message' => 'required|string',
                'data' => 'sometimes|array',
                'href' => 'sometimes|string|max:255',
                'category' => 'sometimes|string|max:100',
                'tags' => 'sometimes|array',
                'expires_at' => 'sometimes|date'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données de notification invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();

            $notification = Notification::create([
                'user_id' => $user->id,
                'type' => $request->type,
                'priority' => $request->priority ?? 'normal',
                'status' => 'unread',
                'title' => $request->title,
                'message' => $request->message,
                'data' => $request->data ?? [],
                'href' => $request->href,
                'category' => $request->category,
                'tags' => $request->tags ?? [],
                'expires_at' => $request->expires_at,
            ]);

            Log::info('Notification créée via API', [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'type' => $notification->type
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notification créée avec succès',
                'data' => $this->formatNotification($notification)
            ], 201);

        } catch (\Exception $e) {
            Log::error('Erreur création notification', [
                'user_id' => $request->user()->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la notification'
            ], 500);
        }
    }


    /**
     * Méthode helper pour formater une notification
     */
    private function formatNotification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'priority' => $notification->priority,
            'status' => $notification->status,
            'title' => $notification->title,
            'message' => $notification->message,
            'data' => $notification->data,
            'href' => $notification->href,
            'category' => $notification->category,
            'tags' => $notification->tags,
            'show_badge' => $notification->show_badge,
            'created_at' => $notification->created_at->toISOString(),
            'read_at' => $notification->read_at?->toISOString(),
            'expires_at' => $notification->expires_at?->toISOString(),
        ];
    }
}
