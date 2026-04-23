<?php

namespace App\Services;

use App\Models\BookingProduct;
use App\Models\BookingReservation;
use Carbon\Carbon;

class BookingAvailabilityService
{
    /**
     * Vérifie si un produit est disponible pour les dates et le nombre de personnes donnés.
     */
    public function isAvailable(
        int $productId,
        string $startDate,
        string $endDate,
        int $adults = 1,
        int $children = 0,
        ?int $excludeReservationId = null
    ): bool {
        $product = BookingProduct::findOrFail($productId);
        $persons = $adults + $children;

        // Vérifier que la capacité est suffisante
        if ($persons > $product->capacity) {
            return false;
        }

        $query = BookingReservation::where('product_id', $productId)
            ->whereNotIn('status', ['cancelled'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->where('start_date', '<', $endDate)
                  ->where('end_date', '>', $startDate);
            });

        if ($excludeReservationId) {
            $query->where('id', '!=', $excludeReservationId);
        }

        return match ($product->type) {
            'chambre'    => $this->checkChambre($query),
            'excursion'  => $this->checkExcursion($query, $product, $persons),
            'service'    => $this->checkService($query, $product, $persons),
            default      => false,
        };
    }

    /**
     * Chambre : monogamie — 0 réservation active sur la période.
     */
    private function checkChambre($query): bool
    {
        return $query->count() === 0;
    }

    /**
     * Excursion : somme des participants ne dépasse pas max_capacity.
     */
    private function checkExcursion($query, BookingProduct $product, int $persons): bool
    {
        $reservations = $query->get(['adults', 'children']);
        $totalPersons = $reservations->sum(fn($r) => ($r->adults ?? 0) + ($r->children ?? 0));
        return ($totalPersons + $persons) <= $product->max_capacity;
    }

    /**
     * Service : stock disponible.
     */
    private function checkService($query, BookingProduct $product, int $persons): bool
    {
        $used = $query->count();
        return ($used + 1) <= $product->stock;
    }

    /**
     * Retourne le prix saisonnier actif pour un produit à une date donnée.
     */
    public function getPriceForDate(BookingProduct $product, string $date): array
    {
        $month = (int) Carbon::parse($date)->format('n');

        $season = $product->seasons()
            ->where('start_month', '<=', $month)
            ->where('end_month', '>=', $month)
            ->first();

        if ($season) {
            return [
                'price' => $season->price,
                'price_child' => $season->price_child,
                'season' => $season->season,
            ];
        }

        return [
            'price' => $product->price,
            'price_child' => $product->price_child,
            'season' => null,
        ];
    }

    /**
     * Retourne les produits disponibles d'un site pour une période donnée.
     */
    public function getAvailableProducts(string $siteId, string $startDate, string $endDate, int $adults = 1, int $children = 0): array
    {
        $products = BookingProduct::where('site_id', $siteId)
            ->where('status', 'active')
            ->with(['seasons', 'images'])
            ->get();

        return $products->filter(function ($product) use ($startDate, $endDate, $adults, $children) {
            return $this->isAvailable($product->id, $startDate, $endDate, $adults, $children);
        })->map(function ($product) use ($startDate) {
            $pricing = $this->getPriceForDate($product, $startDate);
            return array_merge($product->toArray(), $pricing);
        })->values()->toArray();
    }
}
