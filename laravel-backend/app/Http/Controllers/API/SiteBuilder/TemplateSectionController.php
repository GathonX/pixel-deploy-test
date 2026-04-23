<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SiteTemplate;
use App\Models\TemplatePage;
use App\Models\TemplateSection;
use App\Models\SectionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TemplateSectionController extends Controller
{
    /**
     * Liste les sections d'une page de template
     */
    public function index(string $pageId): JsonResponse
    {
        $page = TemplatePage::find($pageId);

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $sections = $page->sections()->with('sectionType')->get();

        return response()->json([
            'success' => true,
            'data' => $sections
        ]);
    }

    /**
     * Créer une section de template
     */
    public function store(Request $request, string $pageId): JsonResponse
    {
        $page = TemplatePage::find($pageId);

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'section_type_id' => 'required|string|exists:section_types,id',
            'order' => 'nullable|integer',
            'default_content' => 'nullable|array',
            'default_styles' => 'nullable|array',
        ]);

        // Adapter automatiquement le section_type_id selon premium/gratuit du template
        $template = SiteTemplate::find($page->template_id);
        $requestedTypeId = $validated['section_type_id'];
        $sectionTypeId = $this->adaptSectionTypeId($requestedTypeId, (bool) $template?->is_premium);

        $sectionType = SectionType::find($sectionTypeId);
        if (!$sectionType) {
            // Fallback sur l'ID demandé si la variante n'existe pas
            $sectionTypeId = $requestedTypeId;
            $sectionType = SectionType::find($sectionTypeId);
        }

        $maxOrder = $page->sections()->max('order') ?? -1;

        $section = TemplateSection::create([
            'id' => Str::random(20),
            'template_page_id' => $pageId,
            'section_type_id' => $sectionTypeId,
            'order' => $validated['order'] ?? ($maxOrder + 1),
            'default_content' => $validated['default_content'] ?? $sectionType->default_content ?? [],
            'default_styles' => $validated['default_styles'] ?? $sectionType->default_styles ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Section créée',
            'data' => $section->load('sectionType')
        ], 201);
    }

    /**
     * Mettre à jour une section de template
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $section = TemplateSection::find($id);

        if (!$section) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'order' => 'nullable|integer',
            'default_content' => 'nullable|array',
            'default_styles' => 'nullable|array',
        ]);

        $section->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Section mise à jour',
            'data' => $section->load('sectionType')
        ]);
    }

    /**
     * Adapter un section_type_id selon le mode premium/gratuit du template.
     * Convention stricte : suffixe "-premium" en fin de chaîne uniquement.
     */
    private function adaptSectionTypeId(string $typeId, bool $isPremium): string
    {
        $suffix = '-premium';

        if ($isPremium) {
            return str_ends_with($typeId, $suffix) ? $typeId : $typeId . $suffix;
        }

        return str_ends_with($typeId, $suffix)
            ? substr($typeId, 0, -strlen($suffix))
            : $typeId;
    }

    /**
     * Supprimer une section de template
     */
    public function destroy(string $id): JsonResponse
    {
        $section = TemplateSection::find($id);

        if (!$section) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        $section->delete();

        return response()->json([
            'success' => true,
            'message' => 'Section supprimée'
        ]);
    }
}
