<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\SiteLanguage;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Services\PlanResolver;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SiteLanguageController extends Controller
{
    private PlanResolver $planResolver;

    public function __construct(PlanResolver $planResolver)
    {
        $this->planResolver = $planResolver;
    }

    /**
     * Liste les langues actives d'un site.
     */
    public function index(string $siteId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $languages = $site->languages()->orderBy('is_default', 'desc')->orderBy('created_at')->get();

        return response()->json([
            'success' => true,
            'data'    => $languages,
        ]);
    }

    /**
     * Ajoute une langue à un site — vérifie le quota plan avant d'accepter.
     */
    public function store(Request $request, string $siteId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $validated = $request->validate([
            'language_code' => 'required|string|max:10',
            'is_default'    => 'boolean',
            'is_paid_extra' => 'boolean',
        ]);

        // Éviter le doublon
        $existing = $site->languages()->where('language_code', $validated['language_code'])->first();
        if ($existing) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'LANGUAGE_ALREADY_EXISTS',
                'message'     => "La langue '{$validated['language_code']}' est déjà configurée pour ce site.",
            ], 422);
        }

        // Résoudre le workspace
        $workspace = $this->resolveWorkspace(Auth::id());
        if (!$workspace) {
            return response()->json([
                'success'     => false,
                'reason_code' => 'NO_WORKSPACE',
                'message'     => 'Aucun workspace trouvé.',
            ], 403);
        }

        // Vérifier le quota (sauf si c'est explicitement une langue payante supplémentaire)
        $isPaidExtra = $validated['is_paid_extra'] ?? false;
        if (!$isPaidExtra) {
            $check = $this->planResolver->canAddLanguage($site, $workspace);
            if (!$check['allowed']) {
                return response()->json([
                    'success'      => false,
                    'reason_code'  => $check['reason_code'],
                    'message'      => $check['message'] ?? 'Quota de langues atteint pour votre plan.',
                    'extra_price'  => $check['extra_price'] ?? null,
                    'upgrade_url'  => '/workspace/billing',
                ], 403);
            }
        }

        // Si c'est la nouvelle langue par défaut, retirer l'ancien défaut
        if (!empty($validated['is_default'])) {
            $site->languages()->where('is_default', true)->update(['is_default' => false]);
        }

        $language = SiteLanguage::create([
            'site_id'       => $site->id,
            'language_code' => $validated['language_code'],
            'status'        => 'active',
            'is_default'    => $validated['is_default'] ?? false,
            'is_paid_extra' => $isPaidExtra,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Langue '{$validated['language_code']}' ajoutée.",
            'data'    => $language,
        ], 201);
    }

    /**
     * Supprime une langue d'un site (impossible si c'est la seule ou la langue par défaut).
     */
    public function destroy(string $siteId, int $languageId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $language = $site->languages()->find($languageId);
        if (!$language) {
            return response()->json(['success' => false, 'message' => 'Langue non trouvée.'], 404);
        }

        if ($language->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer la langue par défaut. Définissez une autre langue comme défaut d\'abord.',
            ], 422);
        }

        $language->delete();

        return response()->json([
            'success' => true,
            'message' => "Langue supprimée.",
        ]);
    }

    /**
     * Définit une langue comme langue par défaut du site.
     */
    public function setDefault(string $siteId, int $languageId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $language = $site->languages()->find($languageId);
        if (!$language) {
            return response()->json(['success' => false, 'message' => 'Langue non trouvée.'], 404);
        }

        $site->languages()->update(['is_default' => false]);
        $language->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'message' => "Langue par défaut mise à jour.",
            'data'    => $language->fresh(),
        ]);
    }

    private function resolveWorkspace(int $userId): ?Workspace
    {
        $workspace = Workspace::where('owner_user_id', $userId)->first();
        if (!$workspace) {
            $membership = WorkspaceUser::where('user_id', $userId)->first();
            if ($membership) $workspace = Workspace::find($membership->workspace_id);
        }
        return $workspace;
    }
}
