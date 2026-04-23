<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingReservation;
use App\Models\BookingProduct;
use App\Models\BookingExpense;
use App\Models\BookingSupplierPrice;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingStatsController extends Controller
{
    public function index(Request $request, string $siteId): JsonResponse
    {
        $from = $request->get('from', Carbon::now()->startOfYear()->toDateString());
        $to   = $request->get('to',   Carbon::now()->endOfYear()->toDateString());

        // Réservations de la période
        $reservations = BookingReservation::where('site_id', $siteId)
            ->with('product')
            ->whereBetween('start_date', [$from, $to])
            ->get();

        $confirmed = $reservations->where('status', 'confirmed');
        $pending   = $reservations->where('status', 'pending');
        $cancelled = $reservations->where('status', 'cancelled');

        // Coûts fournisseurs : product_id -> cost_price (premier fournisseur)
        $productIds = BookingProduct::where('site_id', $siteId)->pluck('id');
        $supplierPriceMap = BookingSupplierPrice::whereIn('product_id', $productIds)
            ->get()
            ->groupBy('product_id')
            ->map(fn($prices) => (float) $prices->first()->cost_price);

        // Dépenses de la période
        $allExpenses = BookingExpense::where('site_id', $siteId)
            ->whereBetween('expense_date', [$from, $to])
            ->with(['supplier', 'product'])
            ->get();

        $expensesByProduct = $allExpenses
            ->filter(fn($e) => $e->product_id !== null)
            ->groupBy('product_id')
            ->map(fn($items) => $items->sum('amount'));

        $generalExpenses = (float) $allExpenses->filter(fn($e) => $e->product_id === null)->sum('amount');
        $totalExpenses   = (float) $allExpenses->sum('amount');

        // Helper : revenu d'une réservation
        $calcRevenue = function ($r) {
            if (!$r->product) return 0.0;
            $nights = max(1, $r->start_date->diffInDays($r->end_date));
            return match ($r->product->type) {
                'chambre'   => (($r->adults ?? 0) * (float)$r->product->price + ($r->children ?? 0) * (float)($r->product->price_child ?? 0)) * $nights,
                'excursion' => (($r->adults ?? 0) * (float)$r->product->price + ($r->children ?? 0) * (float)($r->product->price_child ?? 0)),
                'service'   => (float) $r->product->price,
                default     => 0.0,
            };
        };

        // Helper : coût fournisseur d'une réservation
        $calcSupplierCost = function ($r) use ($supplierPriceMap) {
            if (!$r->product) return 0.0;
            $costPrice = $supplierPriceMap[$r->product_id] ?? 0;
            if (!$costPrice) return 0.0;
            $nights  = max(1, $r->start_date->diffInDays($r->end_date));
            $persons = max(1, ($r->adults ?? 0) + ($r->children ?? 0));
            return match ($r->product->type) {
                'chambre'   => $costPrice * $persons * $nights,
                'excursion' => $costPrice * $persons,
                'service'   => $costPrice,
                default     => 0.0,
            };
        };

        $revenue       = $confirmed->sum($calcRevenue);
        $supplierCosts = $confirmed->sum($calcSupplierCost);
        $margin        = $revenue - $supplierCosts - $totalExpenses;

        // Taux d'occupation (chambres)
        $chambresCount = BookingProduct::where('site_id', $siteId)->where('type', 'chambre')->where('status', 'active')->count();
        $occupancyRate = null;
        if ($chambresCount > 0) {
            $totalNights = max(1, Carbon::parse($from)->diffInDays(Carbon::parse($to)));
            $occupiedNights = $confirmed
                ->filter(fn($r) => $r->product?->type === 'chambre')
                ->sum(fn($r) => max(1, $r->start_date->diffInDays($r->end_date)));
            $occupancyRate = round($occupiedNights / ($chambresCount * $totalNights) * 100, 1);
        }

        // Marges par produit
        $products = BookingProduct::where('site_id', $siteId)->get();
        $productMargins = $products->map(function ($product) use ($confirmed, $supplierPriceMap, $expensesByProduct, $calcRevenue, $calcSupplierCost) {
            $confirmedRes    = $confirmed->where('product_id', $product->id);
            $costPrice       = (float) ($supplierPriceMap[$product->id] ?? 0);
            $productExpenses = (float) ($expensesByProduct[$product->id] ?? 0);
            $revenue         = $confirmedRes->sum($calcRevenue);
            $supplierCost    = $confirmedRes->sum($calcSupplierCost);
            $totalCost       = $supplierCost + $productExpenses;
            $margin          = $revenue - $totalCost;
            return [
                'id'               => (string) $product->id,
                'name'             => $product->name,
                'type'             => $product->type,
                'sell_price'       => (float) $product->price,
                'sell_price_child' => (float) ($product->price_child ?? 0),
                'cost_price'       => $costPrice,
                'res_count'        => $confirmedRes->count(),
                'revenue'          => round($revenue, 2),
                'supplier_cost'    => round($supplierCost, 2),
                'product_expenses' => round($productExpenses, 2),
                'total_cost'       => round($totalCost, 2),
                'margin'           => round($margin, 2),
                'margin_pct'       => $revenue > 0 ? round($margin / $revenue * 100, 1) : 0,
            ];
        })->filter(fn($p) => $p['res_count'] > 0 || $p['product_expenses'] > 0)->values();

        // Tâches
        $allTasks       = Task::where('site_id', $siteId)->get();
        $taskTotal      = $allTasks->count();
        $taskCompleted  = $allTasks->where('status', 'completed')->count();
        $taskInProgress = $allTasks->where('status', 'in-progress')->count();
        $taskPending    = $allTasks->where('status', 'pending')->count();

        $revenueByMonth    = $this->getRevenueByMonth($from, $to, $confirmed, $calcRevenue, $calcSupplierCost, $allExpenses);
        $occupancyTimeline = $this->getOccupancyTimeline($siteId);

        $expensesDetail = $allExpenses->map(fn($e) => [
            'id'            => $e->id,
            'label'         => $e->label,
            'amount'        => (float) $e->amount,
            'expense_date'  => $e->expense_date instanceof Carbon ? $e->expense_date->toDateString() : (string)$e->expense_date,
            'product_name'  => $e->product?->name,
            'supplier_name' => $e->supplier?->name,
            'notes'         => $e->notes,
        ])->values();

        return response()->json([
            'period'              => ['from' => $from, 'to' => $to],
            'total_reservations'  => $reservations->count(),
            'confirmed'           => $confirmed->count(),
            'pending'             => $pending->count(),
            'cancelled'           => $cancelled->count(),
            'revenue'             => round($revenue, 2),
            'supplier_costs'      => round($supplierCosts, 2),
            'expenses'            => round($totalExpenses, 2),
            'general_expenses'    => round($generalExpenses, 2),
            'margin'              => round($margin, 2),
            'margin_pct'          => $revenue > 0 ? round($margin / $revenue * 100, 1) : 0,
            'occupancy_rate'      => $occupancyRate,
            'product_margins'     => $productMargins,
            'revenue_by_month'    => $revenueByMonth,
            'occupancy_timeline'  => $occupancyTimeline,
            'expenses_detail'     => $expensesDetail,
            'status_distribution' => [
                ['name' => 'Confirmées', 'value' => $confirmed->count(), 'color' => '#22c55e'],
                ['name' => 'En attente', 'value' => $pending->count(),   'color' => '#f59e0b'],
                ['name' => 'Annulées',   'value' => $cancelled->count(), 'color' => '#ef4444'],
            ],
            'tasks' => [
                'total'       => $taskTotal,
                'completed'   => $taskCompleted,
                'in_progress' => $taskInProgress,
                'pending'     => $taskPending,
            ],
        ]);
    }

    private function getRevenueByMonth(string $from, string $to, $confirmed, callable $calcRevenue, callable $calcSupplierCost, $allExpenses): array
    {
        $months = [];
        $start  = Carbon::parse($from)->startOfMonth();
        $end    = Carbon::parse($to)->endOfMonth();

        while ($start->lte($end)) {
            $mStart = $start->copy()->startOfMonth()->toDateString();
            $mEnd   = $start->copy()->endOfMonth()->toDateString();

            $monthRes      = $confirmed->filter(fn($r) => $r->start_date->toDateString() >= $mStart && $r->start_date->toDateString() <= $mEnd);
            $mRevenue      = $monthRes->sum($calcRevenue);
            $mSupplierCost = $monthRes->sum($calcSupplierCost);
            $mExpenses     = (float) $allExpenses->filter(fn($e) => $e->expense_date >= $mStart && $e->expense_date <= $mEnd)->sum('amount');

            $months[] = [
                'month'         => $start->locale('fr')->isoFormat('MMM YYYY'),
                'revenue'       => round($mRevenue, 2),
                'supplier_cost' => round($mSupplierCost, 2),
                'expenses'      => round($mExpenses, 2),
                'margin'        => round($mRevenue - $mSupplierCost - $mExpenses, 2),
            ];
            $start->addMonth();
        }
        return $months;
    }

    private function getOccupancyTimeline(string $siteId): array
    {
        $chambres = BookingProduct::where('site_id', $siteId)->where('type', 'chambre')->where('status', 'active')->pluck('id');
        if ($chambres->isEmpty()) return [];

        $timeline = [];
        for ($i = 0; $i < 14; $i++) {
            $date     = Carbon::today()->addDays($i)->toDateString();
            $occupied = BookingReservation::whereIn('product_id', $chambres)
                ->whereNotIn('status', ['cancelled'])
                ->where('start_date', '<=', $date)
                ->where('end_date', '>', $date)
                ->count();
            $timeline[] = [
                'date'     => $date,
                'occupied' => $occupied,
                'total'    => $chambres->count(),
                'rate'     => $chambres->count() > 0 ? round($occupied / $chambres->count() * 100) : 0,
            ];
        }
        return $timeline;
    }
}
