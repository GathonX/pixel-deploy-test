<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Mail\BookingReservationReceived;
use App\Models\BookingEmailTemplate;
use App\Models\BookingProduct;
use App\Models\BookingReservation;
use App\Models\Task;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Services\BookingAvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class BookingReservationController extends Controller
{
    public function __construct(private BookingAvailabilityService $availability) {}

    public function index(Request $request, string $siteId): JsonResponse
    {
        $query = BookingReservation::where('site_id', $siteId)
            ->with('product');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->filled('from')) {
            $query->where('end_date', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('start_date', '<=', $request->to);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%{$search}%")
                  ->orWhere('client_email', 'like', "%{$search}%");
            });
        }

        $reservations = $query->orderBy('start_date')->get();

        return response()->json($reservations);
    }

    public function store(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'product_id'       => ['required', 'integer', Rule::exists('booking_products', 'id')->where('site_id', $siteId)],
            'client_name'      => 'required|string|max:255',
            'client_email'     => 'nullable|email',
            'client_phone'     => 'nullable|string|max:50',
            'client_country'   => 'nullable|string|max:100',
            'start_date'       => 'required|date',
            'end_date'         => 'required|date|after_or_equal:start_date',
            'adults'           => 'required|integer|min:1',
            'children'         => 'nullable|integer|min:0',
            'notes'            => 'nullable|string',
            'linked_product_id'=> ['nullable', 'integer', Rule::exists('booking_products', 'id')->where('site_id', $siteId)],
        ]);

        $data['children'] = $data['children'] ?? 0;

        // Vérification disponibilité
        if (!$this->availability->isAvailable(
            $data['product_id'],
            $data['start_date'],
            $data['end_date'],
            $data['adults'],
            $data['children']
        )) {
            return response()->json(['message' => 'Ce produit n\'est pas disponible pour ces dates.'], 409);
        }

        $data['site_id'] = $siteId;
        $data['status'] = 'pending';
        $data['history'] = [[
            'action' => 'created',
            'date' => now()->toIso8601String(),
            'by' => auth()->user()?->name ?? 'system',
        ]];

        $reservation = BookingReservation::create($data);

        // Ne pas notifier pour les réservations de maintenance
        if (($data['client_name'] ?? '') !== '🔧 Maintenance') {
            $this->createBookingTask($reservation, $siteId);
            $this->sendOwnerEmail($reservation, $siteId);
        }

        return response()->json($reservation->load('product'), 201);
    }

    public function show(Request $request, string $siteId, int $id): JsonResponse
    {
        $reservation = BookingReservation::where('site_id', $siteId)
            ->with(['product', 'linkedProduct'])
            ->findOrFail($id);

        return response()->json($reservation);
    }

    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $reservation = BookingReservation::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'client_name'      => 'sometimes|string|max:255',
            'client_email'     => 'nullable|email',
            'client_phone'     => 'nullable|string|max:50',
            'client_country'   => 'nullable|string|max:100',
            'start_date'       => 'sometimes|date',
            'end_date'         => 'sometimes|date|after_or_equal:start_date',
            'adults'           => 'sometimes|integer|min:1',
            'children'         => 'nullable|integer|min:0',
            'notes'            => 'nullable|string',
            'price_override'   => 'nullable|numeric|min:0',
            'linked_product_id'=> 'nullable|integer|exists:booking_products,id',
        ]);

        // Si changement de dates → revérifier dispo
        if (isset($data['start_date']) || isset($data['end_date'])) {
            $startDate = $data['start_date'] ?? $reservation->start_date->toDateString();
            $endDate   = $data['end_date'] ?? $reservation->end_date->toDateString();
            $adults    = $data['adults'] ?? $reservation->adults;
            $children  = $data['children'] ?? $reservation->children;

            if (!$this->availability->isAvailable(
                $reservation->product_id,
                $startDate,
                $endDate,
                $adults,
                $children,
                $reservation->id
            )) {
                return response()->json(['message' => 'Ce produit n\'est pas disponible pour ces nouvelles dates.'], 409);
            }
        }

        $reservation->addHistory('updated', auth()->user()?->name ?? 'system');
        $reservation->fill($data);
        $reservation->save();

        return response()->json($reservation->load('product'));
    }

    public function updateStatus(Request $request, string $siteId, int $id): JsonResponse
    {
        $reservation = BookingReservation::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,cancelled,maintenance,checked_in,checked_out',
            'reason' => 'nullable|string|max:255',
        ]);

        $actionLabel = $data['reason'] ?? "status:{$data['status']}";
        $reservation->addHistory($actionLabel, auth()->user()?->name ?? 'system');
        $reservation->status = $data['status'];
        $reservation->save();

        // Email de confirmation au client
        if ($data['status'] === 'confirmed' && $reservation->client_email) {
            $this->sendClientEmail($reservation->load('product'), $siteId);
        }

        // Synchronisation tâches selon le statut
        match ($data['status']) {
            'confirmed' => Task::where('reservation_id', $reservation->id)
                ->where('reservation_type', 'booking')
                ->whereIn('status', ['pending', 'todo', 'in-progress'])
                ->update(['status' => 'completed', 'completed_at' => now()]),

            'checked_in' => $this->createOrUpdateTask(
                $reservation, $siteId,
                '🛎️ Check-in — ' . $reservation->client_name,
                'Client arrivé. Check-in effectué le ' . now()->format('d/m/Y à H:i'),
                'completed'
            ),

            'checked_out' => $this->createOrUpdateTask(
                $reservation, $siteId,
                '🚪 Check-out — ' . $reservation->client_name,
                'Client parti. Check-out effectué le ' . now()->format('d/m/Y à H:i'),
                'completed'
            ),

            'cancelled' => Task::where('reservation_id', $reservation->id)
                ->where('reservation_type', 'booking')
                ->update(['status' => 'cancelled', 'completed_at' => now()]),

            default => null,
        };

        return response()->json($reservation->load('product'));
    }

    /**
     * Envoie l'email de confirmation au client en utilisant le template personnalisé du site.
     * Substitue les variables : {{dates}}, {{client_name}}, {{product_name}},
     *   {{start_date}}, {{end_date}}, {{total}}
     */
    private function sendClientEmail(BookingReservation $reservation, string $siteId): void
    {
        try {
            if (empty($reservation->client_email)) return;

            $template = BookingEmailTemplate::where('site_id', $siteId)
                ->where('type', 'confirmation')
                ->first();

            if (!$template) return;

            $product = $reservation->product;
            $start   = Carbon::parse($reservation->start_date);
            $end     = Carbon::parse($reservation->end_date);
            $nights  = max(1, $start->diffInDays($end));
            $total   = number_format(($product?->price ?? 0) * $reservation->adults * $nights, 0, ',', ' ');

            $vars = [
                '{{dates}}'        => now()->translatedFormat('d/m/Y'),
                '{{client_name}}'  => $reservation->client_name ?? '',
                '{{product_name}}' => $product?->name ?? '',
                '{{start_date}}'   => $start->format('d/m/Y'),
                '{{end_date}}'     => $end->format('d/m/Y'),
                '{{total}}'        => $total,
            ];

            $subject = str_replace(array_keys($vars), array_values($vars), $template->subject);
            $body    = str_replace(array_keys($vars), array_values($vars), $template->body_html);

            Mail::html($body, function ($message) use ($reservation, $subject) {
                $message->to($reservation->client_email, $reservation->client_name)
                        ->subject($subject);
            });

            Log::info("[Booking] Email confirmation envoyé à {$reservation->client_email} (résa #{$reservation->id})");
        } catch (\Exception $e) {
            Log::error("[Booking] Erreur email client: " . $e->getMessage());
        }
    }

    private function createOrUpdateTask(BookingReservation $reservation, string $siteId, string $title, string $description, string $status): void
    {
        try {
            $site = UserSite::find($siteId);
            if (!$site) return;
            $workspace = Workspace::find($site->workspace_id);
            $ownerId   = $workspace?->owner_user_id;
            if (!$ownerId) return;

            $existing = Task::where('reservation_id', $reservation->id)
                ->where('reservation_type', 'booking')
                ->latest()
                ->first();

            if ($existing) {
                $existing->update(['status' => $status, 'completed_at' => now()]);
            }

            Task::create([
                'user_id'          => $ownerId,
                'site_id'          => $siteId,
                'sprint_id'        => null,
                'title'            => $title,
                'description'      => $description,
                'type'             => 'reservation',
                'priority'         => 'high',
                'status'           => $status,
                'scheduled_date'   => now()->toDateString(),
                'completed_at'     => now(),
                'order'            => 0,
                'reservation_id'   => $reservation->id,
                'reservation_type' => 'booking',
            ]);
        } catch (\Exception $e) {
            Log::warning('[createOrUpdateTask] Failed: ' . $e->getMessage());
        }
    }

    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        $reservation = BookingReservation::where('site_id', $siteId)->findOrFail($id);
        $reservation->delete();

        return response()->json(['message' => 'Réservation supprimée.']);
    }

    public function checkAvailability(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'product_id' => 'required|integer|exists:booking_products,id',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'adults'     => 'nullable|integer|min:1',
            'children'   => 'nullable|integer|min:0',
        ]);

        $available = $this->availability->isAvailable(
            $data['product_id'],
            $data['start_date'],
            $data['end_date'],
            $data['adults'] ?? 1,
            $data['children'] ?? 0
        );

        $pricing = null;
        if ($available) {
            $product = BookingProduct::where('site_id', $siteId)->find($data['product_id']);
            $pricing = $this->availability->getPriceForDate($product, $data['start_date']);
        }

        return response()->json(['available' => $available, 'pricing' => $pricing]);
    }

    /**
     * Envoie un email de notification au propriétaire du site.
     */
    private function sendOwnerEmail(BookingReservation $reservation, string $siteId): void
    {
        try {
            $site      = UserSite::find($siteId);
            $workspace = $site ? Workspace::find($site->workspace_id) : null;
            $owner     = $workspace ? \App\Models\User::find($workspace->owner_user_id) : null;

            if ($owner?->email) {
                Mail::to($owner->email)->send(
                    new BookingReservationReceived($reservation->load('product'), $site->name ?? '')
                );
                Log::info("[BookingReservation] Email envoyé à {$owner->email} pour réservation #{$reservation->id}");
            }
        } catch (\Exception $e) {
            Log::error("[BookingReservation] Erreur email: " . $e->getMessage());
        }
    }

    /**
     * Crée automatiquement une tâche pour une réservation de booking.
     * Le site est connu directement via $siteId.
     */
    private function createBookingTask(BookingReservation $reservation, string $siteId): void
    {
        try {
            $site = UserSite::find($siteId);
            if (!$site) return;

            // Propriétaire du site = workspace owner
            $workspace = Workspace::find($site->workspace_id);
            $ownerId   = $workspace?->owner_user_id;
            if (!$ownerId) return;

            $startDate = $reservation->start_date instanceof \Carbon\Carbon
                ? $reservation->start_date
                : \Carbon\Carbon::parse($reservation->start_date);

            Task::create([
                'user_id'          => $ownerId,
                'site_id'          => $siteId,
                'sprint_id'        => null,
                'title'            => '📅 Réservation — ' . ($reservation->client_name ?? 'Client') . ' — ' . $startDate->format('d/m/Y'),
                'description'      => 'Adultes : ' . $reservation->adults . ' | Enfants : ' . ($reservation->children ?? 0) . ($reservation->notes ? ' | ' . $reservation->notes : ''),
                'type'             => 'reservation',
                'priority'         => 'high',
                'status'           => 'pending',
                'scheduled_date'   => now()->toDateString(),
                'order'            => 0,
                'reservation_id'   => $reservation->id,
                'reservation_type' => 'booking',
            ]);
        } catch (\Exception $e) {
            Log::warning('[createBookingTask] Failed: ' . $e->getMessage());
        }
    }
}
