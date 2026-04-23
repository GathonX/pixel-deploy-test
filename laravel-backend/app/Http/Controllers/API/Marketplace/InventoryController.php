<?php

namespace App\Http\Controllers\API\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceProduct;
use App\Models\MarketplaceInventoryLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('admin');
    }

    public function index(Request $request): JsonResponse
    {
        $query = MarketplaceProduct::with('category');

        if ($request->low_stock) {
            $threshold = $request->threshold ?? 10;
            $query->where('stock_quantity', '<=', $threshold)
                  ->where('stock_quantity', '>', 0);
        }

        if ($request->out_of_stock) {
            $query->where('stock_quantity', 0);
        }

        $products = $query->orderBy('stock_quantity', 'asc')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function adjustStock(Request $request, $productId): JsonResponse
    {
        $product = MarketplaceProduct::findOrFail($productId);

        $validated = $request->validate([
            'quantity' => 'required|integer',
            'type' => 'required|in:stock_in,stock_out,sale,return,adjustment',
            'notes' => 'nullable|string'
        ]);

        $previousQuantity = $product->stock_quantity;
        $newQuantity = $previousQuantity + $validated['quantity'];

        if ($newQuantity < 0) {
            return response()->json([
                'success' => false,
                'message' => 'Le stock ne peut pas être négatif'
            ], 400);
        }

        $product->update(['stock_quantity' => $newQuantity]);

        MarketplaceInventoryLog::create([
            'product_id' => $product->id,
            'quantity_change' => $validated['quantity'],
            'previous_quantity' => $previousQuantity,
            'new_quantity' => $newQuantity,
            'type' => $validated['type'],
            'notes' => $validated['notes'],
            'created_by' => auth()->id(),
            'created_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stock ajusté avec succès',
            'data' => $product->fresh()
        ]);
    }

    public function getLogs($productId): JsonResponse
    {
        $logs = MarketplaceInventoryLog::with('creator')
            ->where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
