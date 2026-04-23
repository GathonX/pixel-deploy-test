<?php

namespace App\Http\Controllers\API\Reservation;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\User;
use App\Models\UserFeatureAccess;
use App\Models\Feature;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Mail\ReservationReceived;
use App\Mail\ReservationMasked;
use App\Models\Task;
use App\Models\UserSite;
use Carbon\Carbon;

class ReservationController extends Controller
{
    public function __construct()
    {
        // ✅ NOUVEAU : Ajouter authentification pour les méthodes dashboard
        $this->middleware('auth:sanctum')->only([
            'getDashboardReservations',
            'getDashboardStats',
            'getCalendarReservations',
            'getDashboardReservationDetails',
            'updateReservationStatus',
            'exportCsv',
            'getAnalytics',
        ]);
    }

    // ===== MÉTHODES DASHBOARD (NOUVELLES) =====

    /**
     * ✅ NOUVEAU : GET /api/reservations/dashboard - Liste des réservations pour dashboard
     * Affiche les réservations des clients de l'utilisateur connecté
     */
    public function getDashboardReservations(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'status' => 'nullable|in:pending,confirmed,cancelled',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from',
                'search' => 'nullable|string|max:255',
                'per_page' => 'nullable|integer|min:1|max:100',
                'sort_by' => 'nullable|in:date,created_at,name,status',
                'sort_order' => 'nullable|in:asc,desc'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // ✅ Multi-sites workspace : récupérer les réservations de tous les membres du workspace
            $workspace = Workspace::where('owner_user_id', $user->id)->first();
            if (!$workspace) {
                $membership = WorkspaceUser::where('user_id', $user->id)->first();
                if ($membership) $workspace = Workspace::find($membership->workspace_id);
            }

            if ($workspace) {
                $memberIds = WorkspaceUser::where('workspace_id', $workspace->id)->pluck('user_id')->toArray();
                $query = Reservation::whereIn('client_id', $memberIds);
            } else {
                $query = Reservation::where('client_id', $user->id);
            }

            // Filtres
            if ($request->status) {
                $query->where('status', $request->status);
            }

            if ($request->date_from) {
                $query->whereDate('date', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $query->whereDate('date', '<=', $request->date_to);
            }

            if ($request->search) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('interest_description', 'like', "%{$search}%");
                });
            }

            // Tri
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            // Si tri par date, ajouter tri secondaire par heure
            if ($sortBy === 'date') {
                $query->orderBy('time', $sortOrder);
            }

            $reservations = $query->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $reservations,
                'message' => 'Réservations récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des réservations'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : GET /api/reservations/dashboard/stats - Statistiques dashboard
     */
    public function getDashboardStats(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'period' => 'nullable|in:today,week,month,year',
                'date_from' => 'nullable|date',
                'date_to' => 'nullable|date|after_or_equal:date_from'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Définir la période
            $period = $request->get('period', 'month');
            $dateFrom = $request->date_from;
            $dateTo = $request->date_to;

            if (!$dateFrom || !$dateTo) {
                switch ($period) {
                    case 'today':
                        $dateFrom = Carbon::today();
                        $dateTo = Carbon::today();
                        break;
                    case 'week':
                        $dateFrom = Carbon::now()->startOfWeek();
                        $dateTo = Carbon::now()->endOfWeek();
                        break;
                    case 'month':
                        $dateFrom = Carbon::now()->startOfMonth();
                        $dateTo = Carbon::now()->endOfMonth();
                        break;
                    case 'year':
                        $dateFrom = Carbon::now()->startOfYear();
                        $dateTo = Carbon::now()->endOfYear();
                        break;
                }
            }

            // Multi-sites workspace : inclure tous les membres
            $workspace2 = Workspace::where('owner_user_id', $user->id)->first();
            if (!$workspace2) {
                $m2 = WorkspaceUser::where('user_id', $user->id)->first();
                if ($m2) $workspace2 = Workspace::find($m2->workspace_id);
            }
            $statsIds = $workspace2
                ? WorkspaceUser::where('workspace_id', $workspace2->id)->pluck('user_id')->toArray()
                : [$user->id];

            $baseQuery = Reservation::whereIn('client_id', $statsIds)
                                   ->whereBetween('date', [$dateFrom, $dateTo]);

            // ✅ Statistiques principales
            $stats = [
                'total_reservations' => (clone $baseQuery)->count(),
                'pending_reservations' => (clone $baseQuery)->where('status', 'pending')->count(),
                'confirmed_reservations' => (clone $baseQuery)->where('status', 'confirmed')->count(),
                'cancelled_reservations' => (clone $baseQuery)->where('status', 'cancelled')->count(),
                'partial_reservations' => (clone $baseQuery)->where('is_partial', true)->count(),
                'completed_reservations' => (clone $baseQuery)->where('is_partial', false)->count(),
                'total_guests' => (clone $baseQuery)->sum('guests'),
                'avg_guests_per_reservation' => (clone $baseQuery)->avg('guests'),
            ];

            // ✅ Réservations par source
            $sourceStats = (clone $baseQuery)->select('source')
                                             ->selectRaw('count(*) as count')
                                             ->groupBy('source')
                                             ->get()
                                             ->pluck('count', 'source')
                                             ->toArray();

            // ✅ Réservations par jour (graphique)
            $dailyStats = (clone $baseQuery)->select('date')
                                            ->selectRaw('count(*) as reservations, sum(guests) as guests')
                                            ->groupBy('date')
                                            ->orderBy('date')
                                            ->get()
                                            ->map(function($item) {
                                                return [
                                                    'date' => $item->date,
                                                    'reservations' => $item->reservations,
                                                    'guests' => $item->guests
                                                ];
                                            });

            // ✅ Réservations récentes (5 dernières)
            $recentReservations = Reservation::where('client_id', $user->id)
                                            ->orderBy('created_at', 'desc')
                                            ->limit(5)
                                            ->get(['id', 'name', 'email', 'date', 'time', 'guests', 'status', 'created_at']);

            return response()->json([
                'success' => true,
                'data' => [
                    'period' => [
                        'from' => $dateFrom->format('Y-m-d'),
                        'to' => $dateTo->format('Y-m-d'),
                        'label' => $period
                    ],
                    'stats' => $stats,
                    'source_breakdown' => $sourceStats,
                    'daily_stats' => $dailyStats,
                    'recent_reservations' => $recentReservations
                ],
                'message' => 'Statistiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
     * GET /api/reservations/calendar?year=Y&month=M
     * Retourne les réservations du mois pour l'affichage dans le calendrier.
     */
    public function getCalendarReservations(Request $request): JsonResponse
    {
        try {
            $user  = Auth::user();
            $year  = (int) $request->get('year', date('Y'));
            $month = (int) $request->get('month', date('n'));

            // Résoudre les IDs de clients du workspace
            $workspace = Workspace::where('owner_user_id', $user->id)->first();
            if (!$workspace) {
                $membership = WorkspaceUser::where('user_id', $user->id)->first();
                if ($membership) $workspace = Workspace::find($membership->workspace_id);
            }

            if ($workspace) {
                $clientIds = WorkspaceUser::where('workspace_id', $workspace->id)->pluck('user_id')->toArray();
            } else {
                $clientIds = [$user->id];
            }

            $reservations = Reservation::whereIn('client_id', $clientIds)
                ->whereYear('date', $year)
                ->whereMonth('date', $month)
                ->orderBy('date')
                ->get(['id', 'name', 'date', 'guests', 'status'])
                ->map(fn($r) => [
                    'id'     => $r->id,
                    'name'   => $r->name,
                    'date'   => $r->date->format('Y-m-d'),
                    'guests' => $r->guests,
                    'status' => $r->status,
                ]);

            return response()->json(['success' => true, 'data' => $reservations]);

        } catch (\Exception $e) {
            Log::error('getCalendarReservations erreur', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'data' => []]);
        }
    }

    /**
     * ✅ NOUVEAU : GET /api/reservations/dashboard/{id} - Détails d'une réservation
     */
    public function getDashboardReservationDetails(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $reservation = Reservation::where('client_id', $user->id)
                                     ->where('id', $id)
                                     ->first();

            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Réservation non trouvée'
                ], 404);
            }

            // ✅ Enrichir avec des informations supplémentaires
            $reservationData = $reservation->toArray();
            
            // Ajouter numéro de confirmation
            $reservationData['confirmation_number'] = 'RES-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT);
            
            // Ajouter informations formatées
            $reservationData['formatted_date'] = $reservation->date->format('d/m/Y');
            $reservationData['formatted_time'] = $reservation->time ? Carbon::parse($reservation->time)->format('H:i') : null;
            $reservationData['days_until_reservation'] = $reservation->date->diffInDays(Carbon::now(), false);
            
            // Statut en français
            $statusLabels = [
                'pending' => 'En attente',
                'confirmed' => 'Confirmée',
                'cancelled' => 'Annulée'
            ];
            $reservationData['status_label'] = $statusLabels[$reservation->status] ?? $reservation->status;
            
            // Source en français
            $sourceLabels = [
                'iframe1' => 'Formulaire rapide',
                'iframe2' => 'Formulaire complet',
                'iframe' => 'Formulaire standard',
                'api' => 'API',
                'manual' => 'Manuel'
            ];
            $reservationData['source_label'] = $sourceLabels[$reservation->source] ?? $reservation->source;

            return response()->json([
                'success' => true,
                'data' => $reservationData,
                'message' => 'Détails de la réservation récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des détails'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : PUT /api/reservations/dashboard/{id}/status - Modifier statut réservation
     */
    public function updateReservationStatus(Request $request, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pending,confirmed,cancelled',
                'note' => 'nullable|string|max:500'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $reservation = Reservation::where('client_id', $user->id)
                                     ->where('id', $id)
                                     ->first();

            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Réservation non trouvée'
                ], 404);
            }

            // Mettre à jour le statut
            $oldStatus = $reservation->status;
            $reservation->update([
                'status' => $request->status
            ]);

            // ✅ Log de l'action pour audit
            $metadata = $reservation->metadata ?? [];
            $metadata['status_history'][] = [
                'from' => $oldStatus,
                'to' => $request->status,
                'changed_by' => $user->id,
                'changed_at' => now()->toISOString(),
                'note' => $request->note
            ];
            $reservation->update(['metadata' => $metadata]);

            // Compléter automatiquement la tâche liée si confirmée
            if ($request->status === 'confirmed') {
                Task::where('reservation_id', $reservation->id)
                    ->where('reservation_type', 'simple')
                    ->whereIn('status', ['pending', 'todo', 'in-progress'])
                    ->update(['status' => 'completed', 'completed_at' => now()]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'reservation' => $reservation,
                    'old_status' => $oldStatus,
                    'new_status' => $request->status
                ],
                'message' => 'Statut mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du statut'
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : DELETE /api/reservations/dashboard/{id} - Supprimer une réservation
     */
    public function deleteReservation(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $reservation = Reservation::where('client_id', $user->id)
                                     ->where('id', $id)
                                     ->first();

            if (!$reservation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Réservation non trouvée'
                ], 404);
            }

            // Sauvegarder les infos avant suppression pour le log
            $reservationInfo = [
                'id' => $reservation->id,
                'name' => $reservation->name,
                'email' => $reservation->email,
                'date' => $reservation->date->format('Y-m-d'),
                'deleted_at' => now()->toISOString(),
                'deleted_by' => $user->id
            ];

            // Supprimer la réservation
            $reservation->delete();

            return response()->json([
                'success' => true,
                'data' => $reservationInfo,
                'message' => 'Réservation supprimée avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la réservation'
            ], 500);
        }
    }

    /**
     * Export CSV des réservations (dashboard)
     * GET /api/reservations/dashboard/export
     */
    public function exportCsv(Request $request)
    {
        $user = Auth::user();

        $query = Reservation::where('client_id', $user->id)
                            ->where('is_partial', false);

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->date_from) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        if ($request->search) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('interest_description', 'like', "%{$s}%");
            });
        }

        $reservations = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();

        $filename = 'demandes_' . now()->format('Ymd_His') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
        ];

        $callback = function () use ($reservations) {
            $out = fopen('php://output', 'w');
            fputs($out, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel
            fputcsv($out, ['#', 'Nom', 'Email', 'Téléphone', 'Date arrivée', 'Heure', 'Voyageurs', 'Intérêt', 'Statut', 'Source', 'Reçu le'], ';');

            $statusLabels = ['pending' => 'En attente', 'confirmed' => 'Confirmée', 'cancelled' => 'Annulée'];
            $sourceLabels = ['iframe1' => 'Formulaire rapide', 'iframe2' => 'Formulaire complet', 'iframe' => 'Formulaire', 'api' => 'API', 'manual' => 'Manuel'];

            foreach ($reservations as $r) {
                fputcsv($out, [
                    $r->id,
                    $r->name ?? '',
                    $r->email ?? '',
                    $r->phone ?? '',
                    $r->date ? $r->date->format('d/m/Y') : '',
                    $r->time ? substr($r->time, 0, 5) : '',
                    $r->guests,
                    $r->interest_description ?? '',
                    $statusLabels[$r->status] ?? $r->status,
                    $sourceLabels[$r->source ?? ''] ?? ($r->source ?? ''),
                    $r->created_at ? $r->created_at->format('d/m/Y H:i') : '',
                ], ';');
            }
            fclose($out);
        };

        return response()->stream($callback, 200, $headers);
    }

    // ===== MÉTHODES EXISTANTES (INCHANGÉES) =====

    /**
     * Store quick reservation from homepage (iframe1)
     * POST /api/reservations/quick
     * Only: date, guests, interest_description
     */
    public function storeQuick(Request $request): JsonResponse
    {
        // Rate limiting par IP
        $key = 'quick_reservation:' . $request->ip();
        
        if (RateLimiter::tooManyAttempts($key, 3)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez dans ' . $seconds . ' secondes.',
                'error_code' => 'RATE_LIMIT_EXCEEDED'
            ], 429);
        }

        // Validation pour formulaire rapide
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string|max:255',
            'date' => 'required|date|after:today',
            'guests' => 'required|integer|min:1|max:20',
            'interest_description' => 'required|string|max:500',
        ], [
            'date.after' => 'La date doit être dans le futur.',
            'guests.max' => 'Maximum 20 personnes autorisées.',
            'date.required' => 'La date est obligatoire.',
            'guests.required' => 'Le nombre de personnes est obligatoire.',
            'interest_description.required' => 'La description est obligatoire.',
        ]);

        if ($validator->fails()) {
            RateLimiter::hit($key, 300); // 5 minutes
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Créer réservation partielle
            $reservation = Reservation::create([
                'client_id' => $request->client_id,
                'date' => $request->date,
                'guests' => (int) $request->guests,
                'interest_description' => strip_tags($request->interest_description),
                'is_partial' => true,
                'status' => Reservation::STATUS_PENDING,
                'source' => 'iframe1',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'referrer' => $request->header('referer'),
                    'submitted_at' => now()->toISOString(),
                    'form_type' => 'quick'
                ]
            ]);

            // Générer token de completion
            $completionToken = $reservation->generateCompletionToken();

            // Clear rate limit on success
            RateLimiter::clear($key);

            return response()->json([
                'success' => true,
                'message' => 'Merci ! Pour finaliser votre réservation, veuillez compléter vos informations.',
                'data' => [
                    'reservation_id' => $reservation->id,
                    'completion_token' => $completionToken,
                    'completion_url' => url("/reservation-complete?token={$completionToken}&client_id={$request->client_id}"),
                    'needs_completion' => true,
                    'existing_data' => [
                        'date' => $reservation->date->format('Y-m-d'),
                        'guests' => $reservation->guests,
                        'interest_description' => $reservation->interest_description
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            RateLimiter::hit($key, 300);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement. Veuillez réessayer.',
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
        }
    }

    /**
     * Get reservation data for completion (PUBLIC with token)
     * GET /api/reservations/completion-data
     */
    public function getCompletionData(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'token' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $reservation = Reservation::where('completion_token', $request->token)
                                 ->where('is_partial', true)
                                 ->first();

        if (!$reservation) {
            return response()->json([
                'success' => false,
                'message' => 'Token invalide ou expiré.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'reservation_id' => $reservation->id,
                'client_id' => $reservation->client_id,
                'existing_data' => [
                    'date' => $reservation->date->format('Y-m-d'),
                    'guests' => $reservation->guests,
                    'interest_description' => $reservation->interest_description,
                ]
            ]
        ]);
    }

    /**
     * Store full reservation (iframe2)
     * POST /api/reservations/full
     * All fields required
     */
    public function storeFull(Request $request): JsonResponse
    {
        // Rate limiting par IP
        $key = 'full_reservation:' . $request->ip();
        
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez dans ' . $seconds . ' secondes.',
                'error_code' => 'RATE_LIMIT_EXCEEDED'
            ], 429);
        }

        // Validation complète
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'date' => 'required|date|after:today',
            'time' => 'required|date_format:H:i',
            'guests' => 'required|integer|min:1|max:20',
            'interest_description' => 'required|string|max:500',
            'additional_details' => 'nullable|string|max:1000',
        ], [
            'date.after' => 'La date doit être dans le futur.',
            'guests.max' => 'Maximum 20 personnes autorisées.',
            'name.required' => 'Le nom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'Format d\'email invalide.',
            'date.required' => 'La date est obligatoire.',
            'time.required' => 'L\'heure est obligatoire.',
            'guests.required' => 'Le nombre de personnes est obligatoire.',
            'interest_description.required' => 'La description est obligatoire.',
        ]);

        if ($validator->fails()) {
            RateLimiter::hit($key, 600);
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Vérifier créneaux disponibles
            if (!$this->isTimeSlotAvailable($request->client_id, $request->date, $request->time)) {
                RateLimiter::hit($key, 600);
                return response()->json([
                    'success' => false,
                    'message' => 'Ce créneau n\'est plus disponible.',
                    'error_code' => 'SLOT_UNAVAILABLE'
                ], 409);
            }

            // Vérifier si l'utilisateur a la feature réservation active
            $clientUser = User::find($request->client_id);
            $isMasked = true;

            if ($clientUser) {
                $reservationFeature = Feature::where('key', 'reservation')->first();
                if ($reservationFeature) {
                    $access = UserFeatureAccess::where('user_id', $clientUser->id)
                        ->where('feature_id', $reservationFeature->id)
                        ->where('admin_enabled', true)
                        ->orderBy('admin_enabled_at', 'desc') // ✅ CORRECTION : Prendre le plus récent
                        ->first();

                    if ($access && $access->isActive()) {
                        $isMasked = false;
                    }
                }
            }

            // Créer réservation complète
            $reservation = Reservation::create([
                'client_id' => $request->client_id,
                'name' => strip_tags($request->name),
                'email' => filter_var($request->email, FILTER_SANITIZE_EMAIL),
                'phone' => $request->phone ? strip_tags($request->phone) : null,
                'date' => $request->date,
                'time' => $request->time,
                'guests' => (int) $request->guests,
                'interest_description' => strip_tags($request->interest_description),
                'additional_details' => $request->additional_details ? strip_tags($request->additional_details) : null,
                'is_partial' => false,
                'is_masked' => $isMasked,
                'completed_at' => now(),
                'status' => Reservation::STATUS_PENDING,
                'source' => 'iframe2',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'referrer' => $request->header('referer'),
                    'submitted_at' => now()->toISOString(),
                    'form_type' => 'full'
                ]
            ]);

            // Envoyer email (masqué ou normal)
            if ($clientUser && $clientUser->email) {
                if ($isMasked) {
                    Mail::to($clientUser->email)->send(new ReservationMasked($reservation));
                } else {
                    Mail::to($clientUser->email)->send(new ReservationReceived($reservation));
                }
            }

            // Auto-créer une tâche "À faire" pour cette réservation (Plan Pro)
            $this->createReservationTask($reservation);

            // Clear rate limit on success
            RateLimiter::clear($key);

            return response()->json([
                'success' => true,
                'message' => 'Réservation envoyée avec succès ! Nous vous contacterons bientôt.',
                'data' => [
                    'reservation_id' => $reservation->id,
                    'status' => $reservation->status,
                    'confirmation_number' => 'RES-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT),
                    'is_complete' => true
                ]
            ], 201);

        } catch (\Exception $e) {
            RateLimiter::hit($key, 600);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement. Veuillez réessayer.',
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
        }
    }

    /**
     * Complete partial reservation
     * POST /api/reservations/complete
     * Complete with token from quick form
     */
    public function completeReservation(Request $request): JsonResponse
    {
        // Rate limiting par IP
        $key = 'complete_reservation:' . $request->ip();
        
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez dans ' . $seconds . ' secondes.',
                'error_code' => 'RATE_LIMIT_EXCEEDED'
            ], 429);
        }

        // Validation
        $validator = Validator::make($request->all(), [
            'completion_token' => 'required|string',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'time' => 'required|date_format:H:i',
            'additional_details' => 'nullable|string|max:1000',
        ], [
            'completion_token.required' => 'Token de completion manquant.',
            'name.required' => 'Le nom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'time.required' => 'L\'heure est obligatoire.',
        ]);

        if ($validator->fails()) {
            RateLimiter::hit($key, 600);
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Trouver réservation partielle
            $reservation = Reservation::where('completion_token', $request->completion_token)
                                     ->where('is_partial', true)
                                     ->first();

            if (!$reservation) {
                RateLimiter::hit($key, 600);
                return response()->json([
                    'success' => false,
                    'message' => 'Lien de completion invalide ou expiré.',
                    'error_code' => 'INVALID_TOKEN'
                ], 404);
            }

            // Vérifier créneaux disponibles
            if (!$this->isTimeSlotAvailable($reservation->client_id, $reservation->date->format('Y-m-d'), $request->time)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce créneau n\'est plus disponible.',
                    'error_code' => 'SLOT_UNAVAILABLE'
                ], 409);
            }

            // Compléter réservation
            $reservation->update([
                'name' => strip_tags($request->name),
                'email' => filter_var($request->email, FILTER_SANITIZE_EMAIL),
                'phone' => $request->phone ? strip_tags($request->phone) : null,
                'time' => $request->time,
                'additional_details' => $request->additional_details ? strip_tags($request->additional_details) : null,
                'is_partial' => false,
                'completed_at' => now(),
                'completion_token' => null, // Clear token
                'metadata' => array_merge($reservation->metadata ?? [], [
                    'completed_at' => now()->toISOString(),
                    'completion_method' => 'token'
                ])
            ]);

            // Notifier l'owner du workspace (client_id)
            $owner = User::find($reservation->client_id);
            if ($owner && $owner->email) {
                try {
                    Mail::to($owner->email)->send(new ReservationReceived($reservation));
                } catch (\Exception $mailEx) {
                    Log::error('[completeReservation] Email owner failed: ' . $mailEx->getMessage());
                }
            }

            // Auto-créer une tâche "À faire" pour cette réservation (Plan Pro)
            $this->createReservationTask($reservation);

            // Clear rate limit on success
            RateLimiter::clear($key);

            return response()->json([
                'success' => true,
                'message' => 'Réservation complétée avec succès ! Nous vous contacterons bientôt.',
                'data' => [
                    'reservation_id' => $reservation->id,
                    'status' => $reservation->status,
                    'confirmation_number' => 'RES-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT),
                    'is_complete' => true
                ]
            ], 200);

        } catch (\Exception $e) {
            RateLimiter::hit($key, 600);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la completion. Veuillez réessayer.',
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
        }
    }

    /**
     * Store a new reservation (PUBLIC) - LEGACY METHOD
     * POST /api/reservations
     * Rate limited: 5 attempts per 10 minutes per IP
     */
    public function store(Request $request): JsonResponse
    {
        // Rate limiting par IP
        $key = 'reservation_attempt:' . $request->ip();
        
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez dans ' . $seconds . ' secondes.',
                'error_code' => 'RATE_LIMIT_EXCEEDED'
            ], 429);
        }

        // Validation des données
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'date' => 'required|date|after:today',
            'time' => 'required|date_format:H:i',
            'guests' => 'required|integer|min:1|max:20',
            'interest_description' => 'nullable|string|max:500',
            'additional_details' => 'nullable|string|max:1000',
        ], [
            'date.after' => 'La date doit être dans le futur.',
            'guests.max' => 'Maximum 20 personnes autorisées.',
            'name.required' => 'Le nom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.email' => 'Format d\'email invalide.',
            'date.required' => 'La date est obligatoire.',
            'time.required' => 'L\'heure est obligatoire.',
            'guests.required' => 'Le nombre de personnes est obligatoire.',
        ]);

        if ($validator->fails()) {
            RateLimiter::hit($key, 600); // 10 minutes
            return response()->json([
                'success' => false,
                'message' => 'Données invalides.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Vérifier les créneaux disponibles (logique métier)
            if (!$this->isTimeSlotAvailable($request->client_id, $request->date, $request->time)) {
                RateLimiter::hit($key, 600);
                return response()->json([
                    'success' => false,
                    'message' => 'Ce créneau n\'est plus disponible.',
                    'error_code' => 'SLOT_UNAVAILABLE'
                ], 409);
            }

            // Récupérer le client
            $client = User::find($request->client_id);

            // Créer la réservation
            $reservation = Reservation::create([
                'client_id' => $request->client_id,
                'user_id' => $client ? $client->id : null,
                'name' => strip_tags($request->name),
                'email' => filter_var($request->email, FILTER_SANITIZE_EMAIL),
                'phone' => $request->phone ? strip_tags($request->phone) : null,
                'date' => $request->date,
                'time' => $request->time,
                'guests' => (int) $request->guests,
                'type' => $request->reservation_type ?? 'full',
                'message' => $request->additional_details ? strip_tags($request->additional_details) : null,
                'interest_description' => $request->interest_description ? strip_tags($request->interest_description) : null,
                'additional_details' => $request->additional_details ? strip_tags($request->additional_details) : null,
                'status' => Reservation::STATUS_PENDING,
                'source' => $request->source ?? Reservation::SOURCE_IFRAME,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'metadata' => [
                    'referrer' => $request->header('referer'),
                    'submitted_at' => now()->toISOString(),
                ]
            ]);

            // Envoyer email au client si trouvé
            if ($client && $client->email) {
                try {
                    Log::info("📧 [ReservationController] Tentative d'envoi email à: " . $client->email);
                    Mail::to($client->email)->send(new ReservationReceived($reservation));
                    Log::info("📧 [ReservationController] Email envoyé avec succès à: " . $client->email);
                } catch (\Exception $mailException) {
                    Log::error("📧 [ReservationController] ERREUR envoi email: " . $mailException->getMessage());
                }
            }

            // Créer automatiquement une tâche pour cette réservation
            $this->createReservationTask($reservation);

            // Clear rate limit on success
            RateLimiter::clear($key);

            return response()->json([
                'success' => true,
                'message' => 'Réservation envoyée avec succès !',
                'data' => [
                    'reservation_id' => $reservation->id,
                    'status' => $reservation->status,
                    'confirmation_number' => 'RES-' . str_pad($reservation->id, 6, '0', STR_PAD_LEFT),
                ]
            ], 201);

        } catch (\Exception $e) {
            RateLimiter::hit($key, 600);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement. Veuillez réessayer.',
                'error_code' => 'INTERNAL_ERROR'
            ], 500);
        }
    }

    /**
     * Get reservations for a client (PROTECTED)
     * GET /api/reservations
     */
    public function index(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string',
            'status' => 'nullable|in:pending,confirmed,cancelled',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Reservation::forClient($request->client_id);

        // Filtres
        if ($request->status) {
            $query->withStatus($request->status);
        }

        if ($request->date_from) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        $reservations = $query->orderBy('date', 'desc')
                             ->orderBy('time', 'desc')
                             ->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $reservations,
            'stats' => [
                'total' => $reservations->total(),
                'pending' => Reservation::forClient($request->client_id)->withStatus('pending')->count(),
                'confirmed' => Reservation::forClient($request->client_id)->withStatus('confirmed')->count(),
            ]
        ]);
    }

    /**
     * Show specific reservation (PROTECTED)
     * GET /api/reservations/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $reservation = Reservation::forClient($request->client_id)->find($id);

        if (!$reservation) {
            return response()->json([
                'success' => false,
                'message' => 'Réservation non trouvée.'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $reservation
        ]);
    }

    /**
     * Update reservation status (PROTECTED)
     * PUT /api/reservations/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|string',
            'status' => 'required|in:pending,confirmed,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $reservation = Reservation::forClient($request->client_id)->find($id);

        if (!$reservation) {
            return response()->json([
                'success' => false,
                'message' => 'Réservation non trouvée.'
            ], 404);
        }

        $reservation->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Statut mis à jour.',
            'data' => $reservation
        ]);
    }

    /**
     * Check if time slot is available for a client
     */
    private function isTimeSlotAvailable(string $clientId, string $date, string $time): bool
    {
        // Logique de vérification des créneaux
        // Pour l'instant, on considère que tous les créneaux sont disponibles
        // TODO: Implémenter la logique métier selon les besoins du client
        
        $existingReservations = Reservation::forClient($clientId)
            ->whereDate('date', $date)
            ->whereTime('time', $time)
            ->withStatus('confirmed')
            ->count();

        // Limite arbitraire de 5 réservations par créneau
        return $existingReservations < 5;
    }

    /**
     * Analytics réservations (Plan Pro)
     * GET /api/reservations/dashboard/analytics?year=Y
     */
    public function getAnalytics(Request $request): JsonResponse
    {
        $user = Auth::user();
        $year = (int) $request->get('year', date('Y'));

        // Résoudre les IDs des clients du workspace
        $workspace = Workspace::where('owner_user_id', $user->id)->first();
        if (!$workspace) {
            $membership = WorkspaceUser::where('user_id', $user->id)->first();
            if ($membership) $workspace = Workspace::find($membership->workspace_id);
        }
        $clientIds = $workspace
            ? WorkspaceUser::where('workspace_id', $workspace->id)->pluck('user_id')->toArray()
            : [$user->id];

        $base = Reservation::whereIn('client_id', $clientIds)->whereYear('date', $year);

        $total        = (clone $base)->count();
        $confirmed    = (clone $base)->where('status', 'confirmed')->count();
        $cancelled    = (clone $base)->where('status', 'cancelled')->count();
        $pending      = (clone $base)->where('status', 'pending')->count();
        $totalGuests  = (clone $base)->sum('guests');

        // Par mois
        $MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        $byMonth = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthBase = (clone $base)->whereMonth('date', $m);
            $byMonth[] = [
                'month'  => $MONTH_NAMES[$m - 1],
                'count'  => $monthBase->count(),
                'guests' => $monthBase->sum('guests'),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'year'       => $year,
                'total'      => $total,
                'by_status'  => ['pending' => $pending, 'confirmed' => $confirmed, 'cancelled' => $cancelled],
                'by_month'   => $byMonth,
                'total_guests' => $totalGuests,
                'confirmation_rate' => $total > 0 ? round(($confirmed / $total) * 100) : 0,
            ],
        ]);
    }

    /**
     * Crée automatiquement une tâche pour une réservation (simple).
     * Stocke reservation_id pour pouvoir la compléter automatiquement.
     */
    private function createReservationTask(Reservation $reservation): void
    {
        try {
            // Résoudre le workspace du propriétaire du site
            $workspace = Workspace::where('owner_user_id', $reservation->client_id)->first();
            if (!$workspace) {
                $membership = WorkspaceUser::where('user_id', $reservation->client_id)->first();
                if ($membership) $workspace = Workspace::find($membership->workspace_id);
            }

            $site = $workspace
                ? UserSite::where('workspace_id', $workspace->id)->orderBy('created_at')->first()
                : null;

            $date = $reservation->date instanceof \Carbon\Carbon
                ? $reservation->date
                : Carbon::parse($reservation->date);

            Task::create([
                'user_id'          => $reservation->client_id,
                'site_id'          => $site?->id,
                'sprint_id'        => null,
                'title'            => '📅 Réservation — ' . ($reservation->name ?? 'Client') . ' — ' . $date->format('d/m/Y'),
                'description'      => 'Invités : ' . ($reservation->guests ?? 1) . ' | ' . ($reservation->interest_description ?? ''),
                'type'             => 'reservation',
                'priority'         => 'high',
                'status'           => 'pending',
                'scheduled_date'   => now()->toDateString(), // aujourd'hui — visible immédiatement
                'order'            => 0,
                'reservation_id'   => $reservation->id,
                'reservation_type' => 'simple',
            ]);
        } catch (\Exception $e) {
            Log::warning('[createReservationTask] Failed: ' . $e->getMessage());
        }
    }
}