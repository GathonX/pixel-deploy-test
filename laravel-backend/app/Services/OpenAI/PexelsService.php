<?php

namespace App\Services\OpenAI;

use App\Services\OpenAI\OpenAIService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * ✅ Service Pexels optimisé pour images cohérentes et fixes
 * Évite les images aléatoires, garantit la cohérence avec le contenu
 */
class PexelsService
{
    private const LOG_PREFIX = "📸 [PexelsService]";

    private const API_BASE_URL = 'https://api.pexels.com/v1';
    private const CACHE_TTL = 7200; // 2 heures - plus long pour stabilité
    private const MAX_RETRIES = 3;

    protected string $apiKey;
    protected array $rateLimits;
    protected int $requestCount = 0;

    public function __construct()
    {
        $this->apiKey = env('PEXELS_API_KEY', 'disabled');
        $this->rateLimits = [
            'requests_per_hour' => 200,
            'requests_per_month' => 20000,
        ];

        if (empty($this->apiKey) || $this->apiKey === 'disabled') {
            Log::warning(self::LOG_PREFIX . " Clé API Pexels désactivée - Mode fallback activé");
        }
    }

    /**
     * ✅ CORRIGÉ : Recherche d'images COHÉRENTES et FIXES
     */
    public function searchCoherentImages(
        string $description,
        int $count = 1,
        array $options = []
    ): array {
        Log::info(self::LOG_PREFIX . " Recherche d'images cohérentes", [
            'description_length' => strlen($description),
            'count' => $count,
            'options' => $options,
        ]);

        // Si pas de clé API, retourner échec immédiatement
        if (empty($this->apiKey) || $this->apiKey === 'disabled') {
            Log::info(self::LOG_PREFIX . " API désactivée, retour échec pour fallback");
            return [
                'success' => false,
                'photos' => [],
                'message' => 'Pexels API disabled',
                'images' => [] // Compatibilité
            ];
        }

        try {
            // Générer mots-clés FRANÇAIS optimisés
            $keywords = $this->generateFrenchOptimizedKeywords($description);

            if (empty($keywords)) {
                Log::warning(self::LOG_PREFIX . " Échec génération mots-clés");
                return $this->getFailureResponse();
            }

            // ✅ OPTIMISATION : 1 seule recherche avec meilleur keyword + per_page augmenté
            $bestKeyword = $keywords[0]; // Premier = meilleur score
            $perPage = min(30, $count * 10); // 30 photos max pour diversité

            Log::info(self::LOG_PREFIX . " Recherche optimisée (1 appel)", [
                'best_keyword' => $bestKeyword,
                'per_page' => $perPage
            ]);

            try {
                $searchOptions = array_merge($options, ['per_page' => $perPage]);
                $searchResult = $this->performSingleSearch($bestKeyword, $perPage, $searchOptions);

                $allImages = $searchResult['photos'] ?? [];
                $successfulSearches = !empty($allImages) ? 1 : 0;

            } catch (\Exception $e) {
                Log::warning(self::LOG_PREFIX . " Échec recherche optimisée", [
                    'keyword' => $bestKeyword,
                    'error' => $e->getMessage(),
                ]);
                $allImages = [];
                $successfulSearches = 0;
            }

            $selectedImages = $this->selectCoherentFixedImages($allImages, $description, $count);

            Log::info(self::LOG_PREFIX . " Recherche cohérente terminée", [
                'keywords_tried' => count($keywords),
                'successful_searches' => $successfulSearches,
                'total_images_found' => count($allImages),
                'selected_images' => count($selectedImages),
            ]);

            return [
                'success' => count($selectedImages) > 0,
                'photos' => $selectedImages,
                'images' => $selectedImages, // Compatibilité ImageContextService
                'total_results' => count($selectedImages),
                'keywords_used' => $keywords,
            ];

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur recherche cohérente", [
                'error' => $e->getMessage(),
                'description_length' => strlen($description),
            ]);

            return $this->getFailureResponse();
        }
    }

    /**
     * ✅ CORRIGÉ : Générer mots-clés UNIQUES par plateforme et contexte
     */
    private function generateFrenchOptimizedKeywords(string $description, array $options = []): array
    {
        $platform = $options['platform'] ?? 'default';
        $uniqueId = $options['unique_id'] ?? uniqid();
        
        Log::info(self::LOG_PREFIX . " Génération mots-clés UNIQUES", [
            'description_length' => strlen($description),
            'platform' => $platform,
            'unique_id' => $uniqueId
        ]);

        try {
            $messages = [
                [
                    'role' => 'system',
                    'content' => 'Tu es un expert en recherche d\'images professionnelles. Tu génères des mots-clés EN ANGLAIS UNIQUES pour trouver des images de stock DIFFÉRENTES sur Pexels selon le contexte et la plateforme.'
                ],
                [
                    'role' => 'user',
                    'content' => $this->buildPlatformSpecificKeywordPrompt($description, $platform, $uniqueId)
                ],
            ];

            $response = OpenAIService::generateChatCompletion(
                $messages,
                'gpt-3.5-turbo',
                200,
                0.8 // Plus de créativité pour diversité
            );

            $content = $response['choices'][0]['message']['content'] ?? '';
            $keywords = $this->parseKeywordsFromAI($content);

            if (count($keywords) >= 3) {
                Log::info(self::LOG_PREFIX . " Mots-clés uniques générés", [
                    'platform' => $platform,
                    'keywords_count' => count($keywords),
                    'keywords' => $keywords,
                    'unique_id' => $uniqueId
                ]);
                return $keywords;
            }

            // Fallback si IA échoue
            throw new \Exception("Insufficient unique keywords generated");

        } catch (\Exception $e) {
            Log::warning(self::LOG_PREFIX . " IA échouée, fallback vers mots-clés manuels", [
                'error' => $e->getMessage(),
                'platform' => $platform
            ]);

            // Fallback : générer mots-clés manuels simples
            return $this->generateManualKeywords($description);
        }
    }

    /**
     * ✅ NOUVEAU : Prompt optimisé pour mots-clés cohérents
     */
    private function buildOptimizedKeywordPrompt(string $description): string
    {
        return <<<PROMPT
Génère 6 mots-clés EN ANGLAIS pour trouver des images professionnelles cohérentes avec ce contenu français :

{$description}

Critères STRICTS :
- ANGLAIS uniquement (requis par Pexels)
- 1-2 mots maximum par mot-clé
- Concepts visuels professionnels
- Éviter termes trop spécifiques
- Privilégier : business, professional, office, team, corporate, modern, workplace, collaboration

Format JSON uniquement :
{
  "keywords": ["business meeting", "corporate office", "professional team", "modern workplace", "executive discussion", "office collaboration"]
}
PROMPT;
    }

    /**
     * ✅ NOUVEAU : Construire prompt spécifique à la plateforme
     */
    private function buildPlatformSpecificKeywordPrompt(string $description, string $platform, string $uniqueId): string
    {
        $platformContext = match($platform) {
            'instagram' => 'Instagram (images visuelles, lifestyle, inspiration)',
            'linkedin' => 'LinkedIn (business, professionnel, corporate)',
            'facebook' => 'Facebook (communauté, social, engageant)', 
            'twitter' => 'Twitter/X (actualité, tendance, discussion)',
            default => 'Général (polyvalent, adaptable)'
        };

        return "Contexte : {$description}
Plateforme : {$platformContext}
ID unique : {$uniqueId}

EXIGENCE CRITIQUE : Génère des mots-clés EN ANGLAIS DIFFÉRENTS et UNIQUES pour cet ID.

Règles :
1. 6 mots-clés maximum
2. Anglais uniquement
3. Mots-clés professionnels cohérents
4. Adaptés à la plateforme {$platform}
5. ABSOLUMENT DIFFÉRENTS pour chaque ID unique

Description français : {$description}

Retourne UNIQUEMENT le JSON :
{\"keywords\": [\"keyword1\", \"keyword2\", \"keyword3\"]}";
    }

    /**
     * ✅ NOUVEAU : Parser mots-clés depuis réponse IA
     */
    private function parseKeywordsFromAI(string $content): array
    {
        $content = trim($content);
        $content = preg_replace('/```json\s*/', '', $content);
        $content = preg_replace('/```\s*$/', '', $content);

        try {
            $data = json_decode($content, true);

            if (json_last_error() === JSON_ERROR_NONE && isset($data['keywords'])) {
                return array_filter($data['keywords'], function($keyword) {
                    return is_string($keyword) && strlen(trim($keyword)) > 0;
                });
            }

        } catch (\Exception $e) {
            Log::warning(self::LOG_PREFIX . " Erreur parsing JSON IA");
        }

        // Fallback : extraction manuelle
        preg_match_all('/"([^"]+)"/', $content, $matches);
        return !empty($matches[1]) ? array_slice($matches[1], 0, 6) : [];
    }

    /**
     * ✅ MASSIVELY ENRICHED: Keywords copiés depuis ImageContextService.php extractMainEntities()
     */
    private function generateManualKeywords(string $description): array
    {
        $description = strtolower($description);

        // Food - 70+ keywords
        if (preg_match('/food|nourriture|cuisine|gastronomie|culinaire|cooking|restaurant|café|bar|bistro|brasserie|pizzeria|chef|cuisinier|pâtissier|boulanger|sommelier|recette|recipe|plat|menu|carte|spécialité|ingrédients|produits|frais|local|terroir|bio|viande|poisson|fruits de mer|seafood|sushi|sashimi|légumes|vegetables|fruits|salad|soupe|entrée|dessert|pâtisserie|gâteau|tarte|cookie|chocolat|vin|wine|bière|beer|cocktail|boisson|drink|breakfast|petit déjeuner|brunch|lunch|déjeuner|dinner|dîner|street food|fast food|food truck|livraison|delivery|végétarien|vegan|végétalien|sans gluten|gluten free|épices|herbes|aromates|condiments|sauce|boulang|viennoiserie|croissant|pain|traiteur|alimentation/', $description)) {
            return ['fresh bread bakery', 'artisan baker', 'pastry shop', 'bakery store', 'bread making', 'french bakery'];
        }

        // Travel - 100+ keywords including Madagascar
        if (preg_match('/voyage|tourisme|vacances|séjour|escapade|weekend|circuit|destination|île|plage|mer|océan|côte|littoral|baie|madagascar|nosy be|sainte marie|antananarivo|tananarive|antsirabe|tuléar|toliara|diego suarez|antsiranana|majunga|mahajanga|fort dauphin|taolagnaro|morondava|avenue des baobabs|ifaty|anakao|hotel|hôtel|resort|lodge|bungalow|villa|hébergement|restaurant|gastronomie|cuisine locale|spécialités|plats typiques|plongée|snorkeling|surf|kitesurf|kayak|bateau|croisière|excursion|randonnée|trekking|aventure|exploration|safari|parc national|réserve naturelle|faune|flore|biodiversité|lémurien|lémuriens|baobab|baobabs|caméléon|tortue|baleine|coucher de soleil|lever de soleil|panorama|paysage|nature|tropical|exotique|paradisiaque|authentique|préservé|sauvage|culture malgache|traditions|artisanat|vannerie|sculpture|musique malgache|danse traditionnelle|festival|célébration|vanille|épices|rhum|cacao|café|fruits tropicaux|lagon|récif corallien|corail|poissons tropicaux|raie manta|forêt tropicale|jungle|cascade|rivière|lac|montagne|tour|agence de voyage|avion|camping|transport/', $description)) {
            return ['tropical beach paradise', 'travel destination', 'vacation resort', 'tourism adventure', 'beach sunset', 'exotic travel'];
        }

        // Health - 80+ keywords
        if (preg_match('/santé|health|wellness|bien-être|forme|vitalité|médecine|médical|docteur|médecin|infirmier|hôpital|clinique|fitness|sport|exercice|entraînement|musculation|cardio|yoga|méditation|relaxation|mindfulness|pleine conscience|nutrition|alimentation|régime|diet|healthy food|superfoods|vitamines|protéines|glucides|lipides|macro|micro-nutriments|perte de poids|minceur|détox|jeûne|fasting|sommeil|repos|récupération|fatigue|insomnie|stress|anxiété|dépression|santé mentale|psychologie|thérapie|coaching|développement personnel|confiance en soi|massage|spa|soins|beauté|cosmétique|skincare|pharmacie|médicaments|traitement|vaccin|prévention|dentaire|optique|audition|physiothérapie|ostéopathie|maladie|symptômes|diagnostic|guérison|rémission|gym|kinésithérapeute|dentiste|soin/', $description)) {
            return ['fitness training gym', 'healthy lifestyle', 'yoga wellness', 'medical health', 'sport exercise', 'wellness spa'];
        }

        // Education - 60+ keywords
        if (preg_match('/éducation|formation|apprentissage|learning|enseignement|école|université|collège|lycée|académie|institut|cours|leçon|tutorat|coaching|mentorat|mentoring|e-learning|formation en ligne|mooc|webinaire|classe virtuelle|diplôme|certification|qualification|compétences|skills|étudiant|professeur|enseignant|formateur|instructeur|pédagogie|méthode|programme|curriculum|syllabus|examen|test|évaluation|note|résultats|performance|recherche|étude|analyse|mémoire|thèse|doctorat|bourse|scholarship|aide financière|prêt étudiant|langues|language|anglais|français|espagnol|chinois|mathématiques|sciences|histoire|géographie|littérature|stage|tutoriel/', $description)) {
            return ['education learning students', 'training classroom', 'university campus', 'online course', 'teacher student', 'academic study'];
        }

        // Tech - 100+ keywords
        if (preg_match('/intelligence artificielle|ia|machine learning|deep learning|neural network|blockchain|cryptocurrency|bitcoin|ethereum|nft|web3|metaverse|cloud computing|aws|azure|google cloud|saas|paas|iaas|applications|logiciels|plateformes|systèmes|données|big data|cybersécurité|sécurité informatique|hacking|firewall|encryption|programmation|développement|code|software|hardware|api|framework|mobile|application mobile|ios|android|react native|flutter|robotique|automation|iot|internet of things|5g|6g|réalité virtuelle|vr|réalité augmentée|ar|mixed reality|quantum computing|edge computing|serverless|microservices|devops|technologie|digital|informatique|logiciel|application|web|innovation|startup tech|cloud|data/', $description)) {
            return ['technology workspace', 'digital innovation', 'coding programming', 'tech startup', 'software development', 'modern technology'];
        }

        // Marketing - 70+ keywords
        if (preg_match('/marketing|campagne|publicité|promotion|communication|audience|engagement|conversion|leads|prospects|clients potentiels|réseaux sociaux|social media|facebook|instagram|twitter|linkedin|tiktok|contenu|content marketing|storytelling|copywriting|rédaction|seo|référencement|google|search engine|keywords|backlinks|sem|sea|google ads|facebook ads|publicité en ligne|branding|marque|identité visuelle|logo|charte graphique|influence|influenceur|ambassadeur|partenariat influenceur|email marketing|newsletter|automation marketing|crm|marketing automation|analytics|données|metrics|tracking|pixel|tag manager|funnel|tunnel de conversion|landing page|call to action|cta|communauté|community management|modération|engagement communauté|viralité|buzz|tendance|hashtag|trending|content|digital marketing/', $description)) {
            return ['digital marketing', 'advertising campaign', 'social media', 'brand strategy', 'marketing team', 'creative agency'];
        }

        // Finance - 80+ keywords
        if (preg_match('/stratégie|croissance|revenus|chiffre affaires|bénéfices|profits|clients|marché|concurrence|compétitivité|part de marché|investissement|financement|budget|performance|roi|kpi|startup|entreprise|pme|corporation|scale-up|licorne|unicorn|e-commerce|commerce électronique|marketplace|boutique en ligne|fintech|healthtech|edtech|proptech|insurtech|regtech|levée de fonds|venture capital|business angel|incubateur|accélérateur|business model|business plan|pitch|valuation|exit strategy|management|leadership|gouvernance|ressources humaines|recrutement|négociation|partenariat|collaboration|alliance stratégique|innovation|disruption|transformation digitale|pivot|scalabilité|rentabilité|marge|trésorerie|cash flow|burn rate|runway|comptabilité|audit|fiscalité|conformité|réglementation|finance|banque|économie|argent|épargne|bourse|crypto|assurance|crédit|prêt|conseiller financier|patrimoine/', $description)) {
            return ['financial business', 'banking finance', 'investment planning', 'money management', 'financial analysis', 'business finance'];
        }

        // Fashion - 40+ keywords
        if (preg_match('/mode|fashion|style|tendance|trend|look|vêtements|clothes|prêt-à-porter|haute couture|luxe|accessoires|sac|chaussures|bijoux|jewelry|montres|styliste|designer|créateur|collection|défilé|fashion week|shopping|boutique|magasin|e-shop|online shopping|vêtement|couture|textile|design de mode|maroquinerie|accessoire|chaussure/', $description)) {
            return ['fashion boutique', 'clothing store', 'fashion design', 'style trendy', 'fashion model', 'boutique shopping'];
        }

        // Real Estate - 40+ keywords
        if (preg_match('/immobilier|real estate|propriété|property|maison|appartement|villa|studio|loft|duplex|penthouse|résidence|achat|vente|location|investissement immobilier|architecture|construction|rénovation|travaux|aménagement|design intérieur|décoration|mobilier|furniture|meuble|jardin|terrasse|balcon|piscine|garage|agent immobilier|agence|promoteur|notaire|hypothèque|promotion immobilière/', $description)) {
            return ['real estate property', 'modern house', 'apartment building', 'home interior', 'architecture design', 'property investment'];
        }

        // Beauty - 30+ keywords
        if (preg_match('/beauté|beauty|cosmétique|maquillage|makeup|skincare|parfum|perfume|fragrance|cosmetics|soins|coiffure|hair|coiffeur|salon|barbier|barber|ongles|nails|manucure|pédicure|nail art|esthétique|spa|soin de la peau/', $description)) {
            return ['beauty salon', 'cosmetic skincare', 'spa wellness', 'makeup beauty', 'hair salon', 'beauty treatment'];
        }

        // Automotive - 50+ keywords
        if (preg_match('/automobile|voiture|car|véhicule|auto|moto|motorcycle|électrique|electric|hybrid|hybride|tesla|ev|conduite|driving|permis|license|route|road|garage|atelier|mécanique|réparation|entretien|maintenance|transport|mobilité|déplacement|logistics|livraison|avion|airplane|aéroport|vol|flight|aviation|train|railway|métro|subway|bus|tramway|concessionnaire|pièce|moteur/', $description)) {
            return ['car automobile', 'vehicle transport', 'auto mechanic', 'garage repair', 'modern car', 'automotive industry'];
        }

        // Art - 80+ keywords
        if (preg_match('/art|arts|culture|culturel|artistique|création|peinture|sculpture|dessin|illustration|gravure|photographie|photo|photographe|image|cliché|musique|musicien|compositeur|chanteur|concert|festival|danse|ballet|chorégraphie|spectacle|performance|théâtre|comédie|drame|pièce|acteur|scène|cinéma|film|movie|réalisateur|production|tournage|littérature|livre|roman|poésie|écrivain|auteur|musée|galerie|exposition|vernissage|collection|design|décoration|intérieur|aménagement|artisanat|craft|handmade|fait main|création artisanale|patrimoine|monument|histoire|tradition|héritage|artiste|œuvre|graphisme/', $description)) {
            return ['art creative', 'artist painting', 'design studio', 'creative workspace', 'art gallery', 'artistic creation'];
        }

        // Nature - 70+ keywords
        if (preg_match('/nature|environnement|écologie|biodiversité|écosystème|développement durable|sustainability|green|vert|bio|écologique|forêt|jungle|savane|désert|montagne|vallée|canyon|océan|mer|lac|rivière|fleuve|cascade|chute eau|faune|animaux|mammifères|oiseaux|reptiles|insectes|papillons|flore|plantes|fleurs|arbres|végétation|jardin botanique|conservation|protection|préservation|espèces menacées|endangered|climat|changement climatique|réchauffement|météo|saisons|énergie renouvelable|solaire|éolien|hydraulique|géothermie|recyclage|compost|zéro déchet|économie circulaire|upcycling|agriculture|permaculture|agroécologie|biologique|organique/', $description)) {
            return ['nature landscape', 'environmental conservation', 'green ecology', 'natural forest', 'ocean marine', 'wildlife nature'];
        }

        // Sports - 60+ keywords
        if (preg_match('/sport|sports|athlète|sportif|compétition|championnat|football|soccer|basketball|tennis|volleyball|rugby|natation|swimming|cyclisme|vélo|running|course|marathon|fitness|gym|musculation|bodybuilding|crossfit|hiit|yoga|pilates|stretching|souplesse|flexibilité|entraînement|workout|training|coach|personal trainer|performance|endurance|force|vitesse|agilité|nutrition sportive|protéines|supplements|récupération|équipement|matériel|vêtements sport|chaussures sport|stade|terrain|piscine|salle de sport|club/', $description)) {
            return ['sports competition', 'athletic training', 'fitness workout', 'sports performance', 'team sports', 'professional athlete'];
        }

        // Family - 30+ keywords
        if (preg_match('/famille|family|parents|enfants|children|kids|bébé|baby|nouveau-né|newborn|grossesse|pregnancy|parentalité|parenting|éducation enfants|puériculture|jouets|toys|jeux|games|activités enfants|école maternelle|crèche|garderie|nursery|daycare|anniversaire|birthday|fête|party|célébration|vêtements enfants|baby clothes|poussette/', $description)) {
            return ['happy family', 'children playing', 'family time', 'parenting love', 'baby care', 'family activities'];
        }

        // Home Tech - 20+ keywords
        if (preg_match('/domotique|smart home|maison connectée|home automation|iot|connected devices|alexa|google home|assistant vocal|sécurité|caméra|alarme|surveillance|security|électroménager|appliances|cuisine équipée|high-tech/', $description)) {
            return ['smart home technology', 'home automation', 'connected house', 'smart devices', 'modern home', 'home security'];
        }

        // Entertainment - 30+ keywords
        if (preg_match('/divertissement|entertainment|loisirs|hobbies|passion|gaming|jeux vidéo|video games|console|pc gaming|esport|streaming|netflix|youtube|twitch|podcast|lecture|reading|livre audio|audiobook|ebook|collection|collectionneur|hobby|bricolage|diy|jardinage|gardening|plantes|potager|permaculture|photographie amateur|drone|gopro|vidéo|vlog/', $description)) {
            return ['entertainment fun', 'hobby passion', 'gaming esport', 'leisure activity', 'video games', 'creative hobby'];
        }

        return ['professional business', 'modern workspace', 'team collaboration', 'business office', 'corporate meeting', 'professional team'];
    }

    /**
     * ✅ NOUVEAU : Effectuer recherche unique avec cache
     */
    private function performSingleSearch(string $keyword, int $count, array $options): array
    {
        $cacheKey = "pexels_" . md5($keyword . serialize($options));

        // Vérifier cache pour stabilité
        if (!($options['bypass_cache'] ?? false)) {
            $cached = Cache::get($cacheKey);
            if ($cached) {
                Log::info(self::LOG_PREFIX . " Résultat en cache utilisé");
                return $cached;
            }
        }

        $this->checkRateLimits();

        $params = [
            'query' => $keyword,
            'per_page' => min($count * 3, 20), // Plus d'images pour choix
            'page' => 1,
            'orientation' => $options['orientation'] ?? 'landscape'
        ];

        $response = Http::withHeaders([
            'Authorization' => $this->apiKey,
            'User-Agent' => 'PixelRise-App/1.0',
        ])->timeout(15)->get(self::API_BASE_URL . '/search', $params);

        if ($response->successful()) {
            $result = $response->json();

            Log::info(self::LOG_PREFIX . " Recherche réussie", [
                'query' => $keyword,
                'results_count' => count($result['photos'] ?? []),
            ]);

            // Cache pour stabilité
            Cache::put($cacheKey, $result, self::CACHE_TTL);
            return $result;
        }

        throw new \Exception("Pexels API error: " . $response->status());
    }

    /**
     * ✅ NOUVEAU : Sélectionner images FIXES et cohérentes
     */
    private function selectCoherentFixedImages(array $allImages, string $description, int $targetCount): array
    {
        if (empty($allImages)) {
            return [];
        }

        Log::info(self::LOG_PREFIX . " Sélection des meilleures images", [
            'total_images' => count($allImages),
            'target_count' => $targetCount,
        ]);

        // Supprimer doublons
        $uniqueImages = $this->removeDuplicateImages($allImages);

        // Scorer images selon cohérence
        $scoredImages = [];
        foreach ($uniqueImages as $image) {
            $score = $this->calculateCoherenceScore($image, $description);
            $scoredImages[] = [
                'image' => $image,
                'score' => $score,
            ];
        }

        // Trier par score décroissant
        usort($scoredImages, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        // Sélectionner avec diversité
        $selectedImages = [];
        $usedPhotographers = [];

        foreach ($scoredImages as $scored) {
            if (count($selectedImages) >= $targetCount) {
                break;
            }

            $image = $scored['image'];
            $photographer = $image['photographer'] ?? '';

            // Éviter même photographe pour diversité
            if (!in_array($photographer, $usedPhotographers) || count($selectedImages) < $targetCount / 2) {
                $selectedImages[] = $image;
                if (!empty($photographer)) {
                    $usedPhotographers[] = $photographer;
                }
            }
        }

        Log::info(self::LOG_PREFIX . " Images sélectionnées", [
            'selected_count' => count($selectedImages),
            'from_total' => count($uniqueImages),
        ]);

        return $selectedImages;
    }

    /**
     * ✅ NOUVEAU : Supprimer doublons d'images
     */
    private function removeDuplicateImages(array $images): array
    {
        $unique = [];
        $seenIds = [];

        foreach ($images as $image) {
            $id = $image['id'] ?? uniqid();
            if (!in_array($id, $seenIds)) {
                $unique[] = $image;
                $seenIds[] = $id;
            }
        }

        return $unique;
    }

    /**
     * ✅ NOUVEAU : Calculer score de cohérence avec contenu
     */
    private function calculateCoherenceScore(array $image, string $description): float
    {
        $score = 0.0;

        // Score qualité image
        $width = $image['width'] ?? 0;
        $height = $image['height'] ?? 0;

        if ($width >= 1920 && $height >= 1080) {
            $score += 3.0; // Haute résolution
        } elseif ($width >= 1200 && $height >= 800) {
            $score += 2.0; // Résolution correcte
        } else {
            $score += 1.0; // Résolution acceptable
        }

        // Score cohérence alt text
        $alt = strtolower($image['alt'] ?? '');
        $businessTerms = ['business', 'professional', 'office', 'team', 'corporate', 'meeting', 'work'];

        foreach ($businessTerms as $term) {
            if (strpos($alt, $term) !== false) {
                $score += 1.0;
            }
        }

        // Score ratio d'image
        if ($width > 0) {
            $ratio = $height / $width;
            if ($ratio >= 0.5 && $ratio <= 0.8) {
                $score += 1.0; // Bon ratio
            }
        }

        // Bonus photographe actif
        if (!empty($image['photographer'])) {
            $score += 0.5;
        }

        return $score;
    }

    /**
     * ✅ PRESERVED : Méthodes statiques pour compatibilité
     */
    public static function searchNatureImages(string $query = 'business', int $perPage = 1): array
    {
        $instance = new self();
        return $instance->searchCoherentImages($query, $perPage, [
            'orientation' => 'landscape'
        ]);
    }

    public static function imageQueryGenerator(string $description, int $count = 3): array
    {
        $instance = new self();
        $result = $instance->searchCoherentImages($description, $count);

        return [
            'success' => $result['success'],
            'images' => $result['photos'] ?? [],
            'keywords_used' => $result['keywords_used'] ?? []
        ];
    }

    /**
     * ✅ NOUVEAU : Vérifier limites de taux
     */
    private function checkRateLimits(): void
    {
        $this->requestCount++;

        if ($this->requestCount % 10 === 0) {
            Log::info(self::LOG_PREFIX . " Statistiques d'utilisation", [
                'requests_this_session' => $this->requestCount,
                'hourly_limit' => $this->rateLimits['requests_per_hour'],
            ]);
        }

        // Pause préventive
        if ($this->requestCount > 20) {
            usleep(200000); // 0.2 seconde
        }
    }

    /**
     * ✅ NOUVEAU : Réponse d'échec standardisée
     */
    private function getFailureResponse(): array
    {
        return [
            'success' => false,
            'photos' => [],
            'images' => [],
            'total_results' => 0,
            'message' => 'Pexels search failed'
        ];
    }

    /**
     * ✅ NOUVEAU : Recherche optimisée pour réseaux sociaux
     */
    public static function searchSocialMediaImages(
        string $description,
        string $platform = 'instagram',
        int $count = 1
    ): array {
        $instance = new self();

        $platformOptions = [
            'instagram' => ['orientation' => 'square'],
            'facebook' => ['orientation' => 'landscape'],
            'twitter' => ['orientation' => 'landscape'],
            'linkedin' => ['orientation' => 'landscape'],
        ];

        $options = $platformOptions[$platform] ?? $platformOptions['instagram'];

        return $instance->searchCoherentImages($description, $count, $options);
    }

    /**
     * ✅ ULTRA ENRICHED: Images par catégorie avec 50+ domaines spécialisés
     */
    public static function getImagesByCategory(string $category, int $count = 3): array
    {
        $categoryQueries = [
            // Core 18 domaines
            'food' => 'fresh bread bakery artisan pastry restaurant cuisine chef cooking',
            'travel' => 'tropical beach paradise resort vacation tourism exotic adventure',
            'health' => 'fitness training wellness medical health yoga spa doctor',
            'education' => 'education learning students university training classroom teaching',
            'tech' => 'technology computer innovation digital coding startup software',
            'marketing' => 'digital marketing advertising social media campaign branding',
            'finance' => 'financial business banking investment money management accounting',
            'fashion' => 'fashion boutique clothing store designer style trendy',
            'real_estate' => 'real estate property modern house architecture home',
            'beauty' => 'beauty salon cosmetic spa makeup hair skincare',
            'automotive' => 'car automobile vehicle transport garage mechanic',
            'art' => 'art creative painting design studio gallery artistic',
            'nature' => 'nature landscape forest ocean wildlife environment ecology',
            'sports' => 'sports competition athletic training fitness workout gym',
            'family' => 'happy family children parenting activities kids baby',
            'business' => 'business professional office meeting workspace corporate',
            'home_tech' => 'smart home automation connected technology iot devices',
            'entertainment' => 'entertainment gaming hobby leisure activity fun',

            // Food spécialisés
            'bakery' => 'fresh bread bakery artisan baker croissant pastry',
            'restaurant' => 'restaurant dining chef cuisine gourmet fine dining',
            'cafe' => 'coffee cafe espresso barista cozy coffee shop',
            'patisserie' => 'pastry dessert cake chocolate sweet patisserie',
            'wine' => 'wine vineyard winery tasting sommelier cellar',
            'beer' => 'beer brewery craft beer pub tasting hops',
            'seafood' => 'seafood fish ocean fresh market restaurant',
            'vegan' => 'vegan plant based healthy vegetables organic food',
            'street_food' => 'street food market food truck urban dining',

            // Travel spécialisés
            'beach' => 'tropical beach paradise sand ocean sunset palm',
            'mountain' => 'mountain peak hiking nature landscape alpine adventure',
            'hotel' => 'luxury hotel resort accommodation modern lobby room',
            'adventure' => 'adventure outdoor hiking camping exploration nature',
            'safari' => 'safari wildlife africa animals jeep adventure',
            'cruise' => 'cruise ship ocean voyage travel luxury',
            'backpacking' => 'backpacking travel adventure hostel budget journey',
            'resort' => 'luxury resort pool tropical vacation paradise',

            // Health & Wellness spécialisés
            'yoga' => 'yoga meditation wellness peace mindfulness practice',
            'gym' => 'gym fitness training workout equipment exercise',
            'nutrition' => 'nutrition healthy food vegetables diet wellness',
            'mental_health' => 'mental health wellness therapy meditation mindfulness',
            'medical' => 'medical doctor hospital clinic healthcare professional',
            'pharmacy' => 'pharmacy medication healthcare drugstore prescription',
            'dental' => 'dental dentist clinic teeth healthcare smile',

            // Tech spécialisés
            'ai' => 'artificial intelligence AI robot technology neural network',
            'blockchain' => 'blockchain cryptocurrency bitcoin technology digital',
            'cloud' => 'cloud computing server data center technology infrastructure',
            'mobile' => 'mobile app smartphone technology ios android',
            'cybersecurity' => 'cybersecurity hacker security technology protection',
            'data_science' => 'data science analytics dashboard visualization big data',
            'robotics' => 'robotics robot automation technology manufacturing',
            'vr_ar' => 'virtual reality VR AR headset technology immersive',

            // Business spécialisés
            'startup' => 'startup entrepreneurship innovation business team office',
            'coworking' => 'coworking space modern office collaborative workspace',
            'consulting' => 'consulting business strategy meeting professional',
            'ecommerce' => 'ecommerce online shopping delivery marketplace business',
            'retail' => 'retail store shopping customer service business',
            'logistics' => 'logistics warehouse shipping delivery transport',

            // Creative spécialisés
            'photography' => 'photography camera photographer studio creative art',
            'design' => 'graphic design creative studio workspace digital art',
            'music' => 'music musician concert studio instrument performance',
            'cinema' => 'cinema film movie production camera director',
            'theater' => 'theater stage performance drama acting show',
            'dance' => 'dance ballet contemporary performance choreography',

            // Lifestyle spécialisés
            'wedding' => 'wedding marriage celebration ceremony couple love',
            'pet' => 'pet dog cat animal care veterinary love',
            'garden' => 'garden plants gardening nature green outdoor',
            'home_decor' => 'home decor interior design furniture modern style',
            'crafts' => 'crafts handmade diy creative artisan hobby',
        ];

        $query = $categoryQueries[$category] ?? $categoryQueries['business'];

        return self::searchNatureImages($query, $count);
    }
}
