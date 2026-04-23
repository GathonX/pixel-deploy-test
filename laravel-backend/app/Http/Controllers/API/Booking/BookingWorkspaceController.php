<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingProduct;
use App\Models\BookingReservation;
use App\Models\UserSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingWorkspaceController extends Controller
{
    /**
     * Retourne tous les sites du workspace avec leurs produits et réservations.
     * Utilisé par la Vue Globale de mada-booking.
     */
    public function sitesData(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $sites = UserSite::where('workspace_id', $workspace->id)
            ->orderBy('name')
            ->get();

        $result = $sites->map(function ($site) {
            $products = BookingProduct::where('site_id', $site->id)
                ->with('images')
                ->orderBy('type')
                ->orderBy('name')
                ->get();

            $productIds = $products->pluck('id')->toArray();

            $reservations = collect();
            if (!empty($productIds)) {
                $reservations = BookingReservation::whereIn('product_id', $productIds)
                    ->whereIn('status', ['pending', 'confirmed', 'maintenance', 'checked_in', 'checked_out'])
                    ->orderBy('start_date')
                    ->get();
            }

            $ressByProduct = $reservations->groupBy('product_id');

            return [
                'id'          => $site->id,
                'name'        => $site->name,
                'location'    => $site->domain ?? $site->name,
                'description' => null,
                'created_at'  => $site->created_at,
                'updated_at'  => $site->updated_at,
                'products'    => $products->map(function ($product) use ($ressByProduct) {
                    $prodReservations = $ressByProduct->get($product->id, collect());

                    return [
                        'id'           => (string) $product->id,
                        'site_id'      => $product->site_id,
                        'name'         => $product->name,
                        'type'         => $product->type,
                        'description'  => $product->description,
                        'parcours'     => $product->parcours,
                        'price'        => (float) $product->price,
                        'price_child'  => (float) ($product->price_child ?? 0),
                        'capacity'     => $product->capacity,
                        'max_capacity' => $product->max_capacity,
                        'stock'        => $product->stock,
                        'amenities'    => $product->amenities ?? [],
                        'image'        => $product->images->sortBy('position')->first()?->url,
                        'images'       => $product->images->sortBy('position')->map(fn($img) => [
                            'id'         => (string) $img->id,
                            'product_id' => (string) $img->product_id,
                            'url'        => $img->url,
                            'position'   => $img->position,
                        ])->values()->toArray(),
                        'created_at'   => $product->created_at,
                        'updated_at'   => $product->updated_at,
                        'reservations' => $prodReservations->map(function ($r) use ($product) {
                            return [
                                'id'                => (string) $r->id,
                                'product_id'        => (string) $r->product_id,
                                'site_id'           => $product->site_id,
                                'client_name'       => $r->client_name,
                                'client_email'      => $r->client_email ?? '',
                                'client_phone'      => $r->client_phone ?? '',
                                'start_date'        => $r->start_date->toDateString(),
                                'end_date'          => $r->end_date->toDateString(),
                                'persons'           => ($r->adults ?? 0) + ($r->children ?? 0),
                                'adults'            => $r->adults ?? 0,
                                'children'          => $r->children ?? 0,
                                'status'            => $r->status,
                                'notes'             => $r->notes ?? '',
                                'price_override'    => $r->price_override,
                                'history'           => $r->history ?? [],
                                'linked_product_id' => null,
                                'created_at'        => $r->created_at,
                                'updated_at'        => $r->updated_at,
                            ];
                        })->values()->toArray(),
                    ];
                })->values()->toArray(),
            ];
        });

        return response()->json($result);
    }
}
