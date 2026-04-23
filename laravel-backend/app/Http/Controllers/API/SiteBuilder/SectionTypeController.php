<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionType;
use Illuminate\Http\JsonResponse;

class SectionTypeController extends Controller
{
    /**
     * Liste tous les types de sections disponibles
     */
    public function index(): JsonResponse
    {
        $sectionTypes = SectionType::all();

        return response()->json([
            'success' => true,
            'data' => $sectionTypes
        ]);
    }

    /**
     * Récupère un type de section par son ID
     */
    public function show(string $id): JsonResponse
    {
        $sectionType = SectionType::find($id);

        if (!$sectionType) {
            return response()->json([
                'success' => false,
                'message' => 'Type de section non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sectionType
        ]);
    }
}
