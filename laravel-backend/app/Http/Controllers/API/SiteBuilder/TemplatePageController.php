<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SiteTemplate;
use App\Models\TemplatePage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TemplatePageController extends Controller
{
    /**
     * Liste les pages d'un template
     */
    public function index(string $templateId): JsonResponse
    {
        $template = SiteTemplate::find($templateId);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        $pages = $template->pages()->with('sections.sectionType')->get();

        return response()->json([
            'success' => true,
            'data' => $pages
        ]);
    }

    /**
     * Créer une page de template
     */
    public function store(Request $request, string $templateId): JsonResponse
    {
        $template = SiteTemplate::find($templateId);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100',
            'order' => 'nullable|integer',
        ]);

        $maxOrder = $template->pages()->max('order') ?? -1;

        $page = TemplatePage::create([
            'id' => Str::random(20),
            'template_id' => $templateId,
            'name' => $validated['name'],
            'slug' => $validated['slug'],
            'order' => $validated['order'] ?? ($maxOrder + 1),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Page créée',
            'data' => $page
        ], 201);
    }

    /**
     * Mettre à jour une page de template
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $page = TemplatePage::find($id);

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100',
            'order' => 'nullable|integer',
        ]);

        $page->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Page mise à jour',
            'data' => $page
        ]);
    }

    /**
     * Supprimer une page de template
     */
    public function destroy(string $id): JsonResponse
    {
        $page = TemplatePage::find($id);

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $page->delete();

        return response()->json([
            'success' => true,
            'message' => 'Page supprimée'
        ]);
    }
}
