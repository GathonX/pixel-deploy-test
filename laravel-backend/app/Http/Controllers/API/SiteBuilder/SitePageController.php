<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use App\Models\SitePage;
use App\Models\SiteSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SitePageController extends Controller
{
    /**
     * Liste les pages d'un site
     */
    public function index(string $siteId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $pages = $site->pages()->with('sections.sectionType')->get();

        return response()->json([
            'success' => true,
            'data' => $pages
        ]);
    }

    /**
     * Créer une nouvelle page
     */
    public function store(Request $request, string $siteId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:100',
        ]);

        $maxOrder = $site->pages()->max('order') ?? -1;

        // S'assurer que le slug commence par /
        $slug = $validated['slug'];
        if (!str_starts_with($slug, '/')) {
            $slug = '/' . $slug;
        }

        $page = SitePage::create([
            'site_id' => $siteId,
            'name' => $validated['name'],
            'slug' => $slug,
            'order' => $maxOrder + 1,
            'is_published' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Page créée',
            'data' => $page
        ], 201);
    }

    /**
     * Mettre à jour une page
     */
    public function update(Request $request, string $siteId, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $page = $site->pages()->find($id);

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

        // S'assurer que le slug commence par /
        if (isset($validated['slug']) && !str_starts_with($validated['slug'], '/')) {
            $validated['slug'] = '/' . $validated['slug'];
        }

        $page->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Page mise à jour',
            'data' => $page
        ]);
    }

    /**
     * Supprimer une page
     */
    public function destroy(string $siteId, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $page = $site->pages()->find($id);

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

    /**
     * Dupliquer une page
     */
    public function duplicate(string $siteId, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $page = $site->pages()->with('sections')->find($id);

        if (!$page) {
            return response()->json([
                'success' => false,
                'message' => 'Page non trouvée'
            ], 404);
        }

        try {
            DB::beginTransaction();

            $maxOrder = $site->pages()->max('order') ?? -1;

            // Dupliquer la page
            $newPage = SitePage::create([
                'site_id' => $siteId,
                'name' => $page->name . ' (copie)',
                'slug' => $page->slug . '-copy',
                'order' => $maxOrder + 1,
                'is_published' => false,
            ]);

            // Dupliquer les sections
            foreach ($page->sections as $section) {
                SiteSection::create([
                    'page_id' => $newPage->id,
                    'section_type_id' => $section->section_type_id,
                    'order' => $section->order,
                    'content' => $section->content,
                    'styles' => $section->styles,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Page dupliquée',
                'data' => $newPage->load('sections.sectionType')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la duplication',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
