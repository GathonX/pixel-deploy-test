<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use App\Models\SiteGlobalSection;
use App\Models\SiteSection;
use App\Models\SectionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SiteGlobalSectionController extends Controller
{
    /**
     * Liste les sections globales d'un site
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

        $sections = $site->globalSections()->with('sectionType')->get();

        return response()->json([
            'success' => true,
            'data' => $sections
        ]);
    }

    /**
     * Récupère une section globale (navbar ou footer)
     */
    public function show(string $siteId, string $position): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $section = $site->globalSections()
            ->where('position', $position)
            ->with('sectionType')
            ->first();

        if (!$section) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $section
        ]);
    }

    /**
     * Créer ou remplacer une section globale
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
            'position' => 'required|in:navbar,footer',
            'section_type_id' => 'required|string|exists:section_types,id',
            'content' => 'nullable|array',
            'styles' => 'nullable|array',
        ]);

        $sectionType = SectionType::find($validated['section_type_id']);

        // Récupérer l'ancien type pour détecter un changement de version
        $oldGlobal = $site->globalSections()->where('position', $validated['position'])->first();
        $oldTypeId = $oldGlobal?->section_type_id;
        $newTypeId = $validated['section_type_id'];

        try {
            DB::beginTransaction();

            // Supprimer l'ancienne section globale si elle existe
            $site->globalSections()->where('position', $validated['position'])->delete();

            // Créer la nouvelle section globale
            $section = SiteGlobalSection::create([
                'site_id' => $siteId,
                'section_type_id' => $newTypeId,
                'position' => $validated['position'],
                'content' => array_merge(
                    $sectionType->default_content ?? [],
                    $validated['content'] ?? []
                ),
                'styles' => array_merge(
                    $sectionType->default_styles ?? [],
                    $validated['styles'] ?? []
                ),
            ]);

            // Cascade : convertir toutes les sections du site pour matcher la version
            if ($oldTypeId && $oldTypeId !== $newTypeId && $validated['position'] === 'navbar') {
                $this->cascadeConvertSiteSections($site, $newTypeId);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur création section globale', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la section globale',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Section globale créée',
            'data' => $section->load('sectionType')
        ], 201);
    }

    /**
     * Mettre à jour une section globale
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $section = SiteGlobalSection::with('site')->find($id);

        if (!$section || $section->site->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        $validated = $request->validate([
            'content' => 'nullable|array',
            'styles' => 'nullable|array',
        ]);

        // Merge content et styles au lieu de remplacer
        $updates = [];

        if (isset($validated['content'])) {
            $updates['content'] = array_merge($section->content ?? [], $validated['content']);
        }

        if (isset($validated['styles'])) {
            $updates['styles'] = array_merge($section->styles ?? [], $validated['styles']);
        }

        $section->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Section globale mise à jour',
            'data' => $section->load('sectionType')
        ]);
    }

    /**
     * Supprimer une section globale
     */
    public function destroy(string $id): JsonResponse
    {
        $section = SiteGlobalSection::with('site')->find($id);

        if (!$section || $section->site->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'Section non trouvée'
            ], 404);
        }

        $section->delete();

        return response()->json([
            'success' => true,
            'message' => 'Section globale supprimée'
        ]);
    }

    /**
     * Convertir toutes les sections d'un site pour matcher la version du navbar.
     * Ex: navbar-premium-v3 → toutes les sections deviennent *-premium-v3
     */
    private function cascadeConvertSiteSections(UserSite $site, string $newNavbarTypeId): void
    {
        $targetSuffix = self::extractVersionSuffix($newNavbarTypeId);

        // Pré-charger tous les section types existants
        $allSectionTypes = SectionType::all()->keyBy('id');

        // Convertir les sections de toutes les pages
        $pages = $site->pages()->with('sections')->get();
        $converted = 0;

        foreach ($pages as $page) {
            foreach ($page->sections as $section) {
                $currentTypeId = $section->section_type_id;
                $newTypeId = self::convertToVersion($currentTypeId, $targetSuffix);

                if ($newTypeId !== $currentTypeId && $allSectionTypes->has($newTypeId)) {
                    $newSectionType = $allSectionTypes->get($newTypeId);
                    $section->update([
                        'section_type_id' => $newTypeId,
                        'content' => array_merge(
                            $newSectionType->default_content ?? [],
                            $section->content ?? []
                        ),
                        'styles' => $newSectionType->default_styles ?? $section->styles,
                    ]);
                    $converted++;
                }
            }
        }

        // Convertir aussi le footer global pour matcher
        $footer = $site->globalSections()->where('position', 'footer')->first();
        if ($footer) {
            $newFooterTypeId = self::convertToVersion($footer->section_type_id, $targetSuffix);
            if ($newFooterTypeId !== $footer->section_type_id && $allSectionTypes->has($newFooterTypeId)) {
                $newFooterType = $allSectionTypes->get($newFooterTypeId);
                $footer->update([
                    'section_type_id' => $newFooterTypeId,
                    'content' => array_merge(
                        $newFooterType->default_content ?? [],
                        $footer->content ?? []
                    ),
                    'styles' => $newFooterType->default_styles ?? $footer->styles,
                ]);
                $converted++;
            }
        }

        Log::info('Cascade conversion sections site', [
            'site_id' => $site->id,
            'target_suffix' => $targetSuffix,
            'sections_converted' => $converted,
        ]);
    }

    /**
     * Extraire le suffixe de version d'un section_type_id.
     * Ex: 'navbar-premium-v3' → '-premium-v3'
     *     'navbar-premium-v2' → '-premium-v2'
     *     'navbar-premium'    → '-premium'
     *     'navbar'            → ''
     */
    private static function extractVersionSuffix(string $typeId): string
    {
        // Retirer le base type (hero, navbar, footer, services, etc.)
        // Le pattern est: {base-type}{-premium}{-vN}
        if (preg_match('/(-premium(?:-v\d+)?)$/', $typeId, $matches)) {
            return $matches[1];
        }
        return '';
    }

    /**
     * Convertir un section_type_id vers une version cible.
     * Ex: convertToVersion('hero-premium', '-premium-v3') → 'hero-premium-v3'
     *     convertToVersion('hero-premium-v2', '-premium-v3') → 'hero-premium-v3'
     *     convertToVersion('hero', '-premium-v3') → 'hero-premium-v3'
     */
    private static function convertToVersion(string $typeId, string $targetSuffix): string
    {
        // Retirer tout suffixe premium existant
        $baseType = preg_replace('/-premium(?:-v\d+)?$/', '', $typeId);

        // Ajouter le suffixe cible
        return $baseType . $targetSuffix;
    }
}
