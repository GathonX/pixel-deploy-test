<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use App\Models\SiteSection;
use App\Models\SectionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SiteSectionController extends Controller
{
    /**
     * Liste les sections d'une page
     */
    public function index(string $pageId): JsonResponse
    {
        $page = SitePage::with('site')->find($pageId);

        if (!$page || $page->site->user_id !== Auth::id()) {
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
     * Créer une nouvelle section
     */
    public function store(Request $request, string $pageId): JsonResponse
    {
        $page = SitePage::with('site')->find($pageId);

        if (!$page || $page->site->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'section_type_id' => 'required|string|exists:section_types,id',
            'order' => 'nullable|integer',
            'content' => 'nullable|array',
            'styles' => 'nullable|array',
        ]);

        // Bloquer l'ajout de navbar/footer dans les pages (sections globales uniquement)
        $globalSectionTypes = ['navbar', 'footer'];
        if (in_array($validated['section_type_id'], $globalSectionTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'Les sections navbar et footer sont gérées globalement au niveau du site, pas des pages.'
            ], 422);
        }

        $sectionType = SectionType::find($validated['section_type_id']);
        $maxOrder = $page->sections()->max('order') ?? -1;

        $section = SiteSection::create([
            'page_id' => $pageId,
            'section_type_id' => $validated['section_type_id'],
            'order' => $validated['order'] ?? ($maxOrder + 1),
            'content' => array_merge(
                $sectionType->default_content ?? [],
                $validated['content'] ?? []
            ),
            'styles' => array_merge(
                $sectionType->default_styles ?? [],
                $validated['styles'] ?? []
            ),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Section créée',
            'data' => $section->load('sectionType')
        ], 201);
    }

    /**
     * Mettre à jour une section (content et/ou styles)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $section = SiteSection::with('page.site')->find($id);

        if (!$section || $section->page->site->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'content'      => 'nullable|array',
            'styles'       => 'nullable|array',
            'order'        => 'nullable|integer',
            'lang'         => 'nullable|string|max:10',
        ]);

        $updates = [];

        if (isset($validated['lang']) && $validated['lang']) {
            // Sauvegarder dans translations.{lang} au lieu de content
            if (isset($validated['content'])) {
                $existing = $section->translations ?? [];
                $existing[$validated['lang']] = array_merge(
                    $existing[$validated['lang']] ?? [],
                    $validated['content']
                );
                $updates['translations'] = $existing;
            }
        } else {
            // Langue par défaut : merge dans content
            if (isset($validated['content'])) {
                $updates['content'] = array_merge($section->content ?? [], $validated['content']);
            }
        }

        if (isset($validated['styles'])) {
            $updates['styles'] = array_merge($section->styles ?? [], $validated['styles']);
        }

        if (isset($validated['order'])) {
            $updates['order'] = $validated['order'];
        }

        $section->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Section mise à jour',
            'data' => $section->load('sectionType')
        ]);
    }

    /**
     * Supprimer une section
     */
    public function destroy(string $id): JsonResponse
    {
        $section = SiteSection::with('page.site')->find($id);

        if (!$section || $section->page->site->user_id !== Auth::id()) {
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

    /**
     * Réordonner les sections d'une page
     */
    public function reorder(Request $request, string $pageId): JsonResponse
    {
        $page = SitePage::with('site')->find($pageId);

        if (!$page || $page->site->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'section_ids' => 'required|array',
            'section_ids.*' => 'string',
        ]);

        foreach ($validated['section_ids'] as $order => $sectionId) {
            SiteSection::where('id', $sectionId)
                ->where('page_id', $pageId)
                ->update(['order' => $order]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sections réordonnées'
        ]);
    }
}
