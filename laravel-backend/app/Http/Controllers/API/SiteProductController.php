<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SiteProduct;
use App\Models\UserSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SiteProductController extends Controller
{
    /**
     * GET /site-builder/sites/{siteId}/products
     */
    public function index(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $products = SiteProduct::where('site_id', $siteId)
            ->orderBy('is_active', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($p) => $this->transform($p));

        return response()->json(['success' => true, 'data' => $products]);
    }

    /**
     * POST /site-builder/sites/{siteId}/products
     */
    public function store(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $validated = $this->validateProduct($request);

        $product = SiteProduct::create(array_merge($validated, ['site_id' => $siteId]));

        return response()->json([
            'success' => true,
            'message' => 'Produit créé.',
            'data'    => $this->transform($product),
        ], 201);
    }

    /**
     * GET /site-builder/sites/{siteId}/products/{id}
     */
    public function show(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $product = SiteProduct::where('site_id', $siteId)->find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produit introuvable.'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->transform($product)]);
    }

    /**
     * PUT /site-builder/sites/{siteId}/products/{id}
     */
    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $product = SiteProduct::where('site_id', $siteId)->find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produit introuvable.'], 404);
        }

        $validated = $this->validateProduct($request, updating: true);
        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produit mis à jour.',
            'data'    => $this->transform($product->fresh()),
        ]);
    }

    /**
     * PATCH /site-builder/sites/{siteId}/products/{id}/toggle
     */
    public function toggle(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $product = SiteProduct::where('site_id', $siteId)->find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produit introuvable.'], 404);
        }

        $product->update(['is_active' => !$product->is_active]);

        return response()->json([
            'success'   => true,
            'message'   => $product->is_active ? 'Produit activé.' : 'Produit désactivé.',
            'is_active' => $product->is_active,
        ]);
    }

    /**
     * DELETE /site-builder/sites/{siteId}/products/{id}
     */
    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $product = SiteProduct::where('site_id', $siteId)->find($id);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Produit introuvable.'], 404);
        }

        $product->delete();

        return response()->json(['success' => true, 'message' => 'Produit supprimé.']);
    }

    /**
     * POST /site-builder/sites/{siteId}/products/upload-image
     * Upload une image depuis l'ordinateur et retourne l'URL publique.
     */
    public function uploadImage(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $file = $request->file('image');
        $filename = 'product_' . $site->id . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('product-images', $filename, 'public');

        return response()->json([
            'success' => true,
            'url'     => Storage::disk('public')->url($path),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function getSiteOrFail(string $siteId, Request $request): UserSite|JsonResponse
    {
        $userId = $request->user()->id;

        // Propriétaire direct du site OU propriétaire du workspace qui contient ce site
        $site = UserSite::where('id', $siteId)
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                  ->orWhereHas('workspace', fn($wq) => $wq->where('owner_user_id', $userId));
            })
            ->first();

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site introuvable ou accès refusé.'], 404);
        }

        return $site;
    }

    private function validateProduct(Request $request, bool $updating = false): array
    {
        $rules = [
            'name'                       => ($updating ? 'sometimes|' : '') . 'required|string|max:255',
            'description'                => 'nullable|string',
            'images'                     => 'nullable|array',
            'images.*'                   => 'nullable|string|max:500',
            'base_price'                 => 'nullable|integer|min:0',
            'is_active'                  => 'nullable|boolean',
            'price_low_season'           => 'nullable|array',
            'price_low_season.price'     => 'nullable|integer|min:0',
            'price_low_season.date_start'=> 'nullable|string|max:5',
            'price_low_season.date_end'  => 'nullable|string|max:5',
            'price_mid_season'           => 'nullable|array',
            'price_mid_season.price'     => 'nullable|integer|min:0',
            'price_mid_season.date_start'=> 'nullable|string|max:5',
            'price_mid_season.date_end'  => 'nullable|string|max:5',
            'price_high_season'          => 'nullable|array',
            'price_high_season.price'    => 'nullable|integer|min:0',
            'price_high_season.date_start'=> 'nullable|string|max:5',
            'price_high_season.date_end' => 'nullable|string|max:5',
            'price_peak_season'          => 'nullable|array',
            'price_peak_season.price'    => 'nullable|integer|min:0',
            'price_peak_season.date_start'=> 'nullable|string|max:5',
            'price_peak_season.date_end' => 'nullable|string|max:5',
        ];

        return $request->validate($rules);
    }

    private function transform(SiteProduct $p): array
    {
        return [
            'id'                 => $p->id,
            'site_id'            => $p->site_id,
            'name'               => $p->name,
            'description'        => $p->description,
            'images'             => $p->images ?? [],
            'base_price'         => $p->base_price,
            'price_low_season'   => $p->price_low_season,
            'price_mid_season'   => $p->price_mid_season,
            'price_high_season'  => $p->price_high_season,
            'price_peak_season'  => $p->price_peak_season,
            'is_active'          => $p->is_active,
            'created_at'         => $p->created_at?->toISOString(),
        ];
    }
}
