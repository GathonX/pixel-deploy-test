<?php

namespace App\Http\Controllers\API\StudioDomaine;

use App\Http\Controllers\Controller;
use App\Services\StudioDomaine\DynadotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DomainController extends Controller
{
    private DynadotService $dynadotService;

    public function __construct(DynadotService $dynadotService)
    {
        $this->dynadotService = $dynadotService;
    }

    /**
     * Vérifier la disponibilité d'un domaine unique
     *
     * POST /api/studio-domaine/domain/check
     */
    public function check(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'domain' => 'required|string|min:3|max:253',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $domain = $this->sanitizeDomain($request->input('domain'));

        $result = $this->dynadotService->checkAvailability($domain);

        return response()->json($result);
    }

    /**
     * Vérifier la disponibilité sur plusieurs extensions
     *
     * POST /api/studio-domaine/domain/search
     */
    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'min:1', 'max:63', 'regex:/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/'],
            'extensions' => 'nullable|array|max:20',
            'extensions.*' => ['string', 'regex:/^\.[a-z]{2,10}$/'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $baseName = strtolower(trim($request->input('name')));
        $extensions = $request->input('extensions', ['.fr', '.com', '.net', '.org', '.io', '.co']);

        $result = $this->dynadotService->checkMultipleAvailability($baseName, $extensions);

        // Appliquer la marge revendeur par catégorie (système 3 niveaux)
        if ($result['success'] && !empty($result['results'])) {
            $result['results'] = array_map(function ($item) {
                if (isset($item['price']) && is_numeric($item['price']) && (float) $item['price'] > 0) {
                    $pricing = $this->calculateClientPrice((float) $item['price']);
                    $item['price']          = $pricing['price_annual'];    // montant réel payé
                    $item['price_monthly']  = $pricing['price_monthly'];   // affiché au client
                    $item['price_category'] = $pricing['category'];        // ultra / popular / premium
                }
                return $item;
            }, $result['results']);
        }

        return response()->json($result);
    }

    /**
     * Obtenir les informations WHOIS d'un domaine
     *
     * GET /api/studio-domaine/domain/whois/{domain}
     */
    public function whois(string $domain): JsonResponse
    {
        $domain = $this->sanitizeDomain($domain);

        if (strlen($domain) < 3) {
            return response()->json([
                'success' => false,
                'error' => 'Domaine invalide',
            ], 422);
        }

        $result = $this->dynadotService->getWhois($domain);

        return response()->json($result);
    }

    /**
     * Obtenir les prix des TLDs
     *
     * GET /api/studio-domaine/domain/pricing
     */
    public function pricing(): JsonResponse
    {
        $result = $this->dynadotService->getTldPricing();

        return response()->json($result);
    }

    /**
     * Calcul du prix client selon le système 3 catégories (DOMAIN.md)
     *
     * Catégorie     | Prix revendeur | Marge  | Plancher
     * Ultra-bas     | 0 – 5 €        | +100%  | 1.49 €/mois
     * Populaire     | 6 – 20 €       | +88%   | 1.49 €/mois
     * Premium       | 21 € +         | +60%   | 3.50 €/mois
     *
     * Le prix annuel facturé = price_monthly × 12
     */
    private function calculateClientPrice(float $dynadotPrice): array
    {
        if ($dynadotPrice <= 5) {
            $multiplier   = 2.00;
            $floorMonthly = 1.49;
            $category     = 'ultra';
        } elseif ($dynadotPrice <= 20) {
            $multiplier   = 1.88;
            $floorMonthly = 1.49;
            $category     = 'popular';
        } else {
            $multiplier   = 1.60;
            $floorMonthly = 3.50;
            $category     = 'premium';
        }

        $annualRaw   = $dynadotPrice * $multiplier;
        $monthlyRaw  = $annualRaw / 12;
        $monthly     = max(round($monthlyRaw, 2), $floorMonthly);
        $annual      = round($monthly * 12, 2);

        return [
            'price_monthly' => $monthly,
            'price_annual'  => $annual,
            'category'      => $category,
        ];
    }

    /**
     * Nettoyer et valider le nom de domaine
     */
    private function sanitizeDomain(string $domain): string
    {
        // Retirer http://, https://, www.
        $domain = preg_replace('/^(https?:\/\/)?(www\.)?/', '', $domain);

        // Retirer tout ce qui suit le premier /
        $domain = explode('/', $domain)[0];

        // Lowercase et trim
        $domain = strtolower(trim($domain));

        return $domain;
    }
}
