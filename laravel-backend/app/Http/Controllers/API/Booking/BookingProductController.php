<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingProduct;
use App\Models\BookingProductSeason;
use App\Models\BookingProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BookingProductController extends Controller
{
    public function index(Request $request, string $siteId): JsonResponse
    {
        $products = BookingProduct::where('site_id', $siteId)
            ->with(['seasons', 'images'])
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }

    public function store(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string',
            'type'         => 'required|in:chambre,excursion,service',
            'price'        => 'required|numeric|min:0',
            'price_child'  => 'nullable|numeric|min:0',
            'capacity'     => 'required|integer|min:1',
            'max_capacity' => 'nullable|integer|min:1',
            'stock'        => 'nullable|integer|min:0',
            'parcours'     => 'nullable|string',
            'amenities'    => 'nullable|array',
            'status'       => 'nullable|in:active,inactive',
        ]);

        $data['site_id'] = $siteId;
        $data['price_child'] = $data['price_child'] ?? 0;
        $data['max_capacity'] = $data['max_capacity'] ?? $data['capacity'];
        $data['stock'] = $data['stock'] ?? 1;

        $product = BookingProduct::create($data);

        return response()->json($product->load(['seasons', 'images']), 201);
    }

    public function show(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)
            ->with(['seasons', 'images', 'supplierPrices.supplier'])
            ->findOrFail($id);

        return response()->json($product);
    }

    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'name'         => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'type'         => 'sometimes|in:chambre,excursion,service',
            'price'        => 'sometimes|numeric|min:0',
            'price_child'  => 'nullable|numeric|min:0',
            'capacity'     => 'sometimes|integer|min:1',
            'max_capacity' => 'nullable|integer|min:1',
            'stock'        => 'nullable|integer|min:0',
            'parcours'     => 'nullable|string',
            'amenities'    => 'nullable|array',
            'status'       => 'nullable|in:active,inactive',
        ]);

        $product->update($data);

        return response()->json($product->load(['seasons', 'images']));
    }

    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);
        $product->delete();

        return response()->json(['message' => 'Produit supprimé.']);
    }

    // ----- Seasons -----

    public function getSeasons(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);
        return response()->json($product->seasons);
    }

    public function upsertSeason(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'season'      => 'required|in:base,moyenne,haute,tres_haute',
            'price'       => 'required|numeric|min:0',
            'price_child' => 'nullable|numeric|min:0',
            'start_month' => 'required|integer|between:1,12',
            'end_month'   => 'required|integer|between:1,12',
        ]);

        $season = BookingProductSeason::updateOrCreate(
            ['product_id' => $product->id, 'season' => $data['season']],
            $data
        );

        return response()->json($season, 201);
    }

    public function deleteSeason(Request $request, string $siteId, int $id, string $season): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);
        BookingProductSeason::where('product_id', $product->id)->where('season', $season)->delete();

        return response()->json(['message' => 'Saison supprimée.']);
    }

    // ----- Images -----

    public function uploadImage(Request $request, string $siteId, int $id): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);

        $request->validate(['image' => 'required|image|max:5120']);

        $path = $request->file('image')->store("booking/{$siteId}/products/{$id}", 'public');
        $url = Storage::url($path);

        $position = BookingProductImage::where('product_id', $id)->max('position') + 1;
        $image = BookingProductImage::create([
            'product_id' => $id,
            'url' => $url,
            'position' => $position,
        ]);

        return response()->json($image, 201);
    }

    public function deleteImage(Request $request, string $siteId, int $id, int $imageId): JsonResponse
    {
        $product = BookingProduct::where('site_id', $siteId)->findOrFail($id);
        $image = BookingProductImage::where('product_id', $id)->findOrFail($imageId);

        // Supprimer le fichier physique
        $relativePath = str_replace('/storage/', '', $image->url);
        Storage::disk('public')->delete($relativePath);

        $image->delete();

        return response()->json(['message' => 'Image supprimée.']);
    }
}
