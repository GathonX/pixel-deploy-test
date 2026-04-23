<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingSupplier;
use App\Models\BookingSupplierPrice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingSupplierController extends Controller
{
    public function index(Request $request, string $siteId): JsonResponse
    {
        $suppliers = BookingSupplier::where('site_id', $siteId)
            ->with('prices.product')
            ->orderBy('name')
            ->get();

        return response()->json($suppliers);
    }

    public function store(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'contact_email' => 'nullable|email',
            'phone'         => 'nullable|string|max:50',
            'notes'         => 'nullable|string',
        ]);

        $data['site_id'] = $siteId;
        $supplier = BookingSupplier::create($data);

        return response()->json($supplier, 201);
    }

    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $supplier = BookingSupplier::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'contact_email' => 'nullable|email',
            'phone'         => 'nullable|string|max:50',
            'notes'         => 'nullable|string',
        ]);

        $supplier->update($data);

        return response()->json($supplier);
    }

    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        $supplier = BookingSupplier::where('site_id', $siteId)->findOrFail($id);
        $supplier->delete();

        return response()->json(['message' => 'Fournisseur supprimé.']);
    }

    public function upsertPrice(Request $request, string $siteId, int $id): JsonResponse
    {
        $supplier = BookingSupplier::where('site_id', $siteId)->findOrFail($id);

        $data = $request->validate([
            'product_id' => 'required|integer|exists:booking_products,id',
            'cost_price' => 'required|numeric|min:0',
        ]);

        $price = BookingSupplierPrice::updateOrCreate(
            ['supplier_id' => $supplier->id, 'product_id' => $data['product_id']],
            ['cost_price' => $data['cost_price']]
        );

        return response()->json($price, 201);
    }

    public function deletePrice(Request $request, string $siteId, int $supplierId, int $priceId): JsonResponse
    {
        $supplier = BookingSupplier::where('site_id', $siteId)->findOrFail($supplierId);
        BookingSupplierPrice::where('supplier_id', $supplier->id)->findOrFail($priceId)->delete();

        return response()->json(['message' => 'Prix fournisseur supprimé.']);
    }
}
