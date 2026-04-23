<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Mail\BookingReservationReceived;
use App\Models\BookingProduct;
use App\Models\BookingReservation;
use App\Models\BookingSetting;
use App\Models\Task;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Services\BookingAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class PublicBookingController extends Controller
{
    public function __construct(private BookingAvailabilityService $availability) {}

    public function getProducts(Request $request, string $siteId): JsonResponse
    {
        $this->ensureSiteExists($siteId);

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after:start_date',
            'adults'     => 'nullable|integer|min:1',
            'children'   => 'nullable|integer|min:0',
        ]);

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $products = $this->availability->getAvailableProducts(
                $siteId,
                $request->start_date,
                $request->end_date,
                $request->adults ?? 1,
                $request->children ?? 0,
            );
        } else {
            $products = BookingProduct::where('site_id', $siteId)
                ->where('status', 'active')
                ->with(['seasons', 'images'])
                ->get()
                ->toArray();
        }

        return response()->json($products);
    }

    public function checkAvailability(Request $request, string $siteId): JsonResponse
    {
        $this->ensureSiteExists($siteId);

        $data = $request->validate([
            'product_id' => ['required', 'integer', Rule::exists('booking_products', 'id')->where('site_id', $siteId)->where('status', 'active')],
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

    public function createReservation(Request $request, string $siteId): JsonResponse
    {
        $this->ensureSiteExists($siteId);

        $data = $request->validate([
            'product_id'     => ['required', 'integer', Rule::exists('booking_products', 'id')->where('site_id', $siteId)->where('status', 'active')],
            'client_name'    => 'required|string|max:255',
            'client_email'   => 'nullable|email',
            'client_phone'   => 'nullable|string|max:50',
            'client_country' => 'nullable|string|max:100',
            'start_date'     => 'required|date',
            'end_date'       => 'required|date|after_or_equal:start_date',
            'adults'         => 'required|integer|min:1',
            'children'       => 'nullable|integer|min:0',
            'notes'          => 'nullable|string',
            'accept_cgv'     => 'required|accepted',
        ]);

        $data['children'] = $data['children'] ?? 0;

        // Vérif disponibilité
        if (!$this->availability->isAvailable(
            $data['product_id'],
            $data['start_date'],
            $data['end_date'],
            $data['adults'],
            $data['children']
        )) {
            return response()->json(['message' => 'Ce produit n\'est plus disponible pour ces dates.'], 409);
        }

        $reservation = BookingReservation::create([
            'product_id'     => $data['product_id'],
            'site_id'        => $siteId,
            'client_name'    => $data['client_name'],
            'client_email'   => $data['client_email'] ?? null,
            'client_phone'   => $data['client_phone'] ?? null,
            'client_country' => $data['client_country'] ?? null,
            'start_date'     => $data['start_date'],
            'end_date'       => $data['end_date'],
            'adults'         => $data['adults'],
            'children'       => $data['children'],
            'notes'          => $data['notes'] ?? null,
            'status'         => 'pending',
            'history'        => [[
                'action' => 'created_public',
                'date'   => now()->toIso8601String(),
                'by'     => 'public',
            ]],
        ]);

        // Prix calculé pour le devis
        $product = BookingProduct::where('site_id', $siteId)->find($data['product_id']);
        $pricing = $this->availability->getPriceForDate($product, $data['start_date']);

        // Notifier le propriétaire du site + créer une tâche
        $this->notifyOwnerAndCreateTask($reservation, $siteId);

        return response()->json([
            'reservation' => $reservation->load('product'),
            'pricing'     => $pricing,
        ], 201);
    }

    /**
     * Envoie un email au propriétaire du site et crée une tâche dans le sprint.
     */
    private function notifyOwnerAndCreateTask(BookingReservation $reservation, string $siteId): void
    {
        try {
            $site = UserSite::find($siteId);
            if (!$site) return;

            $workspace = Workspace::find($site->workspace_id);
            if (!$workspace) return;

            $ownerId = $workspace->owner_user_id;
            $owner   = \App\Models\User::find($ownerId);

            // 1. Email au propriétaire
            if ($owner?->email) {
                try {
                    Mail::to($owner->email)->send(
                        new BookingReservationReceived($reservation->load('product'), $site->name ?? '')
                    );
                    Log::info("[PublicBooking] Email envoyé à {$owner->email} pour réservation #{$reservation->id}");
                } catch (\Exception $e) {
                    Log::error("[PublicBooking] Erreur email: " . $e->getMessage());
                }
            }

            // 2. Tâche dans le sprint
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
            Log::info("[PublicBooking] Tâche créée pour réservation #{$reservation->id}");
        } catch (\Exception $e) {
            Log::warning("[PublicBooking] notifyOwnerAndCreateTask failed: " . $e->getMessage());
        }
    }

    public function getCgv(Request $request, string $siteId): JsonResponse
    {
        $this->ensureSiteExists($siteId);
        $setting = BookingSetting::where('site_id', $siteId)->where('key', 'cgv_content')->first();

        return response()->json([
            'cgv'        => $setting?->value ?? '',
            'updated_at' => $setting?->updated_at?->format('d/m/Y') ?? null,
        ]);
    }

    private function ensureSiteExists(string $siteId): void
    {
        UserSite::where('id', $siteId)->where('status', 'published')->firstOrFail();
    }
}
