<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingExpense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingExpenseController extends Controller
{
    public function index(Request $request, string $siteId): JsonResponse
    {
        $query = BookingExpense::where('site_id', $siteId)
            ->with(['product', 'supplier']);

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $expenses = $query->orderByDesc('expense_date')->get();

        return response()->json($expenses);
    }

    public function store(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'label'        => 'required|string|max:255',
            'amount'       => 'required|numeric|min:0',
            'product_id'   => 'nullable|integer|exists:booking_products,id',
            'supplier_id'  => 'nullable|integer|exists:booking_suppliers,id',
            'expense_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        $data['site_id'] = $siteId;
        $expense = BookingExpense::create($data);

        return response()->json($expense->load(['product', 'supplier']), 201);
    }

    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $expense = BookingExpense::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'label'        => 'sometimes|string|max:255',
            'amount'       => 'sometimes|numeric|min:0',
            'product_id'   => 'nullable|integer|exists:booking_products,id',
            'supplier_id'  => 'nullable|integer|exists:booking_suppliers,id',
            'expense_date' => 'sometimes|date',
            'notes'        => 'nullable|string',
        ]);

        $expense->update($data);

        return response()->json($expense->load(['product', 'supplier']));
    }

    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        BookingExpense::where('site_id', $siteId)->findOrFail($id)->delete();

        return response()->json(['message' => 'Dépense supprimée.']);
    }
}
