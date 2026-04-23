<?php

namespace App\Http\Controllers\API\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceOrder;
use App\Models\MarketplaceOrderItem;
use App\Models\MarketplaceProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except([]);
        $this->middleware('admin')->only(['adminIndex', 'updateStatus', 'updatePaymentStatus']);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email',
            'customer_phone' => 'required|string',
            'shipping_address' => 'required|array',
            'billing_address' => 'nullable|array',
            'payment_method' => 'required|string|in:bank_transfer,mobile_money,card',
            'customer_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:marketplace_products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        DB::beginTransaction();
        try {
            $subtotal = 0;
            $orderItems = [];

            foreach ($validated['items'] as $item) {
                $product = MarketplaceProduct::findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity']) {
                    return response()->json([
                        'success' => false,
                        'message' => "Stock insuffisant pour {$product->name}"
                    ], 400);
                }

                $itemSubtotal = $product->price * $item['quantity'];
                $subtotal += $itemSubtotal;

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_price' => $product->price,
                    'quantity' => $item['quantity'],
                    'subtotal' => $itemSubtotal,
                    'product_snapshot' => $product->toArray(),
                ];
            }

            $order = MarketplaceOrder::create([
                'order_number' => MarketplaceOrder::generateOrderNumber(),
                'user_id' => auth()->id(),
                'customer_name' => $validated['customer_name'],
                'customer_email' => $validated['customer_email'],
                'customer_phone' => $validated['customer_phone'],
                'shipping_address' => $validated['shipping_address'],
                'billing_address' => $validated['billing_address'] ?? $validated['shipping_address'],
                'subtotal' => $subtotal,
                'tax' => 0,
                'shipping_cost' => 0,
                'discount' => 0,
                'total' => $subtotal,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'],
                'customer_notes' => $validated['customer_notes'],
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Commande créée avec succès',
                'data' => $order->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la commande',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id): JsonResponse
    {
        $order = MarketplaceOrder::with(['items.product', 'user'])
            ->findOrFail($id);

        if (auth()->user()->role !== 'admin' && $order->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès non autorisé'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ]);
    }

    public function uploadPaymentProof(Request $request, $id): JsonResponse
    {
        $order = MarketplaceOrder::findOrFail($id);

        if (auth()->user()->role !== 'admin' && $order->user_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Accès non autorisé'
            ], 403);
        }

        $request->validate([
            'proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120'
        ]);

        if ($request->hasFile('proof')) {
            $file = $request->file('proof');
            $path = $file->store('payment-proofs', 'public');

            $order->update([
                'payment_proof' => $path,
                'payment_date' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Preuve de paiement uploadée avec succès',
                'data' => $order
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Aucun fichier reçu'
        ], 400);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $query = MarketplaceOrder::with(['items', 'user']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('order_number', 'like', "%{$request->search}%")
                  ->orWhere('customer_name', 'like', "%{$request->search}%")
                  ->orWhere('customer_email', 'like', "%{$request->search}%");
            });
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $order = MarketplaceOrder::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,processing,shipped,delivered,cancelled'
        ]);

        $order->update(['status' => $validated['status']]);

        if ($validated['status'] === 'confirmed') {
            foreach ($order->items as $item) {
                $product = $item->product;
                $product->decrementStock($item->quantity);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Statut mis à jour avec succès',
            'data' => $order
        ]);
    }

    public function updatePaymentStatus(Request $request, $id): JsonResponse
    {
        $order = MarketplaceOrder::findOrFail($id);

        $validated = $request->validate([
            'payment_status' => 'required|in:pending,paid,failed,refunded'
        ]);

        $order->update(['payment_status' => $validated['payment_status']]);

        return response()->json([
            'success' => true,
            'message' => 'Statut de paiement mis à jour avec succès',
            'data' => $order
        ]);
    }
}
