<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SectionType;
use App\Models\SiteTemplate;
use App\Models\TemplatePage;
use App\Models\TemplateSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TemplateController extends Controller
{
    /**
     * Liste tous les templates actifs (pour les utilisateurs)
     */
    public function index(): JsonResponse
    {
        $templates = SiteTemplate::active()
            ->with(['pages.sections.sectionType'])
            ->withCount('sites')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    /**
     * Liste tous les templates (pour admin)
     */
    public function adminIndex(): JsonResponse
    {
        $templates = SiteTemplate::withCount(['sites', 'pages'])
            ->orderBy('status')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates
        ]);
    }

    /**
     * Récupère un template avec ses pages et sections
     */
    public function show(string $id): JsonResponse
    {
        $template = SiteTemplate::with(['pages.sections.sectionType'])->find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $template
        ]);
    }

    /**
     * Créer un nouveau template (admin)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'thumbnail' => 'nullable|string|max:500',
            'version' => 'nullable|string|max:20',
            'status' => 'nullable|in:draft,active,archived',
            'price' => 'nullable|numeric|min:0',
            'price_ariary' => 'nullable|integer|min:0',
            'is_premium' => 'nullable|boolean',
        ]);

        $template = SiteTemplate::create([
            'id' => Str::random(20),
            ...$validated,
            'status' => $validated['status'] ?? 'draft',
            'version' => $validated['version'] ?? '1.0.0',
            'is_premium' => $validated['is_premium'] ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template créé avec succès',
            'data' => $template
        ], 201);
    }

    /**
     * Mettre à jour un template (admin)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $template = SiteTemplate::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'thumbnail' => 'nullable|string|max:500',
            'version' => 'nullable|string|max:20',
            'status' => 'nullable|in:draft,active,archived',
            'price' => 'nullable|numeric|min:0',
            'price_ariary' => 'nullable|integer|min:0',
            'is_premium' => 'nullable|boolean',
        ]);

        // Détecter si is_premium a changé
        $premiumChanged = isset($validated['is_premium']) && (bool) $validated['is_premium'] !== (bool) $template->is_premium;
        $newIsPremium = $validated['is_premium'] ?? $template->is_premium;

        try {
            DB::beginTransaction();

            $template->update($validated);

            // Convertir automatiquement les sections si is_premium a changé
            if ($premiumChanged) {
                $this->convertTemplateSections($template, (bool) $newIsPremium);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du template',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Template mis à jour',
            'data' => $template->load('pages.sections.sectionType')
        ]);
    }

    /**
     * Convertir les sections d'un template entre gratuit et premium.
     * Appelée dans une transaction parente (update) - ne gère pas sa propre transaction.
     */
    private function convertTemplateSections(SiteTemplate $template, bool $toPremium): void
    {
        $template->load('pages.sections');

        // Pré-charger tous les section types existants pour éviter les requêtes N+1
        $allSectionTypes = SectionType::all()->keyBy('id');
        $converted = 0;

        foreach ($template->pages as $page) {
            foreach ($page->sections as $section) {
                $currentTypeId = $section->section_type_id;
                $newTypeId = self::convertSectionTypeId($currentTypeId, $toPremium);

                // Ne convertir que si le type change ET que la variante cible existe
                if ($newTypeId !== $currentTypeId && $allSectionTypes->has($newTypeId)) {
                    $newSectionType = $allSectionTypes->get($newTypeId);
                    $section->update([
                        'section_type_id' => $newTypeId,
                        'default_content' => $newSectionType->default_content ?? $section->default_content,
                        'default_styles' => $newSectionType->default_styles ?? $section->default_styles,
                    ]);
                    $converted++;
                }
            }
        }

        Log::info('Conversion sections template', [
            'template_id' => $template->id,
            'to_premium' => $toPremium,
            'sections_converted' => $converted,
        ]);
    }

    /**
     * Convertir un section_type_id entre gratuit et premium.
     * Utilise le suffixe "-premium" comme convention stricte.
     */
    private static function convertSectionTypeId(string $typeId, bool $toPremium): string
    {
        $suffix = '-premium';

        if ($toPremium) {
            // gratuit → premium : ajouter le suffixe s'il n'est pas déjà présent
            return str_ends_with($typeId, $suffix) ? $typeId : $typeId . $suffix;
        }

        // premium → gratuit : retirer uniquement le suffixe en fin de chaîne
        return str_ends_with($typeId, $suffix)
            ? substr($typeId, 0, -strlen($suffix))
            : $typeId;
    }

    /**
     * Supprimer un template (admin)
     */
    public function destroy(string $id): JsonResponse
    {
        $template = SiteTemplate::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        // Vérifier si des sites utilisent ce template
        if ($template->sites()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Ce template est utilisé par des sites et ne peut pas être supprimé'
            ], 422);
        }

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template supprimé'
        ]);
    }

    /**
     * Dupliquer un template (admin)
     */
    public function duplicate(string $id): JsonResponse
    {
        $template = SiteTemplate::with(['pages.sections'])->find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        // Dupliquer le template
        $newTemplate = SiteTemplate::create([
            'id' => Str::random(20),
            'name' => $template->name . ' (copie)',
            'description' => $template->description,
            'category' => $template->category,
            'thumbnail' => $template->thumbnail,
            'version' => '1.0.0',
            'status' => 'draft',
            'price' => $template->price,
            'price_ariary' => $template->price_ariary,
            'is_premium' => $template->is_premium,
        ]);

        // Dupliquer les pages et sections
        foreach ($template->pages as $page) {
            $newPage = TemplatePage::create([
                'id' => Str::random(20),
                'template_id' => $newTemplate->id,
                'name' => $page->name,
                'slug' => $page->slug,
                'order' => $page->order,
            ]);

            foreach ($page->sections as $section) {
                TemplateSection::create([
                    'id' => Str::random(20),
                    'template_page_id' => $newPage->id,
                    'section_type_id' => $section->section_type_id,
                    'order' => $section->order,
                    'default_content' => $section->default_content,
                    'default_styles' => $section->default_styles,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Template dupliqué',
            'data' => $newTemplate->load('pages.sections')
        ], 201);
    }

    /**
     * Upload d'image pour template (admin)
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        $image = $request->file('image');
        $filename = 'template_' . time() . '_' . Str::random(8) . '.' . $image->getClientOriginalExtension();
        $image->storeAs('template-thumbnails', $filename, 'public');

        $path = '/storage/template-thumbnails/' . $filename;

        return response()->json([
            'success' => true,
            'data' => [
                'path' => $path,
                'filename' => $filename,
            ]
        ]);
    }

    /**
     * Archiver un template (admin)
     */
    public function archive(string $id): JsonResponse
    {
        $template = SiteTemplate::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template non trouvé'
            ], 404);
        }

        $template->update(['status' => 'archived']);

        return response()->json([
            'success' => true,
            'message' => 'Template archivé',
            'data' => $template
        ]);
    }
}
