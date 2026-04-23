<?php

namespace App\Services\StudioDomaine;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class DynadotService
{
    private string $apiKey;
    private string $baseUrl = 'https://api.dynadot.com/api3.json';

    /**
     * Prix statiques de secours (si l'API tld_price échoue).
     * Valeurs approximatives en EUR — jamais utilisées si tld_price répond.
     */
    private array $tldFallbackPrices = [
        '.fr'     => 6.28,
        '.com'    => 9.53,
        '.net'    => 10.97,
        '.org'    => 6.00,
        '.io'     => 25.31,
        '.co'     => 4.21,
        '.eu'     => 2.48,
        '.info'   => 2.63,
        '.biz'    => 5.83,
        '.shop'   => 0.88,
        '.store'  => 2.20,
        '.online' => 2.20,
        '.app'    => 8.76,
        '.dev'    => 8.76,
        '.tech'   => 5.82,
        '.site'   => 2.20,
    ];

    public function __construct()
    {
        $this->apiKey = config('services.dynadot.api_key');
    }

    /**
     * Construire une map TLD → prix depuis l'API tld_price de Dynadot.
     * Résultat mis en cache 1 heure.
     *
     * @return array<string, float>  Ex: ['.fr' => 6.28, '.com' => 9.53, ...]
     */
    public function getTldPriceMap(): array
    {
        return Cache::remember('dynadot_tld_price_map', 3600, function () {
            try {
                $response = Http::timeout(30)->get($this->baseUrl, [
                    'key'            => $this->apiKey,
                    'command'        => 'tld_price',
                    'currency'       => 'eur',
                ]);

                if (!$response->successful()) {
                    Log::error('Dynadot tld_price HTTP error', ['status' => $response->status()]);
                    return $this->tldFallbackPrices;
                }

                $data = $response->json();
                $tlds = $data['TldPriceResponse']['TldPrice'] ?? [];

                if (empty($tlds)) {
                    Log::warning('Dynadot tld_price: réponse vide', ['data' => $data]);
                    return $this->tldFallbackPrices;
                }

                $map = [];
                foreach ($tlds as $tld) {
                    $name  = '.' . ltrim($tld['Tld'] ?? '', '.');
                    $price = (float) ($tld['Price']['Register'] ?? 0);
                    if ($name !== '.' && $price > 0) {
                        $map[$name] = $price;
                    }
                }

                Log::info('Dynadot tld_price map construit', ['count' => count($map)]);

                return !empty($map) ? $map : $this->tldFallbackPrices;

            } catch (\Exception $e) {
                Log::error('Dynadot tld_price exception', ['error' => $e->getMessage()]);
                return $this->tldFallbackPrices;
            }
        });
    }

    /**
     * Vérifier la disponibilité d'un domaine.
     * Retourne uniquement la disponibilité (le prix est récupéré via getTldPriceMap).
     */
    public function checkAvailability(string $domain): array
    {
        try {
            $cacheKey = "dynadot_check_{$domain}";

            return Cache::remember($cacheKey, 300, function () use ($domain) {
                $response = Http::timeout(10)->get($this->baseUrl, [
                    'key'     => $this->apiKey,
                    'command' => 'search',
                    'domain0' => $domain,
                ]);

                if (!$response->successful()) {
                    Log::error('Dynadot API error', [
                        'domain' => $domain,
                        'status' => $response->status(),
                        'body'   => $response->body(),
                    ]);

                    return [
                        'success' => false,
                        'error'   => 'Erreur de connexion à l\'API Dynadot',
                    ];
                }

                return $this->parseSearchResponse($domain, $response->json());
            });
        } catch (\Exception $e) {
            Log::error('Dynadot service exception', [
                'domain' => $domain,
                'error'  => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error'   => 'Erreur lors de la vérification du domaine',
            ];
        }
    }

    /**
     * Vérifier la disponibilité sur plusieurs extensions, avec prix Dynadot réels.
     *
     * Flux : tld_price (1 appel, mis en cache 1h) + search par domaine (5 min de cache chacun)
     *        → DomainController applique ensuite la marge revendeur.
     */
    public function checkMultipleAvailability(string $baseName, array $extensions = ['.fr', '.com', '.net', '.org', '.io', '.co']): array
    {
        // Récupérer les prix Dynadot une seule fois pour tous les TLDs
        $priceMap = $this->getTldPriceMap();

        $results = [];

        foreach ($extensions as $ext) {
            $domain = $baseName . $ext;
            $check  = $this->checkAvailability($domain);

            // Chercher le prix dans la map Dynadot
            $dynadotPrice = $priceMap[$ext] ?? null;

            $results[] = [
                'domain'    => $domain,
                'extension' => $ext,
                'available' => $check['success'] && ($check['available'] ?? false),
                'price'     => $dynadotPrice,
                'currency'  => 'EUR',   // tld_price est toujours demandé en EUR
                'error'     => $check['error'] ?? null,
            ];
        }

        return [
            'success'  => true,
            'baseName' => $baseName,
            'results'  => $results,
        ];
    }

    /**
     * Parser la réponse search de Dynadot (disponibilité uniquement).
     */
    private function parseSearchResponse(string $domain, array $data): array
    {
        // Erreur globale : {"Response":{"ResponseCode":"-1","Error":"invalid key"}}
        if (isset($data['Response'])) {
            $response = $data['Response'];
            $code     = (int) ($response['ResponseCode'] ?? -1);

            if ($code !== 0) {
                $errorMsg = $response['Error'] ?? 'Erreur API Dynadot';

                Log::error('Dynadot API error response', [
                    'domain' => $domain,
                    'code'   => $code,
                    'error'  => $errorMsg,
                ]);

                return ['success' => false, 'error' => $errorMsg];
            }
        }

        // {"SearchResponse":{"ResponseCode":"0","SearchResults":[{"DomainName":"...","Available":"yes"}]}}
        if (isset($data['SearchResponse'])) {
            $response     = $data['SearchResponse'];
            $responseCode = (int) ($response['ResponseCode'] ?? -1);

            if ($responseCode !== 0) {
                return [
                    'success' => false,
                    'error'   => $response['Error'] ?? 'Erreur API Dynadot',
                ];
            }

            foreach ($response['SearchResults'] ?? [] as $result) {
                if (strtolower($result['DomainName'] ?? '') === strtolower($domain)) {
                    return [
                        'success'   => true,
                        'domain'    => $domain,
                        'available' => strtolower($result['Available'] ?? 'no') === 'yes',
                    ];
                }
            }
        }

        Log::warning('Dynadot unexpected response structure', [
            'domain' => $domain,
            'data'   => $data,
        ]);

        return ['success' => false, 'error' => 'Réponse inattendue de l\'API'];
    }

    /**
     * Obtenir les informations WHOIS d'un domaine.
     */
    public function getWhois(string $domain): array
    {
        try {
            $response = Http::timeout(10)->get($this->baseUrl, [
                'key'     => $this->apiKey,
                'command' => 'whois',
                'domain'  => $domain,
            ]);

            if (!$response->successful()) {
                return ['success' => false, 'error' => 'Erreur lors de la récupération WHOIS'];
            }

            return ['success' => true, 'data' => $response->json()];
        } catch (\Exception $e) {
            Log::error('Dynadot WHOIS error', ['domain' => $domain, 'error' => $e->getMessage()]);

            return ['success' => false, 'error' => 'Erreur WHOIS'];
        }
    }

    /**
     * Obtenir tous les prix TLD Dynadot (endpoint public pour l'admin).
     */
    public function getTldPricing(): array
    {
        try {
            $priceMap = $this->getTldPriceMap();

            return [
                'success'  => true,
                'currency' => 'EUR',
                'data'     => $priceMap,
            ];
        } catch (\Exception $e) {
            Log::error('Dynadot TLD pricing error', ['error' => $e->getMessage()]);

            return ['success' => false, 'error' => 'Erreur prix TLD'];
        }
    }
}
