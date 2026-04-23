<?php

namespace App\Http\Controllers\API\Marketplace;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['index', 'show']);
        $this->middleware('admin')->only(['store', 'update', 'destroy']);
    }

    public function index(Request $request): JsonResponse
    {
        $query = MarketplaceCategory::with(['children', 'parent'])->active();

        if ($request->root_only) {
            $query->rootCategories();
        }

        $categories = $query->orderBy('order')->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    public function show($id): JsonResponse
    {
        $category = MarketplaceCategory::with(['children', 'parent', 'products'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $category
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:marketplace_categories,id',
            'icon' => 'nullable|string',
            'image' => 'nullable|string',
            'is_active' => 'boolean',
            'order' => 'integer',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $category = MarketplaceCategory::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Catégorie créée avec succès',
            'data' => $category
        ], 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $category = MarketplaceCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:marketplace_categories,id',
            'icon' => 'nullable|string',
            'image' => 'nullable|string',
            'is_active' => 'boolean',
            'order' => 'integer',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Catégorie mise à jour avec succès',
            'data' => $category
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $category = MarketplaceCategory::findOrFail($id);
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Catégorie supprimée avec succès'
        ]);
    }
}
