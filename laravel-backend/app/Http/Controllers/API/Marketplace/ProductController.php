<?php

namespace App\Http\Controllers\API\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['index', 'show']);
        $this->middleware('admin')->only(['store', 'update', 'destroy']);
    }

    public function index(Request $request): JsonResponse
    {
        $query = MarketplaceProduct::with(['category', 'badges'])
            ->active()
            ->inStock();

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->featured) {
            $query->featured();
        }

        $products = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function show($slug): JsonResponse
    {
        $product = MarketplaceProduct::with(['category', 'badges'])
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $product
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'short_description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category_id' => 'required|exists:marketplace_categories,id',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => 'nullable|string|unique:marketplace_products,sku',
            'images' => 'nullable|array',
            'main_image' => 'nullable|string',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['slug'] = Str::slug($validated['name']);

        if (!isset($validated['sku'])) {
            $validated['sku'] = 'SKU-' . strtoupper(Str::random(8));
        }

        $product = MarketplaceProduct::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produit créé avec succès',
            'data' => $product->load(['category', 'badges'])
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $product = MarketplaceProduct::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'short_description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'original_price' => 'nullable|numeric|min:0',
            'category_id' => 'sometimes|required|exists:marketplace_categories,id',
            'stock_quantity' => 'sometimes|required|integer|min:0',
            'sku' => 'nullable|string|unique:marketplace_products,sku,' . $id,
            'images' => 'nullable|array',
            'main_image' => 'nullable|string',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produit mis à jour avec succès',
            'data' => $product->load(['category', 'badges'])
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $product = MarketplaceProduct::findOrFail($id);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produit supprimé avec succès'
        ]);
    }
}
