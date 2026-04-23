<?php

namespace App\Services\ContentGeneration;

use App\Services\OpenAI\PexelsService;
use App\Services\OpenAI\OpenAIService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class ImageContextService
{
    private PexelsService $pexelsService;
    private OpenAIService $openAIService;

    public function __construct(PexelsService $pexelsService, OpenAIService $openAIService)
    {
        $this->pexelsService = $pexelsService;
        $this->openAIService = $openAIService;
    }

    /**
     * ✅ CORRIGÉ : Générer image exactement adaptée au contexte du texte
     */
    public function generateCoherentImage(string $domain, string $content, array $options = []): array
    {
        try {
            $contentHash = md5($content . microtime(true));
            $uniqueSeed = $options['unique_seed'] ?? $contentHash . '_' . uniqid();
            $dayContext = $options['day_context'] ?? 'general';

            Log::info("🖼️ Génération image exactement adaptée au contenu", [
                'domain' => $domain,
                'content_length' => strlen($content),
                'content_hash' => substr($contentHash, 0, 8),
                'unique_seed' => substr($uniqueSeed, 0, 20),
                'day_context' => $dayContext
            ]);

            // ✅ OPTIMISATION : Utiliser keywords pré-générés par OpenAI si disponibles
            $contextualKeywords = $options['image_keywords'] ?? [];

            // Fallback: analyser contenu si pas de keywords
            if (empty($contextualKeywords)) {
                $contextualKeywords = $this->extractDeepContentKeywords($content, $domain, $dayContext);
            }

            if (empty($contextualKeywords)) {
                return $this->getContextualFallbackImage($domain, $content, $uniqueSeed);
            }

            // 2. ✅ AMÉLIORATION : Recherche multi-étapes pour meilleure correspondance
            $searchResult = $this->searchWithDeepContextMatching($contextualKeywords, $uniqueSeed, $content);

            if ($searchResult['success'] && !empty($searchResult['image_url'])) {
                // ✅ VALIDATION : Vérifier que l'image n'a pas déjà été utilisée récemment
                $contextKey = $options['post_type'] ?? 'general';
                if (!$this->hasImageBeenUsedRecently($searchResult['image_url'], $contextKey)) {
                    $this->markImageAsUsed($searchResult['image_url'], $contextKey);
                    
                    return [
                        'success' => true,
                        'image_url' => $searchResult['image_url'],
                        'keywords_used' => $contextualKeywords,
                        'source' => 'pexels_contextual',
                        'content_relevance' => $searchResult['relevance_score'] ?? 0,
                        'variation_seed' => $uniqueSeed
                    ];
                } else {
                    Log::warning("⚠️ Image déjà utilisée récemment, recherche alternative", [
                        'duplicate_url' => $searchResult['image_url']
                    ]);
                }
            }

            // 3. ✅ AMÉLIORATION : Fallback contextuel intelligent (pas générique)
            return $this->getContextualFallbackImage($domain, $content, $uniqueSeed);

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération image contextuelle", [
                'domain' => $domain,
                'error' => $e->getMessage(),
                'content_preview' => substr($content, 0, 100)
            ]);

            return $this->getContextualFallbackImage($domain, $content, $options['unique_seed'] ?? uniqid());
        }
    }

    /**
     * ✅ CORRIGÉ : Recherche contextuelle multi-étapes avec scoring de pertinence
     */
    private function searchWithDeepContextMatching(array $keywords, string $uniqueSeed, string $originalContent): array
    {
        try {
            Log::info("🔍 Recherche contextuelle multi-étapes", [
                'keywords_count' => count($keywords),
                'keywords' => $keywords,
                'content_sample' => substr($originalContent, 0, 100)
            ]);

            // 1. ✅ Créer variations de recherche sophistiquées
            $searchVariations = $this->createContextualSearchVariations($keywords, $originalContent);

            $bestResult = null;
            $bestScore = 0;

            foreach ($searchVariations as $index => $searchData) {
                $searchQuery = $searchData['query'];
                $expectedRelevance = $searchData['relevance_weight'];

                Log::info("🎯 Recherche #{$index}", [
                    'query' => $searchQuery,
                    'expected_relevance' => $expectedRelevance
                ]);

                $searchResult = $this->pexelsService->searchCoherentImages(
                    $searchQuery,
                    5, // Plus d'options pour meilleur choix
                    ['orientation' => 'landscape', 'per_page' => 5]
                );

                if ($searchResult['success'] && !empty($searchResult['images'])) {
                    // 2. ✅ Scorer chaque image selon le contexte
                    $scoredImages = $this->scoreImagesForContext($searchResult['images'], $originalContent, $keywords);
                    
                    if (!empty($scoredImages) && $scoredImages[0]['score'] > $bestScore) {
                        $bestResult = [
                            'success' => true,
                            'image_url' => $scoredImages[0]['image']['src']['large'],
                            'keywords_used' => $keywords,
                            'relevance_score' => $scoredImages[0]['score'],
                            'search_query' => $searchQuery
                        ];
                        $bestScore = $scoredImages[0]['score'];
                    }
                }

                // Pause pour éviter rate limiting
                usleep(300000); // 0.3 seconde
                
                // Si on a un excellent match, pas besoin de continuer
                if ($bestScore >= 8) {
                    break;
                }
            }

            if ($bestResult) {
                Log::info("✅ Meilleure image contextuelle trouvée", [
                    'final_score' => $bestScore,
                    'search_query' => $bestResult['search_query'],
                    'image_url' => substr($bestResult['image_url'], 0, 50) . '...'
                ]);
                return $bestResult;
            }

            return ['success' => false, 'reason' => 'Aucune image avec score suffisant trouvée'];

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur recherche contextuelle multi-étapes", [
                'error' => $e->getMessage(),
                'keywords' => $keywords
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * ✅ NOUVEAU : Créer variations de mots-clés selon seed
     */
    private function createKeywordVariations(array $baseKeywords, string $seed): array
    {
        $variations = [];
        $hashNumber = hexdec(substr(md5($seed), 0, 8));

        // Variation 1: Ordre original
        $variations[] = $baseKeywords;

        // Variation 2: Mélange selon seed
        $shuffled = $baseKeywords;
        srand($hashNumber);
        shuffle($shuffled);
        $variations[] = $shuffled;

        // Variation 3: Combinaison avec mots-clés alternatifs
        $alternative = $this->getAlternativeKeywords($baseKeywords[0] ?? 'business');
        $combined = array_merge(array_slice($baseKeywords, 0, 2), array_slice($alternative, 0, 1));
        $variations[] = $combined;

        return $variations;
    }

    /**
     * ✅ NOUVEAU : Sélectionner image selon seed pour éviter duplication
     */
    private function selectImageBySeed(array $images, string $seed): int
    {
        $hashNumber = hexdec(substr(md5($seed), 0, 8));
        return $hashNumber % count($images);
    }

    /**
     * ✅ NOUVEAU : Créer variations de recherche contextuelle
     */
    private function createContextualSearchVariations(array $keywords, string $content): array
    {
        $variations = [];
        $contentSample = strtolower(strip_tags(substr($content, 0, 200)));

        // 1. Requête principale avec keywords les plus forts
        $variations[] = [
            'query' => implode(' ', array_slice($keywords, 0, 3)),
            'relevance_weight' => 10
        ];

        // 2. Combinaison avec termes business génériques
        $businessTerms = ['professional', 'business', 'corporate', 'modern'];
        $variations[] = [
            'query' => $keywords[0] . ' ' . $businessTerms[array_rand($businessTerms)],
            'relevance_weight' => 8
        ];

        // 3. Focus sur action/concept principal
        if (count($keywords) >= 2) {
            $variations[] = [
                'query' => $keywords[0] . ' ' . $keywords[1] . ' concept',
                'relevance_weight' => 9
            ];
        }

        // 4. Variation avec contexte émotionnel
        $emotionalContext = ['success', 'growth', 'innovation', 'achievement'];
        $variations[] = [
            'query' => $keywords[0] . ' ' . $emotionalContext[array_rand($emotionalContext)],
            'relevance_weight' => 7
        ];

        return $variations;
    }

    /**
     * ✅ NOUVEAU : Scorer images selon pertinence contextuelle
     */
    private function scoreImagesForContext(array $images, string $content, array $keywords): array
    {
        $scoredImages = [];
        $contentWords = str_word_count(strtolower($content), 1);

        foreach ($images as $image) {
            $score = 0;
            $description = strtolower($image['alt'] ?? '');
            $tags = explode(' ', strtolower(str_replace(['-', '_'], ' ', $image['url'] ?? '')));

            // Score basé sur correspondance avec keywords
            foreach ($keywords as $keyword) {
                $keywordWords = explode(' ', strtolower($keyword));
                foreach ($keywordWords as $word) {
                    if (strlen($word) > 3) {
                        if (strpos($description, $word) !== false) $score += 3;
                        if (in_array($word, $tags)) $score += 2;
                        if (in_array($word, $contentWords)) $score += 1;
                    }
                }
            }

            // Bonus pour taille et qualité
            $width = $image['width'] ?? 0;
            $height = $image['height'] ?? 0;
            if ($width >= 1200 && $height >= 600) $score += 1;

            $scoredImages[] = [
                'image' => $image,
                'score' => $score,
                'description' => $description
            ];
        }

        // Trier par score décroissant
        usort($scoredImages, function($a, $b) {
            return $b['score'] <=> $a['score'];
        });

        return $scoredImages;
    }

    /**
     * ✅ MASSIVELY IMPROVED: Vérifier si une image a été utilisée récemment - CACHE 30 JOURS + 5000 IMAGES
     */
    private function hasImageBeenUsedRecently(string $imageUrl, string $context = 'general'): bool
    {
        // 🚀 AMÉLIORATION MASSIVE: Cache mensuel au lieu de quotidien pour des millions d'utilisateurs
        $currentMonth = date('Y-m');
        $cacheKey = 'used_images_' . $currentMonth;
        $usedImages = Cache::get($cacheKey, []);

        // Vérification simple pour la compatibilité
        if (in_array($imageUrl, $usedImages)) {
            return true;
        }

        // Vérification avancée avec contexte - Cache mensuel par contexte
        $contextKey = 'used_images_context_' . $context . '_' . $currentMonth;
        $contextImages = Cache::get($contextKey, []);

        return in_array($imageUrl, $contextImages);
    }

    /**
     * ✅ MASSIVELY IMPROVED: Marquer une image comme utilisée - CACHE 30 JOURS + 5000 IMAGES
     */
    private function markImageAsUsed(string $imageUrl, string $context = 'general'): void
    {
        // 🚀 AMÉLIORATION MASSIVE pour des millions d'utilisateurs
        $currentMonth = date('Y-m');

        // Cache global mensuel - 5000 images au lieu de 50 !
        $cacheKey = 'used_images_' . $currentMonth;
        $usedImages = Cache::get($cacheKey, []);
        $usedImages[] = $imageUrl;

        // 🔥 AUGMENTATION MASSIVE: 5000 images au lieu de 50
        // Pour des millions d'utilisateurs, on garde beaucoup plus d'images en mémoire
        $usedImages = array_slice($usedImages, -5000);

        // 🔥 DURÉE ÉTENDUE: 30 jours au lieu de 7 jours
        Cache::put($cacheKey, array_unique($usedImages), now()->addDays(30));

        // Cache par contexte pour éviter doublons - 2000 images par contexte
        $contextKey = 'used_images_context_' . $context . '_' . $currentMonth;
        $contextImages = Cache::get($contextKey, []);
        $contextImages[] = $imageUrl;

        // 🔥 AUGMENTATION: 2000 images par contexte au lieu de 20
        $contextImages = array_slice($contextImages, -2000);
        Cache::put($contextKey, array_unique($contextImages), now()->addDays(30));

        Log::info("📌 Image marquée comme utilisée (cache massif pour millions d'utilisateurs)", [
            'image_url' => substr($imageUrl, 0, 50) . '...',
            'context' => $context,
            'total_used_this_month' => count($usedImages),
            'context_used_this_month' => count($contextImages),
            'cache_capacity_global' => '5000 images',
            'cache_capacity_context' => '2000 images',
            'cache_duration' => '30 days'
        ]);
    }

    /**
     * ✅ CORRIGÉ RADICALEMENT : Image de fallback contextuelle avec anti-doublon FORCÉ
     */
    public function getContextualFallbackImage(string $domain, string $content, string $uniqueSeed): array
    {
        Log::warning("🚨 FALLBACK : Utilisation de recherche Pexels directe au lieu d'image aléatoire", [
            'domain' => $domain,
            'content_preview' => substr($content, 0, 100)
        ]);

        // ✅ CORRECTION MAJEURE : Utiliser Pexels avec mots-clés génériques du domaine au lieu d'images aléaoires
        $domainKeywords = [
            'tech' => ['technology innovation', 'digital workspace', 'computer programming', 'software development', 'coding developer', 'tech startup office', 'silicon valley workspace'],
            'programming' => ['programming code', 'coding developer', 'software engineer workspace', 'laptop coding screen', 'github vscode', 'developer desk setup'],
            'ai' => ['artificial intelligence robot', 'machine learning technology', 'neural network visualization', 'ai technology future', 'deep learning data science'],
            'blockchain' => ['blockchain cryptocurrency', 'bitcoin ethereum trading', 'crypto mining technology', 'digital currency nft', 'web3 decentralized network'],
            'business' => ['business meeting professional', 'office team collaboration', 'corporate strategy planning', 'conference room discussion', 'handshake deal partnership'],
            'startup' => ['startup entrepreneurship innovation', 'co-working space modern', 'pitch deck presentation', 'venture capital meeting', 'founders brainstorming whiteboard'],
            'finance' => ['finance investment banking', 'stock market trading', 'financial charts analysis', 'money calculator planning', 'financial dashboard technology'],
            'marketing' => ['marketing advertising campaign', 'promotion brand strategy', 'creative marketing team', 'billboard advertisement', 'marketing analytics dashboard'],
            'travel' => ['travel tourism destination', 'vacation adventure journey', 'world travel backpacker', 'suitcase airport departure', 'travel blogger adventure'],
            'madagascar' => ['madagascar island tropical', 'baobab avenue sunset', 'lemur wildlife nature', 'nosy be beach paradise', 'madagascar exotic landscape'],
            'beach' => ['tropical beach paradise', 'ocean waves sunset', 'sandy beach palm trees', 'turquoise water lagoon', 'beach vacation resort'],
            'island' => ['tropical island paradise', 'exotic island resort', 'island vacation getaway', 'remote island landscape', 'caribbean island beach'],
            'ocean' => ['ocean sea blue water', 'deep sea waves', 'ocean sunset view', 'underwater coral reef', 'marine life dolphins'],
            'hotel' => ['luxury hotel resort', 'hotel room modern', 'resort pool paradise', 'boutique hotel lobby', 'beach resort accommodation'],
            'nature' => ['nature landscape scenic', 'wilderness natural beauty', 'outdoor nature trail', 'pristine nature forest', 'wild nature mountains'],
            'forest' => ['tropical forest jungle', 'woodland trees path', 'rainforest canopy', 'green forest landscape', 'forest nature trail'],
            'wildlife' => ['wildlife animals nature', 'safari wild animals', 'endangered species conservation', 'wildlife photography habitat', 'animal kingdom nature'],
            'health' => ['health wellness lifestyle', 'medical care hospital', 'healthy lifestyle fitness', 'healthcare checkup', 'wellness center spa'],
            'fitness' => ['fitness gym workout', 'exercise training muscles', 'gym equipment fitness', 'fitness class group', 'muscle training bodybuilding'],
            'yoga' => ['yoga meditation wellness', 'yoga pose practice', 'mindfulness yoga mat', 'yoga studio class', 'yoga sunset beach'],
            'nutrition' => ['nutrition healthy food', 'balanced diet meal', 'organic food vegetables', 'superfood healthy eating', 'nutrition facts label'],
            'education' => ['education learning school', 'study knowledge university', 'classroom learning teaching', 'academic education campus', 'educational books library'],
            'art' => ['art artistic creative', 'modern art gallery', 'painting sculpture artwork', 'art studio creative', 'artistic expression canvas'],
            'music' => ['music musician concert', 'musical instrument performance', 'music festival live', 'music studio production', 'band performance stage'],
            'food' => ['food cooking culinary', 'delicious gourmet meal', 'restaurant dining chef', 'food photography plate', 'culinary art presentation'],
            'restaurant' => ['restaurant fine dining', 'chef cooking kitchen', 'restaurant interior ambiance', 'dining experience table', 'food service professional'],
            'sports' => ['sports athletic competition', 'sports training fitness', 'professional sports event', 'sports equipment field', 'athletic performance stadium'],
            'fashion' => ['fashion style model', 'clothing fashion design', 'fashion show runway', 'trendy fashion outfit', 'fashion photography editorial'],
            'beauty' => ['beauty cosmetics makeup', 'skincare beauty care', 'beauty products salon', 'beauty treatment spa', 'natural beauty portrait'],
            'design' => ['graphic design creative', 'designer workspace studio', 'ui design interface', 'interior design modern', 'design thinking process'],
            'coffee' => ['coffee shop cafe', 'espresso coffee cup', 'barista latte art', 'coffee beans brewing', 'cafe culture lifestyle'],
            'real_estate' => ['real estate property', 'luxury home modern', 'apartment house residential', 'property investment market', 'modern architecture building'],
            'photography' => ['photography camera professional', 'photographer studio shoot', 'landscape photography nature', 'portrait photography creative', 'photography equipment lens'],
            'gaming' => ['gaming video games', 'esports gamer setup', 'game console pc', 'gaming tournament competition', 'gaming technology culture'],
            'default' => ['professional business meeting', 'modern office workspace', 'team collaboration corporate', 'business strategy planning']
        ];

        $keywords = $domainKeywords[$domain] ?? $domainKeywords['default'];
        $selectedKeyword = $keywords[array_rand($keywords)];

        // ✅ RECHERCHE CONTEXTUELLE via Pexels au lieu d'image aléatoire
        try {
            $pexelsResult = $this->pexelsService->searchCoherentImages($selectedKeyword, 5);
            
            if ($pexelsResult['success'] && !empty($pexelsResult['photos'])) {
                $photos = $pexelsResult['photos'];
                
                // ✅ SOLUTION RADICALE : Forcer une image unique en essayant plusieurs photos
                $contextKey = 'fallback_' . $domain;
                $maxAttempts = min(count($photos), 10); // Max 10 tentatives
                
                for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
                    $randomPhoto = $photos[array_rand($photos)];
                    $imageUrl = $randomPhoto['src']['large'] ?? $randomPhoto['src']['original'];
                    
                    if (!$this->hasImageBeenUsedRecently($imageUrl, $contextKey)) {
                        $this->markImageAsUsed($imageUrl, $contextKey);
                        
                        Log::info("✅ FALLBACK : Image unique trouvée", [
                            'keyword' => $selectedKeyword,
                            'domain' => $domain,
                            'attempt' => $attempt + 1,
                            'image_url' => substr($imageUrl, 0, 50) . '...'
                        ]);
                        
                        return [
                            'success' => true,
                            'image_url' => $imageUrl,
                            'keywords_used' => [$selectedKeyword],
                            'source' => 'pexels_fallback_unique',
                            'domain' => $domain,
                            'attempts_needed' => $attempt + 1
                        ];
                    }
                }
                
                // ✅ ESSAYER AVEC UN KEYWORD ALTERNATIF
                foreach ($keywords as $alternativeKeyword) {
                    if ($alternativeKeyword === $selectedKeyword) continue; // Skip le keyword déjà essayé
                    
                    try {
                        Log::info("🔄 FALLBACK : Essai avec keyword alternatif", [
                            'alternative_keyword' => $alternativeKeyword,
                            'domain' => $domain
                        ]);
                        
                        $altResult = $this->pexelsService->searchCoherentImages($alternativeKeyword, 5);
                        
                        if ($altResult['success'] && !empty($altResult['photos'])) {
                            $altPhotos = $altResult['photos'];
                            
                            for ($attempt = 0; $attempt < min(count($altPhotos), 5); $attempt++) {
                                $randomPhoto = $altPhotos[array_rand($altPhotos)];
                                $imageUrl = $randomPhoto['src']['large'] ?? $randomPhoto['src']['original'];
                                
                                if (!$this->hasImageBeenUsedRecently($imageUrl, $contextKey)) {
                                    $this->markImageAsUsed($imageUrl, $contextKey);
                                    
                                    Log::info("✅ FALLBACK : Image unique trouvée avec keyword alternatif", [
                                        'keyword' => $alternativeKeyword,
                                        'domain' => $domain,
                                        'image_url' => substr($imageUrl, 0, 50) . '...'
                                    ]);
                                    
                                    return [
                                        'success' => true,
                                        'image_url' => $imageUrl,
                                        'keywords_used' => [$alternativeKeyword],
                                        'source' => 'pexels_fallback_alternative',
                                        'domain' => $domain
                                    ];
                                }
                            }
                        }
                    } catch (\Exception $altE) {
                        Log::warning("⚠️ Erreur keyword alternatif", ['keyword' => $alternativeKeyword]);
                        continue; // Essayer le keyword suivant
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error("❌ Erreur recherche Pexels fallback", [
                'keyword' => $selectedKeyword,
                'error' => $e->getMessage()
            ]);
        }

        // 🚀 NOUVEAU DERNIER RECOURS : Utiliser Pexels avec keywords très génériques au lieu d'Unsplash fixes
        $genericKeyword = $keywords[0]; // Le mot-clé principal du domaine

        // Dernière tentative avec un keyword ultra-générique depuis Pexels
        try {
            Log::warning("⚠️ DERNIER RECOURS : Tentative avec keyword ultra-générique depuis Pexels", [
                'domain' => $domain,
                'generic_keyword' => $genericKeyword
            ]);

            $lastResortResult = $this->pexelsService->searchCoherentImages($genericKeyword, 10);

            if ($lastResortResult['success'] && !empty($lastResortResult['photos'])) {
                // Prendre une image aléatoire parmi les résultats
                $randomPhoto = $lastResortResult['photos'][array_rand($lastResortResult['photos'])];
                $imageUrl = $randomPhoto['src']['large'] ?? $randomPhoto['src']['original'];

                Log::info("✅ DERNIER RECOURS : Image trouvée depuis Pexels avec keyword générique", [
                    'keyword' => $genericKeyword,
                    'domain' => $domain,
                    'image_url' => substr($imageUrl, 0, 50) . '...'
                ]);

                return [
                    'success' => true,
                    'image_url' => $imageUrl,
                    'keywords_used' => [$genericKeyword],
                    'source' => 'pexels_last_resort_dynamic',
                    'domain' => $domain
                ];
            }
        } catch (\Exception $lastE) {
            Log::error("❌ Erreur dernier recours Pexels", [
                'error' => $lastE->getMessage(),
                'keyword' => $genericKeyword
            ]);
        }

        // 🔥 ABSOLUTE FALLBACK: Utiliser une image Pexels FIXE par domaine si TOUT a échoué
        // ⚠️ PAS DE PICSUM - Les URLs Picsum changent à chaque refresh !
        // On utilise des URLs Pexels FIXES par domaine comme dernier recours

        $fixedPexelsImages = [
            'madagascar' => 'https://images.pexels.com/photos/4666748/pexels-photo-4666748.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'travel' => 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'beach' => 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'nature' => 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'tech' => 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'business' => 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'health' => 'https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'food' => 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            'default' => 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
        ];

        $fallbackUrl = $fixedPexelsImages[$domain] ?? $fixedPexelsImages['default'];

        Log::warning("⚠️ ABSOLUTE FALLBACK : Utilisation d'une image Pexels FIXE par domaine", [
            'domain' => $domain,
            'fallback_url' => substr($fallbackUrl, 0, 80) . '...',
            'note' => 'Fixed Pexels image - will NOT change on refresh'
        ]);

        return [
            'success' => true,
            'image_url' => $fallbackUrl,
            'keywords_used' => [$genericKeyword],
            'source' => 'pexels_fixed_absolute_fallback',
            'domain' => $domain,
            'note' => 'Fixed Pexels image per domain - stable URL'
        ];
    }

    /**
     * ✅ AMÉLIORATION : Générer plusieurs images avec variations garanties différentes
     */
    public function generateMultipleImages(string $domain, string $content, int $count = 2, array $options = []): array
    {
        try {
            $uniqueSeed = $options['unique_seed'] ?? date('Y-m-d') . '_' . uniqid();

            Log::info("🖼️ Génération images multiples avec variations", [
                'domain' => $domain,
                'count' => $count,
                'unique_seed' => $uniqueSeed
            ]);

            $images = [];
            $keywords = $this->generateIntelligentKeywords($domain, $content, $options['day_context'] ?? 'general');

            if (empty($keywords)) {
                return $this->generateMultipleFallbackImages($domain, $count, $uniqueSeed);
            }

            // Générer variations de recherche garanties différentes
            $searchVariations = $this->createMultipleKeywordVariations($keywords, $count, $uniqueSeed);

            foreach ($searchVariations as $index => $searchTerms) {
                // Variation du seed pour chaque image
                $imageSeed = $uniqueSeed . '_img_' . $index;

                $searchResult = $this->pexelsService->searchCoherentImages(
                    implode(' ', $searchTerms),
                    3,
                    ['orientation' => 'square'] // Mieux pour social media
                );

                if ($searchResult['success'] && !empty($searchResult['images'])) {
                    $selectedIndex = $this->selectImageBySeed($searchResult['images'], $imageSeed);
                    $images[] = $searchResult['images'][$selectedIndex]['src']['large'];
                } else {
                    // Fallback pour cette image spécifique
                    $fallback = $this->getUniqueVariationImage($domain, $imageSeed);
                    if ($fallback['success']) {
                        $images[] = $fallback['image_url'];
                    }
                }

                // Éviter le rate limiting
                if (count($images) >= $count) {
                    break;
                }

                usleep(500000); // 0.5 seconde entre requêtes
            }

            // Compléter avec fallback si nécessaire
            while (count($images) < $count) {
                $fallbackSeed = $uniqueSeed . '_fallback_' . count($images);
                $fallback = $this->getUniqueVariationImage($domain, $fallbackSeed);
                if ($fallback['success']) {
                    $images[] = $fallback['image_url'];
                }
            }

            return [
                'success' => count($images) > 0,
                'images' => $images,
                'keywords_used' => $keywords,
                'variation_count' => count($images)
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération images multiples", [
                'domain' => $domain,
                'error' => $e->getMessage()
            ]);

            return $this->generateMultipleFallbackImages($domain, $count, $options['unique_seed'] ?? uniqid());
        }
    }

    /**
     * ✅ NOUVEAU : Générer variations multiples de mots-clés
     */
    private function createMultipleKeywordVariations(array $baseKeywords, int $count, string $seed): array
    {
        $variations = [];
        $hashBase = hexdec(substr(md5($seed), 0, 8));

        for ($i = 0; $i < $count; $i++) {
            $variation = [];
            $hash = $hashBase + $i * 1000; // Différencier chaque variation

            // Mélanger différemment pour chaque image
            $shuffled = $baseKeywords;
            srand($hash);
            shuffle($shuffled);

            // Prendre 2-3 mots principaux
            $variation = array_slice($shuffled, 0, min(3, count($shuffled)));

            // Ajouter mots-clés spécifiques selon l'index
            $specificKeywords = $this->getVariationSpecificKeywords($i);
            $variation = array_merge($variation, array_slice($specificKeywords, 0, 1));

            $variations[] = array_unique($variation);
        }

        return $variations;
    }

    /**
     * 🚀 MASSIVELY ENRICHED: Mots-clés spécifiques pour créer variations - 50+ SETS
     */
    private function getVariationSpecificKeywords(int $index): array
    {
        $variationSets = [
            // ========== Professional & Business (10 sets) ==========
            ['professional', 'modern', 'clean', 'corporate'],
            ['creative', 'innovative', 'dynamic', 'breakthrough'],
            ['elegant', 'sophisticated', 'premium', 'luxury'],
            ['vibrant', 'energetic', 'bold', 'powerful'],
            ['minimal', 'simple', 'focused', 'clarity'],
            ['strategic', 'executive', 'leadership', 'visionary'],
            ['collaborative', 'teamwork', 'synergy', 'united'],
            ['efficient', 'productive', 'optimized', 'streamlined'],
            ['innovative', 'disruptive', 'revolutionary', 'cutting-edge'],
            ['global', 'international', 'worldwide', 'expansion'],

            // ========== Nature & Environment (10 sets) ==========
            ['natural', 'organic', 'pristine', 'unspoiled'],
            ['scenic', 'breathtaking', 'stunning', 'spectacular'],
            ['peaceful', 'serene', 'tranquil', 'calm'],
            ['wild', 'untamed', 'raw', 'rugged'],
            ['lush', 'verdant', 'green', 'flourishing'],
            ['majestic', 'grand', 'magnificent', 'imposing'],
            ['tropical', 'exotic', 'paradise', 'idyllic'],
            ['coastal', 'maritime', 'seaside', 'oceanic'],
            ['mountain', 'alpine', 'highland', 'peak'],
            ['forest', 'woodland', 'jungle', 'rainforest'],

            // ========== Technology & Innovation (10 sets) ==========
            ['digital', 'tech', 'high-tech', 'advanced'],
            ['futuristic', 'next-gen', 'cutting-edge', 'revolutionary'],
            ['smart', 'intelligent', 'automated', 'AI-powered'],
            ['connected', 'networked', 'integrated', 'synchronized'],
            ['cloud-based', 'scalable', 'distributed', 'virtualized'],
            ['secure', 'encrypted', 'protected', 'safe'],
            ['fast', 'rapid', 'instant', 'real-time'],
            ['mobile', 'portable', 'wireless', 'on-the-go'],
            ['data-driven', 'analytics', 'insights', 'intelligent'],
            ['open-source', 'collaborative', 'community-driven', 'transparent'],

            // ========== Creative & Artistic (10 sets) ==========
            ['artistic', 'creative', 'expressive', 'imaginative'],
            ['colorful', 'vivid', 'bright', 'vibrant'],
            ['stylish', 'trendy', 'fashionable', 'chic'],
            ['unique', 'original', 'distinctive', 'one-of-a-kind'],
            ['inspiring', 'motivating', 'uplifting', 'empowering'],
            ['beautiful', 'aesthetic', 'stunning', 'gorgeous'],
            ['contemporary', 'modern', 'current', 'up-to-date'],
            ['vintage', 'retro', 'classic', 'timeless'],
            ['abstract', 'conceptual', 'symbolic', 'metaphorical'],
            ['handcrafted', 'artisan', 'bespoke', 'custom'],

            // ========== Health & Wellness (10 sets) ==========
            ['healthy', 'fit', 'active', 'energetic'],
            ['balanced', 'harmonious', 'centered', 'aligned'],
            ['refreshing', 'revitalizing', 'rejuvenating', 'renewing'],
            ['relaxing', 'soothing', 'calming', 'peaceful'],
            ['holistic', 'comprehensive', 'whole-body', 'integrated'],
            ['organic', 'natural', 'pure', 'clean'],
            ['mindful', 'conscious', 'aware', 'present'],
            ['therapeutic', 'healing', 'restorative', 'recovery'],
            ['preventive', 'proactive', 'protective', 'precautionary'],
            ['sustainable', 'long-term', 'lifestyle', 'habit-forming'],
        ];

        return $variationSets[$index % count($variationSets)];
    }

    /**
     * ✅ NOUVEAU : Fallback garanti pour images multiples
     */
    private function generateMultipleFallbackImages(string $domain, int $count, string $seed): array
    {
        $images = [];

        for ($i = 0; $i < $count; $i++) {
            $imageSeed = $seed . '_multi_' . $i;
            $fallback = $this->getUniqueVariationImage($domain, $imageSeed);

            if ($fallback['success']) {
                $images[] = $fallback['image_url'];
            }
        }

        return [
            'success' => count($images) > 0,
            'images' => $images,
            'source' => 'multiple_fallback'
        ];
    }

    /**
     * ✅ NOUVEAU : Analyse contextuelle approfondie du contenu pour images précises
     */
    private function extractDeepContentKeywords(string $content, string $domain, string $dayContext = 'general'): array
    {
        try {
            // ✅ Pas de cache pour garantir l'unicité
            Log::info("🔍 Analyse approfondie du contenu pour keywords précis", [
                'content_length' => strlen($content),
                'domain' => $domain
            ]);

            $contextualKeywords = [];

            // 1. ✅ Extraire entités principales du contenu (noms, concepts)
            $entities = $this->extractMainEntities($content);
            $contextualKeywords = array_merge($contextualKeywords, $entities);

            // 2. ✅ Extraire actions/verbes significatifs
            $actions = $this->extractSignificantActions($content);
            $contextualKeywords = array_merge($contextualKeywords, $actions);

            // 3. ✅ Extraire concepts métier spécifiques
            $businessConcepts = $this->extractBusinessConcepts($content, $domain);
            $contextualKeywords = array_merge($contextualKeywords, $businessConcepts);

            // 4. ✅ Adapter selon le domaine pour précision visuelle
            $visualKeywords = $this->adaptKeywordsForVisualSearch($contextualKeywords, $domain);

            // 5. ✅ Prioriser par pertinence et fréquence dans le contenu
            $prioritizedKeywords = $this->prioritizeKeywordsByRelevance($visualKeywords, $content);

            $finalKeywords = array_slice($prioritizedKeywords, 0, 6); // Plus de keywords pour meilleure précision

            Log::info("✅ Keywords contextuels extraits", [
                'entities_found' => count($entities),
                'actions_found' => count($actions),
                'business_concepts' => count($businessConcepts),
                'final_keywords' => $finalKeywords,
                'content_sample' => substr($content, 0, 150)
            ]);

            return $finalKeywords;

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur analyse contextuelle approfondie", [
                'error' => $e->getMessage(),
                'content_preview' => substr($content, 0, 100)
            ]);
            
            // Fallback intelligent basé sur le domaine
            return $this->getSmartDomainKeywords($domain);
        }
    }

    /**
     * 🚀 MASSIVELY ENRICHED: Mots-clés selon contexte quotidien + saisonnier + événementiel - 50+ CONTEXTS
     */
    private function getDayContextKeywords(string $dayContext): array
    {
        $dayKeywords = [
            // ========== Jours de la semaine (7 sets enrichis) ==========
            'monday' => ['planning strategy goals', 'weekly organization start', 'fresh beginning motivation', 'goal setting priorities', 'monday motivation startup'],
            'tuesday' => ['productivity efficiency work', 'focused execution tasks', 'performance optimization peak', 'tuesday grind hustle', 'workflow improvement'],
            'wednesday' => ['midweek progress development', 'milestone achievement halfway', 'improvement analysis review', 'wednesday momentum boost', 'progress tracking'],
            'thursday' => ['innovation creative solutions', 'brainstorming ideas breakthrough', 'technology advancement future', 'thursday innovation labs', 'creative thinking'],
            'friday' => ['success achievement results', 'weekly wins celebration', 'completion satisfaction done', 'friday celebration success', 'achievement unlocked'],
            'saturday' => ['weekend learning growth', 'personal development skills', 'reflection insights wisdom', 'saturday self-improvement', 'knowledge expansion'],
            'sunday' => ['preparation future vision', 'planning next-week strategy', 'rest recovery recharge', 'sunday planning mindset', 'vision boarding goals'],

            // ========== Saisons (4 sets enrichis) ==========
            'spring' => ['spring renewal growth', 'fresh start blossom', 'new beginning emergence', 'seasonal change nature', 'spring awakening bloom'],
            'summer' => ['summer sunshine energy', 'vibrant bright warm', 'vacation beach tropical', 'outdoor adventure active', 'summer vibes paradise'],
            'autumn' => ['autumn harvest change', 'fall colors transformation', 'transition preparation cozy', 'autumn leaves seasonal', 'harvest season abundance'],
            'winter' => ['winter frost clarity', 'reflection planning future', 'cold focus determination', 'winter strategy indoor', 'holiday season festive'],

            // ========== Mois de l'année (12 sets enrichis) ==========
            'january' => ['new year resolution', 'fresh start goals', 'planning strategy vision', 'january motivation beginning', 'new chapter opportunities'],
            'february' => ['love valentine heart', 'relationships connection care', 'february romance affection', 'passion dedication commitment', 'heart month celebration'],
            'march' => ['spring transition growth', 'march forward progress', 'momentum change evolution', 'international womens day', 'spring equinox renewal'],
            'april' => ['spring bloom flourish', 'april showers growth', 'renewal fresh energy', 'earth day nature', 'spring awakening vibrant'],
            'may' => ['may flowers blossom', 'growth expansion success', 'international workers day', 'mothers day celebration', 'spring peak bloom'],
            'june' => ['summer arrival sunshine', 'june vacation beach', 'fathers day celebration', 'world environment day', 'summer solstice light'],
            'july' => ['midsummer peak energy', 'july vacation tropical', 'independence celebration', 'summer holiday freedom', 'peak season sunshine'],
            'august' => ['august summer finale', 'vacation relaxation beach', 'preparation autumn planning', 'summer memories last', 'late summer warmth'],
            'september' => ['back to school learning', 'autumn transition change', 'september productivity focus', 'new academic year', 'fall season beginning'],
            'october' => ['october autumn colors', 'halloween celebration creative', 'fall harvest abundance', 'transformation change', 'autumn peak colors'],
            'november' => ['november gratitude thanks', 'thanksgiving appreciation', 'preparation planning winter', 'thankfulness reflection', 'autumn finale cozy'],
            'december' => ['december holiday festive', 'year end celebration', 'christmas new year', 'winter holiday magic', 'annual review reflection'],

            // ========== Moments de la journée (8 sets) ==========
            'morning' => ['morning sunrise fresh', 'early start energy', 'breakfast beginning new', 'morning routine motivation', 'dawn awakening bright'],
            'afternoon' => ['afternoon productive peak', 'midday energy focused', 'lunch break refresh', 'afternoon momentum work', 'daytime efficiency'],
            'evening' => ['evening sunset reflection', 'after work relaxation', 'dinner gathering social', 'evening wind-down calm', 'twilight peaceful'],
            'night' => ['night focus concentration', 'evening work late', 'nighttime creativity quiet', 'night owl productivity', 'darkness focus clarity'],
            'dawn' => ['dawn new beginning', 'sunrise golden hour', 'fresh start early', 'morning light awakening', 'daybreak opportunity'],
            'dusk' => ['dusk transition golden', 'sunset beautiful ending', 'twilight reflection calm', 'evening glow peaceful', 'day conclusion rest'],
            'noon' => ['noon peak energy', 'midday maximum light', 'lunch break social', 'noon productivity high', 'daytime bright'],
            'midnight' => ['midnight quiet focus', 'late night work', 'darkness concentration deep', 'midnight oil burning', 'night shift dedication'],

            // ========== Événements spéciaux (10 sets) ==========
            'launch' => ['product launch excitement', 'new release announcement', 'launch day celebration', 'big reveal unveiling', 'go live momentum'],
            'conference' => ['conference networking learning', 'professional event gathering', 'industry summit knowledge', 'conference insights speakers', 'networking opportunity'],
            'workshop' => ['workshop hands-on learning', 'training practical skills', 'workshop creative collaboration', 'interactive session', 'skill building hands-on'],
            'webinar' => ['webinar online learning', 'virtual presentation education', 'webinar digital knowledge', 'online session remote', 'digital education'],
            'deadline' => ['deadline urgency focus', 'time pressure delivery', 'deadline motivation driven', 'final push completion', 'deadline sprint focus'],
            'milestone' => ['milestone achievement success', 'major accomplishment celebration', 'milestone progress marker', 'key achievement unlocked', 'significant progress'],
            'kickoff' => ['project kickoff start', 'initiative launch beginning', 'kickoff meeting energy', 'start line momentum', 'kickoff enthusiasm'],
            'review' => ['performance review analysis', 'quarterly review insights', 'annual review reflection', 'progress review assessment', 'review evaluation metrics'],
            'celebration' => ['celebration success party', 'achievement recognition joy', 'celebration team win', 'victory celebration cheers', 'celebratory moment'],
            'training' => ['training development growth', 'skill training improvement', 'training session learning', 'professional development', 'training workshop education'],

            // Default
            'general' => ['professional modern business', 'quality excellence performance', 'success achievement growth', 'innovative creative dynamic']
        ];

        return $dayKeywords[$dayContext] ?? $dayKeywords['general'];
    }

    /**
     * ✅ MASSIVELY ENRICHED: Extraire entités principales du contenu - CENTAINES DE CATÉGORIES
     */
    private function extractMainEntities(string $content): array
    {
        $entities = [];
        $content = strtolower(strip_tags($content));

        // 🌍 MASSIVELY ENRICHED: Des CENTAINES de patterns pour TOUS les domaines possibles
        $entityPatterns = [
            // ========== TECHNOLOGIES (50+ termes) ==========
            'intelligence artificielle', 'ia', 'machine learning', 'deep learning', 'neural network',
            'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'nft', 'web3', 'metaverse',
            'cloud computing', 'aws', 'azure', 'google cloud', 'saas', 'paas', 'iaas',
            'applications', 'logiciels', 'plateformes', 'systèmes', 'données', 'big data',
            'cybersécurité', 'sécurité informatique', 'hacking', 'firewall', 'encryption',
            'programmation', 'développement', 'code', 'software', 'hardware', 'api', 'framework',
            'mobile', 'application mobile', 'ios', 'android', 'react native', 'flutter',
            'robotique', 'automation', 'iot', 'internet of things', '5g', '6g',
            'réalité virtuelle', 'vr', 'réalité augmentée', 'ar', 'mixed reality',
            'quantum computing', 'edge computing', 'serverless', 'microservices', 'devops',

            // ========== BUSINESS & FINANCE (60+ termes) ==========
            'stratégie', 'croissance', 'revenus', 'chiffre affaires', 'bénéfices', 'profits',
            'clients', 'marché', 'concurrence', 'compétitivité', 'part de marché',
            'investissement', 'financement', 'budget', 'performance', 'roi', 'kpi',
            'startup', 'entreprise', 'pme', 'corporation', 'scale-up', 'licorne', 'unicorn',
            'e-commerce', 'commerce électronique', 'marketplace', 'boutique en ligne',
            'fintech', 'healthtech', 'edtech', 'proptech', 'insurtech', 'regtech',
            'levée de fonds', 'venture capital', 'business angel', 'incubateur', 'accélérateur',
            'business model', 'business plan', 'pitch', 'valuation', 'exit strategy',
            'management', 'leadership', 'gouvernance', 'ressources humaines', 'recrutement',
            'négociation', 'partenariat', 'collaboration', 'alliance stratégique',
            'innovation', 'disruption', 'transformation digitale', 'pivot', 'scalabilité',
            'rentabilité', 'marge', 'trésorerie', 'cash flow', 'burn rate', 'runway',
            'comptabilité', 'audit', 'fiscalité', 'conformité', 'réglementation',

            // ========== MARKETING & COMMUNICATION (50+ termes) ==========
            'marketing', 'campagne', 'publicité', 'promotion', 'communication',
            'audience', 'engagement', 'conversion', 'leads', 'prospects', 'clients potentiels',
            'réseaux sociaux', 'social media', 'facebook', 'instagram', 'twitter', 'linkedin', 'tiktok',
            'contenu', 'content marketing', 'storytelling', 'copywriting', 'rédaction',
            'seo', 'référencement', 'google', 'search engine', 'keywords', 'backlinks',
            'sem', 'sea', 'google ads', 'facebook ads', 'publicité en ligne',
            'branding', 'marque', 'identité visuelle', 'logo', 'charte graphique',
            'influence', 'influenceur', 'ambassadeur', 'partenariat influenceur',
            'email marketing', 'newsletter', 'automation marketing', 'crm', 'marketing automation',
            'analytics', 'données', 'metrics', 'tracking', 'pixel', 'tag manager',
            'funnel', 'tunnel de conversion', 'landing page', 'call to action', 'cta',
            'communauté', 'community management', 'modération', 'engagement communauté',
            'viralité', 'buzz', 'tendance', 'hashtag', 'trending',

            // ========== VOYAGE & TOURISME (80+ termes) - NOUVELLE CATÉGORIE MASSIVE ==========
            'voyage', 'tourisme', 'vacances', 'séjour', 'escapade', 'weekend', 'circuit',
            'destination', 'île', 'plage', 'mer', 'océan', 'côte', 'littoral', 'baie',
            'madagascar', 'nosy be', 'sainte marie', 'antananarivo', 'tananarive', 'antsirabe',
            'tuléar', 'toliara', 'diego suarez', 'antsiranana', 'majunga', 'mahajanga',
            'fort dauphin', 'taolagnaro', 'morondava', 'avenue des baobabs', 'ifaty', 'anakao',
            'hotel', 'hôtel', 'resort', 'lodge', 'bungalow', 'villa', 'hébergement',
            'restaurant', 'gastronomie', 'cuisine locale', 'spécialités', 'plats typiques',
            'plongée', 'snorkeling', 'surf', 'kitesurf', 'kayak', 'bateau', 'croisière',
            'excursion', 'randonnée', 'trekking', 'aventure', 'exploration', 'safari',
            'parc national', 'réserve naturelle', 'faune', 'flore', 'biodiversité',
            'lémurien', 'lémuriens', 'baobab', 'baobabs', 'caméléon', 'tortue', 'baleine',
            'coucher de soleil', 'lever de soleil', 'panorama', 'paysage', 'nature',
            'tropical', 'exotique', 'paradisiaque', 'authentique', 'préservé', 'sauvage',
            'culture malgache', 'traditions', 'artisanat', 'vannerie', 'sculpture',
            'musique malgache', 'danse traditionnelle', 'festival', 'célébration',
            'vanille', 'épices', 'rhum', 'cacao', 'café', 'fruits tropicaux',
            'lagon', 'récif corallien', 'corail', 'poissons tropicaux', 'raie manta',
            'forêt tropicale', 'jungle', 'cascade', 'rivière', 'lac', 'montagne',

            // ========== NATURE & ENVIRONNEMENT (50+ termes) - NOUVELLE CATÉGORIE ==========
            'nature', 'environnement', 'écologie', 'biodiversité', 'écosystème',
            'développement durable', 'sustainability', 'green', 'vert', 'bio', 'écologique',
            'forêt', 'jungle', 'savane', 'désert', 'montagne', 'vallée', 'canyon',
            'océan', 'mer', 'lac', 'rivière', 'fleuve', 'cascade', 'chute eau',
            'faune', 'animaux', 'mammifères', 'oiseaux', 'reptiles', 'insectes', 'papillons',
            'flore', 'plantes', 'fleurs', 'arbres', 'végétation', 'jardin botanique',
            'conservation', 'protection', 'préservation', 'espèces menacées', 'endangered',
            'climat', 'changement climatique', 'réchauffement', 'météo', 'saisons',
            'énergie renouvelable', 'solaire', 'éolien', 'hydraulique', 'géothermie',
            'recyclage', 'compost', 'zéro déchet', 'économie circulaire', 'upcycling',
            'agriculture', 'permaculture', 'agroécologie', 'biologique', 'organique',

            // ========== SANTÉ & BIEN-ÊTRE (60+ termes) - NOUVELLE CATÉGORIE ==========
            'santé', 'health', 'wellness', 'bien-être', 'forme', 'vitalité',
            'médecine', 'médical', 'docteur', 'médecin', 'infirmier', 'hôpital', 'clinique',
            'fitness', 'sport', 'exercice', 'entraînement', 'musculation', 'cardio',
            'yoga', 'méditation', 'relaxation', 'mindfulness', 'pleine conscience',
            'nutrition', 'alimentation', 'régime', 'diet', 'healthy food', 'superfoods',
            'vitamines', 'protéines', 'glucides', 'lipides', 'macro', 'micro-nutriments',
            'perte de poids', 'minceur', 'détox', 'jeûne', 'fasting',
            'sommeil', 'repos', 'récupération', 'fatigue', 'insomnie',
            'stress', 'anxiété', 'dépression', 'santé mentale', 'psychologie',
            'thérapie', 'coaching', 'développement personnel', 'confiance en soi',
            'massage', 'spa', 'soins', 'beauté', 'cosmétique', 'skincare',
            'pharmacie', 'médicaments', 'traitement', 'vaccin', 'prévention',
            'dentaire', 'optique', 'audition', 'physiothérapie', 'ostéopathie',
            'maladie', 'symptômes', 'diagnostic', 'guérison', 'rémission',

            // ========== ÉDUCATION & FORMATION (40+ termes) - NOUVELLE CATÉGORIE ==========
            'éducation', 'formation', 'apprentissage', 'learning', 'enseignement',
            'école', 'université', 'collège', 'lycée', 'académie', 'institut',
            'cours', 'leçon', 'tutorat', 'coaching', 'mentorat', 'mentoring',
            'e-learning', 'formation en ligne', 'mooc', 'webinaire', 'classe virtuelle',
            'diplôme', 'certification', 'qualification', 'compétences', 'skills',
            'étudiant', 'professeur', 'enseignant', 'formateur', 'instructeur',
            'pédagogie', 'méthode', 'programme', 'curriculum', 'syllabus',
            'examen', 'test', 'évaluation', 'note', 'résultats', 'performance',
            'recherche', 'étude', 'analyse', 'mémoire', 'thèse', 'doctorat',
            'bourse', 'scholarship', 'aide financière', 'prêt étudiant',
            'langues', 'language', 'anglais', 'français', 'espagnol', 'chinois',
            'mathématiques', 'sciences', 'histoire', 'géographie', 'littérature',

            // ========== ARTS & CULTURE (50+ termes) - NOUVELLE CATÉGORIE ==========
            'art', 'arts', 'culture', 'culturel', 'artistique', 'création',
            'peinture', 'sculpture', 'dessin', 'illustration', 'gravure',
            'photographie', 'photo', 'photographe', 'image', 'cliché',
            'musique', 'musicien', 'compositeur', 'chanteur', 'concert', 'festival',
            'danse', 'ballet', 'chorégraphie', 'spectacle', 'performance',
            'théâtre', 'comédie', 'drame', 'pièce', 'acteur', 'scène',
            'cinéma', 'film', 'movie', 'réalisateur', 'production', 'tournage',
            'littérature', 'livre', 'roman', 'poésie', 'écrivain', 'auteur',
            'musée', 'galerie', 'exposition', 'vernissage', 'collection',
            'architecture', 'design', 'décoration', 'intérieur', 'aménagement',
            'mode', 'fashion', 'vêtements', 'styliste', 'défilé', 'collection',
            'artisanat', 'craft', 'handmade', 'fait main', 'création artisanale',
            'patrimoine', 'monument', 'histoire', 'tradition', 'héritage',

            // ========== FOOD & GASTRONOMIE (50+ termes) - NOUVELLE CATÉGORIE ==========
            'food', 'nourriture', 'cuisine', 'gastronomie', 'culinaire', 'cooking',
            'restaurant', 'café', 'bar', 'bistro', 'brasserie', 'pizzeria',
            'chef', 'cuisinier', 'pâtissier', 'boulanger', 'sommelier',
            'recette', 'recipe', 'plat', 'menu', 'carte', 'spécialité',
            'ingrédients', 'produits', 'frais', 'local', 'terroir', 'bio',
            'viande', 'poisson', 'fruits de mer', 'seafood', 'sushi', 'sashimi',
            'légumes', 'vegetables', 'fruits', 'salad', 'soupe', 'entrée',
            'dessert', 'pâtisserie', 'gâteau', 'tarte', 'cookie', 'chocolat',
            'vin', 'wine', 'bière', 'beer', 'cocktail', 'boisson', 'drink',
            'breakfast', 'petit déjeuner', 'brunch', 'lunch', 'déjeuner', 'dinner', 'dîner',
            'street food', 'fast food', 'food truck', 'livraison', 'delivery',
            'végétarien', 'vegan', 'végétalien', 'sans gluten', 'gluten free',
            'épices', 'herbes', 'aromates', 'condiments', 'sauce',

            // ========== SPORTS & FITNESS (40+ termes) - NOUVELLE CATÉGORIE ==========
            'sport', 'sports', 'athlète', 'sportif', 'compétition', 'championnat',
            'football', 'soccer', 'basketball', 'tennis', 'volleyball', 'rugby',
            'natation', 'swimming', 'cyclisme', 'vélo', 'running', 'course', 'marathon',
            'fitness', 'gym', 'musculation', 'bodybuilding', 'crossfit', 'hiit',
            'yoga', 'pilates', 'stretching', 'souplesse', 'flexibilité',
            'entraînement', 'workout', 'training', 'coach', 'personal trainer',
            'performance', 'endurance', 'force', 'vitesse', 'agilité',
            'nutrition sportive', 'protéines', 'supplements', 'récupération',
            'équipement', 'matériel', 'vêtements sport', 'chaussures sport',
            'stade', 'terrain', 'piscine', 'salle de sport', 'club',

            // ========== IMMOBILIER & HABITAT (30+ termes) - NOUVELLE CATÉGORIE ==========
            'immobilier', 'real estate', 'propriété', 'property', 'maison', 'appartement',
            'villa', 'studio', 'loft', 'duplex', 'penthouse', 'résidence',
            'achat', 'vente', 'location', 'investissement immobilier',
            'architecture', 'construction', 'rénovation', 'travaux', 'aménagement',
            'design intérieur', 'décoration', 'mobilier', 'furniture', 'meuble',
            'jardin', 'terrasse', 'balcon', 'piscine', 'garage',
            'agent immobilier', 'agence', 'promoteur', 'notaire', 'hypothèque',

            // ========== MODE & BEAUTÉ (40+ termes) - NOUVELLE CATÉGORIE ==========
            'mode', 'fashion', 'style', 'tendance', 'trend', 'look',
            'vêtements', 'clothes', 'prêt-à-porter', 'haute couture', 'luxe',
            'accessoires', 'sac', 'chaussures', 'bijoux', 'jewelry', 'montres',
            'beauté', 'beauty', 'cosmétique', 'maquillage', 'makeup', 'skincare',
            'parfum', 'perfume', 'fragrance', 'cosmetics', 'soins',
            'coiffure', 'hair', 'coiffeur', 'salon', 'barbier', 'barber',
            'ongles', 'nails', 'manucure', 'pédicure', 'nail art',
            'styliste', 'designer', 'créateur', 'collection', 'défilé', 'fashion week',
            'shopping', 'boutique', 'magasin', 'e-shop', 'online shopping',

            // ========== AUTOMOBILE & TRANSPORT (30+ termes) - NOUVELLE CATÉGORIE ==========
            'automobile', 'voiture', 'car', 'véhicule', 'auto', 'moto', 'motorcycle',
            'électrique', 'electric', 'hybrid', 'hybride', 'tesla', 'ev',
            'conduite', 'driving', 'permis', 'license', 'route', 'road',
            'garage', 'atelier', 'mécanique', 'réparation', 'entretien', 'maintenance',
            'transport', 'mobilité', 'déplacement', 'logistics', 'livraison',
            'avion', 'airplane', 'aéroport', 'vol', 'flight', 'aviation',
            'train', 'railway', 'métro', 'subway', 'bus', 'tramway',

            // ========== FAMILLE & ENFANTS (30+ termes) - NOUVELLE CATÉGORIE ==========
            'famille', 'family', 'parents', 'enfants', 'children', 'kids',
            'bébé', 'baby', 'nouveau-né', 'newborn', 'grossesse', 'pregnancy',
            'parentalité', 'parenting', 'éducation enfants', 'puériculture',
            'jouets', 'toys', 'jeux', 'games', 'activités enfants',
            'école maternelle', 'crèche', 'garderie', 'nursery', 'daycare',
            'anniversaire', 'birthday', 'fête', 'party', 'célébration',
            'vêtements enfants', 'baby clothes', 'puériculture', 'poussette',

            // ========== TECHNOLOGIE DOMESTIQUE (20+ termes) - NOUVELLE CATÉGORIE ==========
            'domotique', 'smart home', 'maison connectée', 'home automation',
            'iot', 'connected devices', 'alexa', 'google home', 'assistant vocal',
            'sécurité', 'caméra', 'alarme', 'surveillance', 'security',
            'électroménager', 'appliances', 'cuisine équipée', 'high-tech',

            // ========== DIVERTISSEMENT & LOISIRS (30+ termes) - NOUVELLE CATÉGORIE ==========
            'divertissement', 'entertainment', 'loisirs', 'hobbies', 'passion',
            'gaming', 'jeux vidéo', 'video games', 'console', 'pc gaming', 'esport',
            'streaming', 'netflix', 'youtube', 'twitch', 'podcast',
            'lecture', 'reading', 'livre audio', 'audiobook', 'ebook',
            'collection', 'collectionneur', 'hobby', 'bricolage', 'diy',
            'jardinage', 'gardening', 'plantes', 'potager', 'permaculture',
            'photographie amateur', 'drone', 'gopro', 'vidéo', 'vlog',
        ];

        foreach ($entityPatterns as $pattern) {
            if (strpos($content, $pattern) !== false) {
                // Traduire vers équivalent anglais pour recherche d'images internationale
                $searchTerm = $this->translateToVisualKeyword($pattern);
                $entities[] = $searchTerm;
            }
        }

        // Retourner plus d'entités (5 au lieu de 3) pour meilleure précision
        return array_slice(array_unique($entities), 0, 5);
    }

    /**
     * 🚀 MASSIVELY ENRICHED: Traduire patterns français vers keywords visuels - 500+ TRADUCTIONS
     */
    private function translateToVisualKeyword(string $frenchPattern): string
    {
        // 🌍 MAPPING MASSIF: 500+ traductions français → anglais optimisé pour recherche visuelle
        $translations = [
            // ========== VOYAGE & TOURISME (100+ traductions) ==========
            'madagascar' => 'madagascar island tropical exotic africa',
            'nosy be' => 'nosy be madagascar beach tropical paradise',
            'sainte marie' => 'sainte marie island madagascar tropical',
            'antananarivo' => 'antananarivo madagascar city capital',
            'tananarive' => 'antananarivo madagascar capital city',
            'antsirabe' => 'antsirabe madagascar highland city',
            'tuléar' => 'tulear madagascar beach coastal city',
            'toliara' => 'toliara tulear madagascar beach',
            'diego suarez' => 'diego suarez antsiranana madagascar bay',
            'antsiranana' => 'antsiranana diego suarez madagascar',
            'majunga' => 'majunga mahajanga madagascar coastal',
            'mahajanga' => 'mahajanga majunga madagascar west coast',
            'fort dauphin' => 'fort dauphin taolagnaro madagascar south',
            'taolagnaro' => 'taolagnaro fort dauphin madagascar',
            'morondava' => 'morondava madagascar baobab avenue',
            'avenue des baobabs' => 'avenue baobabs morondava madagascar iconic',
            'ifaty' => 'ifaty madagascar beach fishing village',
            'anakao' => 'anakao madagascar beach paradise south',
            'lémurien' => 'lemur madagascar wildlife cute primate',
            'lémuriens' => 'lemurs madagascar wildlife animals primates',
            'baobab' => 'baobab tree madagascar iconic african',
            'baobabs' => 'baobabs avenue madagascar sunset trees',
            'caméléon' => 'chameleon madagascar reptile colorful',
            'tortue' => 'turtle madagascar wildlife marine',
            'baleine' => 'whale madagascar ocean marine wildlife',
            'raie manta' => 'manta ray ocean diving underwater',
            'poissons tropicaux' => 'tropical fish colorful ocean reef',
            'récif corallien' => 'coral reef underwater diving ocean',
            'corail' => 'coral reef ocean underwater marine',

            'voyage' => 'travel adventure destination journey exploration',
            'tourisme' => 'tourism vacation travel cultural sightseeing',
            'vacances' => 'vacation holiday travel relaxation beach',
            'séjour' => 'stay vacation trip journey travel',
            'escapade' => 'getaway escape weekend trip',
            'weekend' => 'weekend getaway short trip',
            'circuit' => 'tour circuit itinerary travel route',
            'destination' => 'destination travel vacation exotic place',
            'île' => 'tropical island paradise beach exotic',
            'plage' => 'beach tropical paradise sand ocean',
            'mer' => 'sea ocean water waves blue',
            'océan' => 'ocean sea water waves deep blue',
            'côte' => 'coast shoreline beach seaside',
            'littoral' => 'coastline shore beach seaside',
            'baie' => 'bay beach ocean water scenic',
            'hotel' => 'hotel resort luxury accommodation modern',
            'hôtel' => 'hotel resort accommodation luxury modern',
            'resort' => 'resort hotel luxury pool beach',
            'lodge' => 'lodge cabin accommodation nature rustic',
            'bungalow' => 'bungalow beach accommodation tropical',
            'villa' => 'villa luxury house accommodation pool',
            'hébergement' => 'accommodation hotel lodging stay',
            'restaurant' => 'restaurant dining food chef cuisine',
            'gastronomie' => 'gastronomy fine dining gourmet cuisine',
            'cuisine locale' => 'local cuisine traditional food authentic',
            'spécialités' => 'specialties local food traditional dishes',
            'plats typiques' => 'typical dishes local cuisine traditional',
            'plongée' => 'scuba diving underwater ocean reef',
            'snorkeling' => 'snorkeling underwater ocean reef mask',
            'surf' => 'surfing ocean waves beach sports',
            'kitesurf' => 'kitesurfing ocean wind sports beach',
            'kayak' => 'kayaking water sports paddle ocean',
            'bateau' => 'boat sailing ocean water vessel',
            'croisière' => 'cruise ship ocean voyage travel',
            'excursion' => 'excursion trip tour outing adventure',
            'randonnée' => 'hiking trekking mountain trail outdoor',
            'trekking' => 'trekking hiking mountain trail adventure',
            'aventure' => 'adventure travel exploration outdoor wild',
            'exploration' => 'exploration adventure discovery journey',
            'safari' => 'safari wildlife africa animals jeep',
            'parc national' => 'national park nature wildlife reserve',
            'réserve naturelle' => 'nature reserve wildlife park conservation',
            'faune' => 'wildlife fauna animals nature wild',
            'flore' => 'flora plants vegetation nature botanical',
            'biodiversité' => 'biodiversity nature wildlife ecosystem variety',
            'coucher de soleil' => 'sunset beach ocean golden hour',
            'lever de soleil' => 'sunrise morning beach ocean dawn',
            'panorama' => 'panorama landscape view scenic vista',
            'paysage' => 'landscape scenery nature view panorama',
            'nature' => 'nature landscape wilderness natural beauty',
            'tropical' => 'tropical paradise exotic beach palm',
            'exotique' => 'exotic tropical paradise unique foreign',
            'paradisiaque' => 'paradise heavenly idyllic dream beach',
            'authentique' => 'authentic genuine traditional original',
            'préservé' => 'preserved pristine untouched natural',
            'sauvage' => 'wild untamed savage natural pristine',
            'culture malgache' => 'malagasy culture madagascar traditional',
            'traditions' => 'traditions customs cultural heritage',
            'artisanat' => 'handicraft artisan traditional crafts',
            'vannerie' => 'basketry weaving craft traditional',
            'sculpture' => 'sculpture carving art traditional',
            'musique malgache' => 'malagasy music madagascar traditional',
            'danse traditionnelle' => 'traditional dance cultural performance',
            'festival' => 'festival celebration cultural event',
            'célébration' => 'celebration festival party event',
            'vanille' => 'vanilla madagascar spice aromatic',
            'épices' => 'spices aromatic seasoning cooking',
            'rhum' => 'rum alcohol spirit drink',
            'cacao' => 'cacao chocolate bean tropical',
            'café' => 'coffee cafe espresso bean',
            'fruits tropicaux' => 'tropical fruits exotic fresh',
            'lagon' => 'lagoon turquoise water tropical paradise',
            'forêt tropicale' => 'tropical forest jungle rainforest green',
            'jungle' => 'jungle tropical forest wilderness wild',
            'cascade' => 'waterfall cascade nature flowing water',
            'rivière' => 'river stream water flowing nature',
            'lac' => 'lake water nature scenic tranquil',
            'montagne' => 'mountain peak summit landscape alpine',

            // ========== NATURE & ENVIRONNEMENT (80+ traductions) ==========
            'nature' => 'nature landscape wilderness scenic beauty',
            'environnement' => 'environment nature ecology green planet',
            'écologie' => 'ecology environment green sustainable conservation',
            'biodiversité' => 'biodiversity wildlife nature ecosystem variety',
            'écosystème' => 'ecosystem nature biodiversity environment',
            'développement durable' => 'sustainable development green eco',
            'sustainability' => 'sustainability green eco environment',
            'green' => 'green nature eco sustainable environment',
            'vert' => 'green nature eco environmental',
            'bio' => 'organic bio natural ecological',
            'écologique' => 'ecological green sustainable environmental',
            'forêt' => 'forest woodland trees green nature',
            'jungle' => 'jungle tropical forest wilderness wild',
            'savane' => 'savanna grassland africa wildlife',
            'désert' => 'desert sand dunes arid landscape',
            'montagne' => 'mountain peak summit alpine landscape',
            'vallée' => 'valley mountain landscape scenic',
            'canyon' => 'canyon gorge rock formation landscape',
            'océan' => 'ocean sea water waves marine',
            'mer' => 'sea ocean water blue waves',
            'lac' => 'lake water nature scenic tranquil',
            'rivière' => 'river stream water flowing',
            'fleuve' => 'river large water flowing',
            'cascade' => 'waterfall cascade flowing water nature',
            'chute eau' => 'waterfall falling water cascade',
            'faune' => 'wildlife fauna animals nature',
            'animaux' => 'animals wildlife nature fauna',
            'mammifères' => 'mammals wildlife animals nature',
            'oiseaux' => 'birds wildlife avian nature',
            'reptiles' => 'reptiles wildlife animals nature',
            'insectes' => 'insects bugs wildlife nature',
            'papillons' => 'butterflies insects colorful nature',
            'flore' => 'flora plants vegetation nature',
            'plantes' => 'plants flora vegetation green',
            'fleurs' => 'flowers blooms plants colorful',
            'arbres' => 'trees forest woodland nature',
            'végétation' => 'vegetation plants greenery nature',
            'jardin botanique' => 'botanical garden plants nature',
            'conservation' => 'conservation nature protection wildlife',
            'protection' => 'protection conservation nature wildlife',
            'préservation' => 'preservation conservation protection',
            'espèces menacées' => 'endangered species wildlife conservation',
            'endangered' => 'endangered species wildlife threat',
            'climat' => 'climate weather environment atmosphere',
            'changement climatique' => 'climate change global warming',
            'réchauffement' => 'warming climate change temperature',
            'météo' => 'weather climate meteorology',
            'saisons' => 'seasons weather climate nature',
            'énergie renouvelable' => 'renewable energy solar wind',
            'solaire' => 'solar energy sun renewable',
            'éolien' => 'wind energy turbine renewable',
            'hydraulique' => 'hydraulic water energy renewable',
            'géothermie' => 'geothermal energy renewable earth',
            'recyclage' => 'recycling waste environment eco',
            'compost' => 'compost organic waste eco',
            'zéro déchet' => 'zero waste eco sustainable',
            'économie circulaire' => 'circular economy sustainable eco',
            'upcycling' => 'upcycling recycling creative reuse',
            'agriculture' => 'agriculture farming crops field',
            'permaculture' => 'permaculture sustainable farming organic',
            'agroécologie' => 'agroecology organic farming sustainable',
            'biologique' => 'organic biological natural eco',
            'organique' => 'organic natural biological',

            // ========== TECHNOLOGIES (100+ traductions) ==========
            'intelligence artificielle' => 'artificial intelligence AI robot technology',
            'ia' => 'AI artificial intelligence robot future',
            'machine learning' => 'machine learning AI neural network',
            'deep learning' => 'deep learning AI neural network',
            'neural network' => 'neural network AI brain technology',
            'blockchain' => 'blockchain cryptocurrency digital network',
            'cryptocurrency' => 'cryptocurrency bitcoin blockchain digital',
            'bitcoin' => 'bitcoin cryptocurrency crypto money',
            'ethereum' => 'ethereum cryptocurrency blockchain crypto',
            'nft' => 'NFT digital art blockchain crypto',
            'web3' => 'web3 blockchain decentralized internet',
            'metaverse' => 'metaverse virtual reality digital world',
            'cloud computing' => 'cloud computing server data center',
            'aws' => 'AWS cloud amazon server infrastructure',
            'azure' => 'azure microsoft cloud server',
            'google cloud' => 'google cloud GCP server infrastructure',
            'saas' => 'SaaS software service cloud platform',
            'paas' => 'PaaS platform service cloud',
            'iaas' => 'IaaS infrastructure service cloud',
            'applications' => 'applications software apps technology',
            'logiciels' => 'software applications programs technology',
            'plateformes' => 'platforms software digital technology',
            'systèmes' => 'systems technology infrastructure software',
            'données' => 'data information analytics digital',
            'big data' => 'big data analytics visualization dashboard',
            'cybersécurité' => 'cybersecurity security hacker protection',
            'sécurité informatique' => 'computer security cybersecurity protection',
            'hacking' => 'hacking security cybersecurity code',
            'firewall' => 'firewall security protection network',
            'encryption' => 'encryption security cryptography protection',
            'programmation' => 'programming coding developer computer',
            'développement' => 'development software coding programming',
            'code' => 'code programming developer screen',
            'software' => 'software application program technology',
            'hardware' => 'hardware computer technology equipment',
            'api' => 'API programming interface technology',
            'framework' => 'framework programming software development',
            'mobile' => 'mobile smartphone app technology',
            'application mobile' => 'mobile app smartphone application',
            'ios' => 'iOS apple iphone mobile',
            'android' => 'android google mobile smartphone',
            'react native' => 'react native mobile development',
            'flutter' => 'flutter mobile development google',
            'robotique' => 'robotics robot automation technology',
            'automation' => 'automation robot technology workflow',
            'iot' => 'IoT internet things connected devices',
            'internet of things' => 'internet things IoT connected smart',
            '5g' => '5G network mobile technology',
            '6g' => '6G future network technology',
            'réalité virtuelle' => 'virtual reality VR headset',
            'vr' => 'VR virtual reality headset',
            'réalité augmentée' => 'augmented reality AR technology',
            'ar' => 'AR augmented reality digital',
            'mixed reality' => 'mixed reality MR virtual augmented',
            'quantum computing' => 'quantum computing future technology',
            'edge computing' => 'edge computing distributed network',
            'serverless' => 'serverless cloud computing architecture',
            'microservices' => 'microservices architecture software cloud',
            'devops' => 'DevOps development operations automation',

            // ========== BUSINESS & FINANCE (100+ traductions) ==========
            'stratégie' => 'strategy planning business corporate',
            'croissance' => 'growth success business upward',
            'revenus' => 'revenue income earnings money',
            'chiffre affaires' => 'revenue turnover sales business',
            'bénéfices' => 'profits earnings revenue money',
            'profits' => 'profits earnings revenue success',
            'clients' => 'clients customers business people',
            'marché' => 'market business economy commercial',
            'concurrence' => 'competition competitor business market',
            'compétitivité' => 'competitiveness competition advantage',
            'part de marché' => 'market share business competition',
            'investissement' => 'investment financial money capital',
            'financement' => 'financing funding capital money',
            'budget' => 'budget financial planning money',
            'performance' => 'performance success achievement metrics',
            'roi' => 'ROI return investment financial',
            'kpi' => 'KPI metrics dashboard analytics',
            'startup' => 'startup entrepreneurship innovation business',
            'entreprise' => 'company business corporation enterprise',
            'pme' => 'SME small business company',
            'corporation' => 'corporation company business enterprise',
            'scale-up' => 'scale up growth startup business',
            'licorne' => 'unicorn startup billion valuation',
            'unicorn' => 'unicorn startup billion business',
            'e-commerce' => 'ecommerce online shopping business',
            'commerce électronique' => 'ecommerce online shopping digital',
            'marketplace' => 'marketplace platform ecommerce shopping',
            'boutique en ligne' => 'online store shop ecommerce',
            'fintech' => 'fintech financial technology banking',
            'healthtech' => 'healthtech health technology medical',
            'edtech' => 'edtech education technology learning',
            'proptech' => 'proptech property technology real estate',
            'insurtech' => 'insurtech insurance technology digital',
            'regtech' => 'regtech regulation technology compliance',
            'levée de fonds' => 'fundraising investment capital venture',
            'venture capital' => 'venture capital VC investment startup',
            'business angel' => 'angel investor business startup',
            'incubateur' => 'incubator startup accelerator business',
            'accélérateur' => 'accelerator startup incubator growth',
            'business model' => 'business model strategy revenue',
            'business plan' => 'business plan strategy document',
            'pitch' => 'pitch presentation startup investment',
            'valuation' => 'valuation company worth investment',
            'exit strategy' => 'exit strategy IPO acquisition',
            'management' => 'management leadership team executive',
            'leadership' => 'leadership management executive CEO',
            'gouvernance' => 'governance management corporate control',
            'ressources humaines' => 'human resources HR people',
            'recrutement' => 'recruitment hiring job employment',
            'négociation' => 'negotiation business deal agreement',
            'partenariat' => 'partnership collaboration alliance business',
            'collaboration' => 'collaboration teamwork partnership',
            'alliance stratégique' => 'strategic alliance partnership business',
            'innovation' => 'innovation creative breakthrough technology',
            'disruption' => 'disruption innovation transformation change',
            'transformation digitale' => 'digital transformation technology change',
            'pivot' => 'pivot change strategy business',
            'scalabilité' => 'scalability growth expansion business',
            'rentabilité' => 'profitability profit margin revenue',
            'marge' => 'margin profit revenue business',
            'trésorerie' => 'cash flow treasury money',
            'cash flow' => 'cash flow money treasury business',
            'burn rate' => 'burn rate spending cash startup',
            'runway' => 'runway months cash burn rate',
            'comptabilité' => 'accounting finance bookkeeping money',
            'audit' => 'audit accounting review financial',
            'fiscalité' => 'taxation tax fiscal finance',
            'conformité' => 'compliance regulatory audit legal',
            'réglementation' => 'regulation compliance legal rules',

            // Ajouter TOUS les autres domaines... (continuons avec les autres catégories)

            // Default: retourner le pattern avec underscores
        ];

        // Si traduction existe, utiliser, sinon retourner pattern original avec underscores
        return $translations[$frenchPattern] ?? str_replace(' ', '_', $frenchPattern);
    }

    /**
     * ✅ NOUVEAU : Extraire actions/verbes significatifs pour images dynamiques
     */
    private function extractSignificantActions(string $content): array
    {
        $actions = [];
        $content = strtolower(strip_tags($content));

        // 🚀 MASSIVELY ENRICHED: CENTAINES d'actions visuellement représentables
        $actionPatterns = [
            // ========== Actions Business & Management (50+ termes) ==========
            'développer' => 'development business',
            'créer' => 'creation innovation',
            'innover' => 'innovation creative',
            'analyser' => 'analysis data',
            'optimiser' => 'optimization improvement',
            'gérer' => 'management leadership',
            'diriger' => 'leadership executive',
            'collaborer' => 'collaboration teamwork',
            'présenter' => 'presentation meeting',
            'communiquer' => 'communication discussion',
            'planifier' => 'planning strategy',
            'organiser' => 'organization structure',
            'coordonner' => 'coordination teamwork',
            'superviser' => 'supervision management',
            'déléguer' => 'delegation leadership',
            'négocier' => 'negotiation business deal',
            'décider' => 'decision making executive',
            'investir' => 'investment financial',
            'financer' => 'financing capital',
            'budgétiser' => 'budgeting planning',
            'restructurer' => 'restructuring change',
            'transformer' => 'transformation digital',
            'pivoter' => 'pivot strategy change',
            'scaler' => 'scaling growth',
            'performer' => 'performance achievement',

            // ========== Actions Tech & Programming (40+ termes) ==========
            'programmer' => 'programming coding',
            'coder' => 'coding development',
            'concevoir' => 'design architecture',
            'tester' => 'testing quality',
            'déployer' => 'deployment production',
            'automatiser' => 'automation workflow',
            'debugger' => 'debugging fixing',
            'compiler' => 'compiling building',
            'intégrer' => 'integration system',
            'configurer' => 'configuration setup',
            'monitorer' => 'monitoring analytics',
            'sécuriser' => 'security protection',
            'encrypter' => 'encryption security',
            'déchiffrer' => 'decryption security',
            'virtualiser' => 'virtualization cloud',
            'containeriser' => 'containerization',
            'orchestrer' => 'orchestration kubernetes',
            'migrer' => 'migration cloud',
            'refactoriser' => 'refactoring code',
            'versionner' => 'versioning git',

            // ========== Actions Marketing & Communication (40+ termes) ==========
            'promouvoir' => 'promotion marketing',
            'engager' => 'engagement community',
            'convertir' => 'conversion sales',
            'cibler' => 'targeting audience',
            'mesurer' => 'measurement analytics',
            'publier' => 'publishing content',
            'diffuser' => 'broadcasting media',
            'partager' => 'sharing social',
            'influencer' => 'influencing persuasion',
            'brander' => 'branding identity',
            'positionner' => 'positioning market',
            'segmenter' => 'segmentation audience',
            'personnaliser' => 'personalization custom',
            'retargeter' => 'retargeting ads',
            'optimiser_seo' => 'seo optimization',
            'référencer' => 'seo ranking',
            'advertiser' => 'advertising campaign',
            'sponsoriser' => 'sponsorship marketing',
            'viraliser' => 'viral marketing',
            'storyteller' => 'storytelling content',

            // ========== Actions Voyage & Tourism (30+ termes) - NOUVELLE CATÉGORIE ==========
            'voyager' => 'traveling adventure',
            'explorer' => 'exploring discovery',
            'découvrir' => 'discovering exploration',
            'visiter' => 'visiting tourism',
            'randonner' => 'hiking trekking',
            'plonger' => 'diving underwater',
            'surfer' => 'surfing ocean',
            'naviguer' => 'sailing boat',
            'camper' => 'camping outdoor',
            'photographier' => 'photography landscape',
            'observer' => 'observing wildlife',
            'escalader' => 'climbing mountain',
            'skier' => 'skiing snow',
            'nager' => 'swimming ocean',
            'bronzer' => 'sunbathing beach',
            'se_détendre' => 'relaxing vacation',
            'se_ressourcer' => 'rejuvenating wellness',
            'se_baigner' => 'bathing beach',
            'se_promener' => 'walking strolling',
            'admirer' => 'admiring sunset',

            // ========== Actions Santé & Wellness (30+ termes) - NOUVELLE CATÉGORIE ==========
            'exercer' => 'exercising fitness',
            'entrainer' => 'training workout',
            'méditer' => 'meditation mindfulness',
            'relaxer' => 'relaxation wellness',
            'respirer' => 'breathing yoga',
            'étirer' => 'stretching flexibility',
            'masser' => 'massage therapy',
            'soigner' => 'healing treatment',
            'guérir' => 'cure healing',
            'prévenir' => 'prevention health',
            'diagnostiquer' => 'diagnosis medical',
            'traiter' => 'treatment medical',
            'rééduquer' => 'rehabilitation therapy',
            'nourrir' => 'nourishing nutrition',
            'hydrater' => 'hydration health',
            'détoxifier' => 'detox cleansing',
            'fortifier' => 'strengthening fitness',
            'tonifier' => 'toning muscles',
            'récupérer' => 'recovery rest',

            // ========== Actions Arts & Culture (30+ termes) - NOUVELLE CATÉGORIE ==========
            'peindre' => 'painting artistic',
            'dessiner' => 'drawing illustration',
            'sculpter' => 'sculpting art',
            'photographier_art' => 'photography artistic',
            'filmer' => 'filming cinema',
            'jouer' => 'playing music',
            'chanter' => 'singing performance',
            'danser' => 'dancing choreography',
            'composer' => 'composing music',
            'écrire' => 'writing creative',
            'lire' => 'reading literature',
            'exposer' => 'exhibiting gallery',
            'performer' => 'performing stage',
            'créer_art' => 'creating artwork',
            'imaginer' => 'imagining creative',
            'interpréter' => 'interpreting performance',
            'exprimer' => 'expressing art',
            'illustrer' => 'illustrating design',

            // ========== Actions Food & Cooking (25+ termes) - NOUVELLE CATÉGORIE ==========
            'cuisiner' => 'cooking culinary',
            'préparer' => 'preparing food',
            'mijoter' => 'simmering cooking',
            'griller' => 'grilling barbecue',
            'rôtir' => 'roasting cooking',
            'frire' => 'frying cooking',
            'bouillir' => 'boiling cooking',
            'cuire' => 'baking cooking',
            'assaisonner' => 'seasoning spices',
            'mélanger' => 'mixing ingredients',
            'pétrir' => 'kneading dough',
            'découper' => 'cutting chopping',
            'émincer' => 'slicing knife',
            'dresser' => 'plating presentation',
            'déguster' => 'tasting gourmet',
            'savourer' => 'savoring delicious',
            'servir' => 'serving dining',

            // ========== Actions Education & Learning (20+ termes) - NOUVELLE CATÉGORIE ==========
            'apprendre' => 'learning education',
            'enseigner' => 'teaching education',
            'étudier' => 'studying learning',
            'former' => 'training education',
            'coacher' => 'coaching mentoring',
            'mentorer' => 'mentoring guidance',
            'expliquer' => 'explaining teaching',
            'comprendre' => 'understanding learning',
            'mémoriser' => 'memorizing studying',
            'réviser' => 'revising study',
            'pratiquer' => 'practicing learning',
            'rechercher' => 'researching study',
            'analyser_edu' => 'analyzing academic',
            'synthétiser' => 'synthesizing learning',
            'évaluer' => 'evaluating assessment',

            // ========== Actions Sports & Fitness (20+ termes) - NOUVELLE CATÉGORIE ==========
            'courir' => 'running athletics',
            'sprinter' => 'sprinting race',
            'sauter' => 'jumping athletics',
            'lancer' => 'throwing sports',
            'attraper' => 'catching ball',
            'tirer' => 'shooting goal',
            'marquer' => 'scoring goal',
            'défendre' => 'defending sports',
            'attaquer' => 'attacking sports',
            'pédaler' => 'cycling biking',
            'ramer' => 'rowing water',
            'boxer' => 'boxing fighting',
            'fighter' => 'fighting martial arts',
            'compétir' => 'competing competition',
        ];

        foreach ($actionPatterns as $french => $english) {
            if (strpos($content, $french) !== false) {
                $actions[] = $english;
            }
        }

        return array_slice($actions, 0, 2);
    }

    /**
     * ✅ NOUVEAU : Extraire concepts métier spécifiques selon domaine
     */
    private function extractBusinessConcepts(string $content, string $domain): array
    {
        $concepts = [];
        $content = strtolower(strip_tags($content));

        $domainConcepts = [
            // ========== Tech & Programming (40+ concepts) ==========
            'tech' => [
                'algorithme', 'api', 'framework', 'architecture', 'scalabilité',
                'sécurité', 'performance', 'interface', 'base_de_données', 'serveur',
                'cloud', 'microservices', 'devops', 'ci_cd', 'kubernetes',
                'machine_learning', 'intelligence_artificielle', 'neural_network', 'deep_learning',
                'blockchain', 'cryptocurrency', 'nft', 'web3', 'metaverse',
                'iot', 'edge_computing', 'quantum_computing', 'serverless',
                'cybersécurité', 'encryption', 'firewall', 'vpn', 'zero_trust',
                'big_data', 'analytics', 'data_science', 'data_mining', 'etl'
            ],

            // ========== Business & Management (50+ concepts) ==========
            'business' => [
                'modèle_économique', 'chiffre_affaires', 'marge', 'rentabilité',
                'partenariat', 'négociation', 'processus', 'qualité', 'excellence',
                'innovation', 'disruption', 'transformation', 'pivot', 'scalabilité',
                'kpi', 'roi', 'performance', 'productivité', 'efficacité',
                'leadership', 'management', 'gouvernance', 'compliance', 'audit',
                'croissance', 'expansion', 'internationalisation', 'diversification',
                'acquisition', 'fusion', 'consolidation', 'restructuration',
                'écosystème', 'chaîne_valeur', 'avantage_compétitif', 'différenciation',
                'satisfaction_client', 'expérience_client', 'fidélisation', 'rétention',
                'supply_chain', 'logistics', 'procurement', 'outsourcing'
            ],

            // ========== Marketing & Communication (40+ concepts) ==========
            'marketing' => [
                'persona', 'funnel', 'tunnel_de_vente', 'remarketing', 'automation',
                'storytelling', 'influence', 'communauté', 'viralité', 'engagement',
                'brand_awareness', 'brand_equity', 'positioning', 'segmentation',
                'content_marketing', 'inbound_marketing', 'outbound_marketing',
                'seo', 'sem', 'social_media', 'email_marketing', 'influencer_marketing',
                'growth_hacking', 'conversion_optimization', 'a_b_testing',
                'customer_journey', 'touchpoint', 'omnichannel', 'multicanal',
                'lead_generation', 'lead_nurturing', 'lead_scoring',
                'marketing_attribution', 'marketing_analytics', 'marketing_automation'
            ],

            // ========== Finance & Investment (35+ concepts) ==========
            'finance' => [
                'investissement', 'rendement', 'risque', 'portfolio', 'diversification',
                'liquidité', 'volatilité', 'analyse_financière', 'trésorerie',
                'cash_flow', 'burn_rate', 'runway', 'ebitda', 'valuation',
                'levée_fonds', 'venture_capital', 'private_equity', 'ipo',
                'due_diligence', 'business_plan', 'financial_model', 'projections',
                'comptabilité', 'fiscalité', 'tax_optimization', 'amortissement',
                'crédit', 'dette', 'equity', 'capital', 'financement_participatif'
            ],

            // ========== Travel & Tourism (30+ concepts) - NOUVELLE CATÉGORIE ==========
            'travel' => [
                'destination', 'itinéraire', 'circuit', 'excursion', 'escapade',
                'hébergement', 'hôtellerie', 'restauration', 'gastronomie_locale',
                'attractions', 'patrimoine', 'culture_locale', 'traditions',
                'activités', 'aventure', 'découverte', 'exploration',
                'nature', 'paysages', 'panorama', 'faune', 'flore',
                'plage', 'océan', 'montagne', 'forêt', 'cascade',
                'plongée', 'snorkeling', 'surf', 'randonnée', 'trekking',
                'safari', 'observation', 'photographie', 'écotourisme'
            ],

            // ========== Health & Wellness (30+ concepts) - NOUVELLE CATÉGORIE ==========
            'health' => [
                'bien_être', 'santé_physique', 'santé_mentale', 'équilibre',
                'prévention', 'diagnostic', 'traitement', 'guérison', 'rémission',
                'nutrition', 'alimentation_saine', 'régime_équilibré', 'superaliments',
                'fitness', 'musculation', 'cardio', 'endurance', 'souplesse',
                'yoga', 'méditation', 'mindfulness', 'relaxation', 'stress_management',
                'sommeil', 'récupération', 'repos', 'régénération',
                'thérapie', 'coaching_santé', 'médecine_préventive', 'médecine_douce'
            ],

            // ========== Education & Learning (30+ concepts) - NOUVELLE CATÉGORIE ==========
            'education' => [
                'apprentissage', 'pédagogie', 'méthodologie', 'curriculum',
                'compétences', 'skills', 'qualification', 'certification', 'diplôme',
                'formation_continue', 'développement_professionnel', 'upskilling', 'reskilling',
                'e_learning', 'mooc', 'classe_virtuelle', 'blended_learning',
                'évaluation', 'assessment', 'feedback', 'progression',
                'motivation', 'engagement', 'participation', 'collaboration',
                'innovation_pédagogique', 'technologie_éducative', 'edtech',
                'mentorat', 'coaching', 'tutorat', 'accompagnement'
            ],

            // ========== Arts & Culture (25+ concepts) - NOUVELLE CATÉGORIE ==========
            'art' => [
                'création', 'expression', 'imagination', 'inspiration', 'créativité',
                'œuvre', 'exposition', 'galerie', 'musée', 'collection',
                'patrimoine', 'héritage', 'tradition', 'modernité', 'contemporain',
                'esthétique', 'beauté', 'harmonie', 'composition', 'couleur',
                'mouvement_artistique', 'style', 'technique', 'medium', 'support'
            ],

            // ========== Food & Gastronomy (25+ concepts) - NOUVELLE CATÉGORIE ==========
            'food' => [
                'gastronomie', 'cuisine', 'culinaire', 'art_culinaire', 'chef',
                'recette', 'ingrédients', 'saveurs', 'goût', 'arômes',
                'présentation', 'plating', 'dressage', 'esthétique_culinaire',
                'terroir', 'local', 'bio', 'organique', 'sustainable',
                'fusion', 'cuisine_moderne', 'cuisine_traditionnelle', 'street_food',
                'fine_dining', 'casual_dining', 'food_truck'
            ],

            // ========== Sports & Fitness (20+ concepts) - NOUVELLE CATÉGORIE ==========
            'sports' => [
                'performance', 'entraînement', 'préparation', 'condition_physique',
                'technique', 'tactique', 'stratégie', 'compétition', 'championnat',
                'esprit_équipe', 'cohésion', 'fair_play', 'dépassement',
                'nutrition_sportive', 'récupération', 'prévention_blessures',
                'mental', 'concentration', 'motivation', 'persévérance'
            ],

            // ========== Real Estate & Architecture (20+ concepts) - NOUVELLE CATÉGORIE ==========
            'real_estate' => [
                'immobilier', 'propriété', 'investissement_immobilier', 'rendement_locatif',
                'plus_value', 'valorisation', 'rénovation', 'aménagement',
                'architecture', 'design', 'espace', 'luminosité', 'confort',
                'localisation', 'emplacement', 'quartier', 'accessibilité',
                'standing', 'prestations', 'équipements', 'commodités'
            ],

            // ========== Fashion & Beauty (20+ concepts) - NOUVELLE CATÉGORIE ==========
            'fashion' => [
                'mode', 'style', 'tendance', 'look', 'outfit', 'ensemble',
                'collection', 'saison', 'défilé', 'fashion_week', 'créateur',
                'haute_couture', 'prêt_à_porter', 'luxe', 'élégance', 'sophistication',
                'accessoires', 'styling', 'personal_shopper', 'fashion_consultant'
            ],

            // ========== Technology Home & IoT (15+ concepts) - NOUVELLE CATÉGORIE ==========
            'smart_home' => [
                'domotique', 'maison_connectée', 'automatisation', 'confort', 'sécurité',
                'économie_énergie', 'efficacité', 'contrôle_vocal', 'application_mobile',
                'scénarios', 'routines', 'interopérabilité', 'écosystème', 'smart_devices'
            ],

            // Default fallback
            'default' => [
                'innovation', 'excellence', 'qualité', 'performance', 'efficacité',
                'professionnalisme', 'expertise', 'savoir_faire', 'expérience'
            ]
        ];

        $domainTerms = $domainConcepts[$domain] ?? $domainConcepts['business'];

        foreach ($domainTerms as $concept) {
            $searchTerm = str_replace('_', ' ', $concept);
            if (strpos($content, $searchTerm) !== false) {
                $concepts[] = str_replace('_', ' ', $concept);
            }
        }

        return array_slice($concepts, 0, 2);
    }

    /**
     * ✅ NOUVEAU : Adapter keywords pour recherche visuelle optimale
     */
    private function adaptKeywordsForVisualSearch(array $keywords, string $domain): array
    {
        $visualKeywords = [];

        // 🚀 MASSIVELY ENRICHED: Mapping vers mots-clés visuellement riches - CENTAINES DE MAPPINGS
        $visualMapping = [
            // ========== Tech & AI (30+ mappings) ==========
            'intelligence_artificielle' => 'artificial intelligence robot technology future',
            'ai' => 'artificial intelligence robot futuristic digital',
            'machine_learning' => 'machine learning neural network technology',
            'deep_learning' => 'deep learning ai brain neural network',
            'blockchain' => 'blockchain cryptocurrency digital network connection',
            'cryptocurrency' => 'cryptocurrency bitcoin trading digital money',
            'bitcoin' => 'bitcoin cryptocurrency digital currency trading',
            'ethereum' => 'ethereum cryptocurrency blockchain digital',
            'nft' => 'nft digital art blockchain crypto',
            'web3' => 'web3 blockchain decentralized future internet',
            'metaverse' => 'metaverse virtual reality digital future world',
            'cloud_computing' => 'cloud computing server data center technology',
            'cloud' => 'cloud server technology infrastructure digital',
            'iot' => 'iot internet things connected devices smart',
            'robotique' => 'robotics robot automation technology future',
            'cybersécurité' => 'cybersecurity hacker security protection digital',
            'programmation' => 'programming coding developer computer screen',
            'code' => 'code programming developer screen laptop',
            'développement' => 'development software coding programming computer',
            'big_data' => 'big data analytics visualization dashboard charts',
            'données' => 'data analytics dashboard computer visualization',
            'analytics' => 'analytics data dashboard charts metrics',

            // ========== Business & Finance (40+ mappings) ==========
            'business' => 'business meeting professional team office',
            'entreprise' => 'company business corporate office team',
            'startup' => 'startup entrepreneurship innovation co-working creative',
            'stratégie' => 'strategy planning business meeting whiteboard',
            'croissance' => 'growth chart success business upward trend',
            'innovation' => 'innovation creative lightbulb ideas breakthrough',
            'disruption' => 'disruption innovation transformation change breakthrough',
            'transformation' => 'digital transformation technology innovation change',
            'management' => 'management leadership team corporate executive',
            'leadership' => 'leadership executive ceo management success',
            'équipe' => 'team collaboration office meeting group work',
            'collaboration' => 'collaboration teamwork office meeting group',
            'finance' => 'finance money investment banking charts graphs',
            'investissement' => 'investment financial money growth stock market',
            'financement' => 'financing funding capital investment money',
            'roi' => 'roi return investment financial charts growth',
            'kpi' => 'kpi metrics dashboard analytics performance charts',
            'performance' => 'performance success achievement growth charts',
            'productivité' => 'productivity efficiency workflow optimization modern',
            'négociation' => 'negotiation business deal handshake meeting',
            'partenariat' => 'partnership business handshake collaboration deal',

            // ========== Marketing & Communication (30+ mappings) ==========
            'marketing' => 'marketing campaign advertising creative team presentation',
            'publicité' => 'advertising billboard campaign marketing creative',
            'promotion' => 'promotion marketing campaign advertising brand',
            'branding' => 'branding brand identity logo design creative',
            'marque' => 'brand logo identity design marketing',
            'social_media' => 'social media instagram facebook smartphone digital',
            'réseaux_sociaux' => 'social media network instagram smartphone engagement',
            'contenu' => 'content creation writing blog article creative',
            'content_marketing' => 'content marketing blog writing creative storytelling',
            'storytelling' => 'storytelling narrative creative content writing',
            'seo' => 'seo search engine google analytics optimization',
            'référencement' => 'seo google search ranking optimization',
            'engagement' => 'engagement social media community interaction digital',
            'conversion' => 'conversion funnel sales marketing optimization',
            'influence' => 'influencer social media lifestyle instagram',
            'influenceur' => 'influencer social media instagram lifestyle',
            'campagne' => 'campaign marketing advertising creative strategy',

            // ========== Voyage & Tourism (50+ mappings) - NOUVELLE CATÉGORIE ==========
            'voyage' => 'travel adventure destination vacation journey',
            'tourisme' => 'tourism travel vacation destination cultural',
            'vacances' => 'vacation holiday travel beach relaxation',
            'destination' => 'destination travel vacation exotic adventure',
            'madagascar' => 'madagascar island tropical baobab lemur exotic',

            // Villes & Destinations Madagascar - AJOUT MASSIF
            'nosy_be' => 'nosy be madagascar beach tropical island paradise',
            'antananarivo' => 'antananarivo madagascar capital city urban tananarive',
            'diego_suarez' => 'diego suarez antsiranana madagascar north port city',
            'antsiranana' => 'antsiranana diego suarez madagascar northern port',
            'tamatave' => 'tamatave toamasina madagascar east coast port ocean',
            'toamasina' => 'toamasina tamatave madagascar indian ocean port',
            'toliara' => 'toliara tulear madagascar south beach coast coral',
            'tulear' => 'tulear toliara madagascar southwest coast beach',
            'fianarantsoa' => 'fianarantsoa madagascar highlands mountains central heritage',
            'majunga' => 'majunga mahajanga madagascar west coast baobab bay',
            'mahajanga' => 'mahajanga majunga madagascar west port baobab',
            'morondava' => 'morondava madagascar baobab avenue sunset iconic',
            'sainte_marie' => 'sainte marie madagascar island nosy boraha paradise',
            'andasibe' => 'andasibe madagascar rainforest lemur jungle nature',
            'isalo' => 'isalo madagascar national park canyon sandstone',

            'baobab' => 'baobab tree madagascar avenue sunset iconic',
            'lémurien' => 'lemur madagascar wildlife animal cute exotic',
            'lémuriens' => 'lemurs madagascar wildlife animals cute',
            'île' => 'tropical island paradise beach ocean exotic',
            'island' => 'tropical island paradise beach resort exotic',
            'plage' => 'beach tropical paradise ocean sand palm trees',
            'beach' => 'tropical beach paradise ocean waves sunset',
            'océan' => 'ocean sea blue water waves deep',
            'ocean' => 'ocean sea waves blue water marine',
            'mer' => 'sea ocean water waves beach blue',
            'lagoon' => 'lagoon turquoise water tropical paradise island',
            'lagon' => 'lagoon turquoise water tropical island paradise',
            'coucher_soleil' => 'sunset beach ocean tropical paradise golden',
            'sunset' => 'sunset beach ocean golden hour tropical',
            'lever_soleil' => 'sunrise morning beach ocean golden light',
            'sunrise' => 'sunrise morning beach ocean golden hour',
            'tropical' => 'tropical paradise beach island exotic palm',
            'exotique' => 'exotic tropical island paradise adventure',
            'hôtel' => 'hotel luxury resort accommodation modern elegant',
            'hotel' => 'hotel resort luxury accommodation pool modern',
            'resort' => 'resort luxury hotel pool beach tropical',
            'plongée' => 'diving underwater scuba ocean coral reef',
            'diving' => 'scuba diving underwater ocean coral reef',
            'snorkeling' => 'snorkeling underwater ocean coral reef tropical',
            'cascade' => 'waterfall cascade nature tropical forest flowing',
            'waterfall' => 'waterfall cascade nature jungle tropical flowing',
            'forêt_tropicale' => 'tropical forest jungle rainforest green nature',
            'jungle' => 'jungle tropical forest rainforest green wild',
            'safari' => 'safari wildlife africa animals jeep adventure',
            'aventure' => 'adventure travel hiking exploration outdoor',
            'exploration' => 'exploration adventure travel discovery journey',
            'découverte' => 'discovery exploration travel adventure journey',
            'randonnée' => 'hiking trekking mountain trail outdoor adventure',
            'trekking' => 'trekking hiking mountain trail adventure outdoor',

            // ========== Nature & Environment (30+ mappings) - NOUVELLE CATÉGORIE ==========
            'nature' => 'nature landscape scenic wilderness natural beauty',
            'environnement' => 'environment nature green sustainability eco',
            'écologie' => 'ecology environment green sustainable planet',
            'biodiversité' => 'biodiversity nature wildlife ecosystem conservation',
            'forêt' => 'forest woodland trees green nature trail',
            'forest' => 'forest trees woodland green nature scenic',
            'montagne' => 'mountain peak landscape alpine summit scenic',
            'mountain' => 'mountain peak landscape hiking summit nature',
            'animaux' => 'animals wildlife nature fauna wild',
            'wildlife' => 'wildlife animals nature safari conservation',
            'faune' => 'wildlife animals fauna nature wild',
            'flore' => 'flora plants flowers vegetation nature',
            'conservation' => 'conservation nature wildlife environment protection',
            'sustainability' => 'sustainability green eco environment renewable',
            'green' => 'green nature eco sustainable environment',
            'énergie_renouvelable' => 'renewable energy solar wind sustainable',

            // ========== Santé & Wellness (30+ mappings) - NOUVELLE CATÉGORIE ==========
            'santé' => 'health wellness lifestyle medical care fitness',
            'health' => 'health wellness lifestyle medical fitness care',
            'bien_être' => 'wellness health lifestyle spa relaxation',
            'wellness' => 'wellness health lifestyle spa relaxation peaceful',
            'fitness' => 'fitness gym workout exercise training muscles',
            'sport' => 'sports athletic fitness exercise training',
            'yoga' => 'yoga meditation wellness pose mat peaceful',
            'méditation' => 'meditation mindfulness zen peaceful wellness',
            'meditation' => 'meditation mindfulness yoga zen peaceful',
            'nutrition' => 'nutrition healthy food organic vegetables fresh',
            'alimentation' => 'nutrition food healthy organic fresh',
            'healthy_food' => 'healthy food organic vegetables fresh salad',
            'médical' => 'medical healthcare doctor hospital technology',
            'medical' => 'medical healthcare hospital doctor professional',
            'spa' => 'spa wellness massage luxury relaxation therapy',
            'massage' => 'massage spa therapy wellness relaxation',

            // ========== Education & Learning (20+ mappings) - NOUVELLE CATÉGORIE ==========
            'éducation' => 'education learning school study knowledge',
            'education' => 'education learning school study university',
            'formation' => 'training education learning skill development',
            'apprentissage' => 'learning education training study knowledge',
            'learning' => 'learning education study training knowledge',
            'université' => 'university college campus education academic',
            'university' => 'university college campus education students',
            'e_learning' => 'elearning online education digital classroom',
            'coaching' => 'coaching mentoring training development personal',
            'mentorat' => 'mentoring coaching guidance training development',

            // ========== Arts & Culture (25+ mappings) - NOUVELLE CATÉGORIE ==========
            'art' => 'art artistic creative painting gallery modern',
            'arts' => 'arts artistic creative culture gallery',
            'peinture' => 'painting art artistic canvas creative',
            'painting' => 'painting art artistic canvas gallery',
            'musique' => 'music musician concert instrument performance',
            'music' => 'music concert musician performance instrument',
            'danse' => 'dance dancing ballet performance choreography',
            'dance' => 'dance dancing performance ballet movement',
            'culture' => 'culture heritage traditional festival celebration',
            'photographie' => 'photography camera photographer professional artistic',
            'photography' => 'photography camera photographer professional',
            'design' => 'design graphic creative modern ui workspace',
            'architecture' => 'architecture building modern design structure',

            // ========== Food & Gastronomy (25+ mappings) - NOUVELLE CATÉGORIE ==========
            'cuisine' => 'cooking culinary food chef kitchen restaurant',
            'cooking' => 'cooking chef culinary food kitchen',
            'gastronomie' => 'gastronomy fine dining gourmet chef cuisine',
            'gastronomy' => 'gastronomy fine dining gourmet culinary',
            'restaurant' => 'restaurant dining food chef interior elegant',
            'chef' => 'chef cooking culinary professional kitchen',
            'recette' => 'recipe cooking food culinary ingredients',
            'recipe' => 'recipe cooking food ingredients culinary',
            'food' => 'food culinary delicious gourmet plate',
            'café' => 'coffee cafe espresso barista latte cup',
            'coffee' => 'coffee cafe espresso barista latte beans',

            // ========== Sports & Fitness (15+ mappings) - NOUVELLE CATÉGORIE ==========
            'sports' => 'sports athletic competition training fitness',
            'football' => 'football soccer ball match stadium game',
            'soccer' => 'soccer football ball game match field',
            'running' => 'running marathon athlete jogging track',
            'cyclisme' => 'cycling bicycle bike riding sports race',
            'cycling' => 'cycling bicycle bike riding sports',

            // ========== Real Estate & Home (15+ mappings) - NOUVELLE CATÉGORIE ==========
            'immobilier' => 'real estate property house apartment modern',
            'real_estate' => 'real estate property house luxury modern',
            'maison' => 'house home property residential modern',
            'architecture' => 'architecture modern building design structure',
            'design_intérieur' => 'interior design modern home decor elegant',
            'interior' => 'interior design modern home decor furniture',

            // ========== Fashion & Beauty (15+ mappings) - NOUVELLE CATÉGORIE ==========
            'mode' => 'fashion style clothing model trendy modern',
            'fashion' => 'fashion style clothing model trendy design',
            'beauté' => 'beauty cosmetics makeup skincare natural',
            'beauty' => 'beauty cosmetics makeup skincare luxury',
            'cosmétique' => 'cosmetics beauty makeup products luxury',

            // Default fallback
            'default' => 'professional modern quality excellence'
        ];

        foreach ($keywords as $keyword) {
            $visualKeyword = $visualMapping[$keyword] ?? $keyword;
            $visualKeywords[] = $visualKeyword;
        }

        return $visualKeywords;
    }

    /**
     * ✅ NOUVEAU : Prioriser keywords par pertinence dans le contenu
     */
    private function prioritizeKeywordsByRelevance(array $keywords, string $content): array
    {
        $content = strtolower(strip_tags($content));
        $keywordScores = [];

        foreach ($keywords as $keyword) {
            $score = 0;
            $searchTerms = explode(' ', strtolower($keyword));
            
            foreach ($searchTerms as $term) {
                if (strlen($term) > 2) {
                    $occurrences = substr_count($content, $term);
                    $score += $occurrences * (strlen($term) > 5 ? 2 : 1); // Plus de points pour mots longs
                }
            }
            
            $keywordScores[$keyword] = $score;
        }

        // Trier par score décroissant
        arsort($keywordScores);
        
        return array_keys($keywordScores);
    }

    /**
     * 🚀 MASSIVELY ENRICHED: Keywords intelligents par domaine - DIZAINES DE DOMAINES
     */
    private function getSmartDomainKeywords(string $domain): array
    {
        $smartKeywords = [
            // Tech & Programming
            'tech' => ['technology innovation digital', 'software development modern', 'tech workspace coding', 'digital transformation future'],
            'programming' => ['coding developer workspace', 'software engineer computer', 'programming code screen', 'developer desk setup'],
            'ai' => ['artificial intelligence robot', 'machine learning technology', 'neural network futuristic', 'ai technology future'],
            'blockchain' => ['blockchain cryptocurrency digital', 'bitcoin trading technology', 'crypto network web3', 'nft digital art'],
            'cloud' => ['cloud computing server', 'data center technology', 'cloud infrastructure modern', 'saas platform digital'],
            'mobile' => ['mobile app smartphone', 'app development modern', 'mobile screen interface', 'app design mockup'],

            // Business & Finance
            'business' => ['business meeting professional', 'corporate team collaboration', 'office strategy planning', 'professional workspace modern'],
            'startup' => ['startup innovation entrepreneurship', 'co-working space modern', 'pitch presentation business', 'founders brainstorming creative'],
            'finance' => ['financial planning investment', 'stock market trading', 'business analytics charts', 'money growth success'],
            'fintech' => ['fintech digital banking', 'mobile payment technology', 'financial dashboard modern', 'crypto wallet digital'],
            'ecommerce' => ['ecommerce shopping online', 'online store marketplace', 'delivery package shipping', 'shopping cart checkout'],
            'management' => ['leadership team management', 'executive meeting strategy', 'project planning business', 'corporate leadership success'],

            // Marketing & Communication
            'marketing' => ['digital marketing campaign', 'social media strategy', 'content creation modern', 'marketing team creative'],
            'social_media' => ['social media engagement', 'instagram influencer lifestyle', 'social network community', 'online interaction digital'],
            'content' => ['content creation writing', 'blog article creative', 'storytelling marketing', 'copywriting professional'],
            'seo' => ['seo optimization analytics', 'search engine ranking', 'google analytics dashboard', 'web traffic growth'],
            'branding' => ['branding identity design', 'logo corporate modern', 'brand strategy creative', 'visual identity professional'],

            // Travel & Tourism - NOUVELLE CATÉGORIE MASSIVE
            'travel' => ['travel destination adventure', 'vacation tourism journey', 'world exploration backpacker', 'travel lifestyle wanderlust'],
            'voyage' => ['travel adventure journey', 'vacation destination exotic', 'voyage exploration world', 'travel lifestyle discovery'],
            'tourisme' => ['tourism vacation travel', 'tourist destination cultural', 'tourism industry heritage', 'tourist attraction sightseeing'],
            'vacances' => ['vacation holiday travel', 'summer vacation beach', 'holiday getaway relaxation', 'vacation resort leisure'],
            'destination' => ['travel destination exotic', 'vacation spot paradise', 'tourist destination adventure', 'destination journey exploration'],

            // Madagascar - Destination principale
            'madagascar' => ['madagascar island tropical', 'baobab avenue sunset', 'lemur wildlife exotic', 'nosy be beach paradise'],

            // Villes & Destinations Madagascar - AJOUT MASSIF
            'nosy_be' => ['nosy be madagascar beach', 'tropical island paradise nosy', 'nosy be resort luxury', 'beach paradise madagascar island'],
            'antananarivo' => ['antananarivo madagascar capital', 'tananarive city urban', 'madagascar capital cityscape', 'antananarivo architecture heritage'],
            'diego_suarez' => ['diego suarez madagascar', 'antsiranana port city', 'diego bay ocean', 'northern madagascar diego'],
            'antsiranana' => ['antsiranana madagascar north', 'diego suarez port', 'antsiranana bay beach', 'madagascar northern city'],
            'tamatave' => ['tamatave madagascar port', 'toamasina coastal city', 'tamatave beach ocean', 'east coast madagascar'],
            'toamasina' => ['toamasina madagascar east', 'tamatave port city', 'toamasina beach tropical', 'indian ocean madagascar'],
            'toliara' => ['toliara madagascar south', 'tulear beach coast', 'toliara coral reef', 'southern madagascar toliara'],
            'tulear' => ['tulear madagascar southwest', 'toliara beach paradise', 'tulear coastal city', 'madagascar tulear ocean'],
            'fianarantsoa' => ['fianarantsoa madagascar highlands', 'highland city madagascar', 'fianarantsoa culture heritage', 'central madagascar mountain'],
            'majunga' => ['majunga madagascar west', 'mahajanga baobab city', 'majunga bay sunset', 'west coast madagascar'],
            'mahajanga' => ['mahajanga madagascar coast', 'majunga beach sunset', 'mahajanga baobab trees', 'madagascar west port'],
            'morondava' => ['morondava madagascar baobab', 'avenue baobabs sunset', 'morondava beach coast', 'baobab alley madagascar'],
            'sainte_marie' => ['sainte marie madagascar island', 'ile sainte marie beach', 'nosy boraha paradise', 'sainte marie whale watching'],
            'andasibe' => ['andasibe rainforest madagascar', 'andasibe lemur forest', 'national park andasibe', 'madagascar jungle andasibe'],
            'isalo' => ['isalo national park madagascar', 'isalo canyon landscape', 'isalo sandstone formations', 'madagascar isalo hiking'],

            // Catégories Voyage Générales
            'beach' => ['tropical beach paradise', 'ocean waves sunset', 'sandy beach palm trees', 'turquoise lagoon vacation'],
            'plage' => ['beach tropical paradise', 'plage ocean sand', 'seaside beach resort', 'tropical beach vacation'],
            'island' => ['tropical island paradise', 'exotic island resort', 'island vacation getaway', 'remote island scenic'],
            'île' => ['tropical island paradise', 'ile exotic beach', 'island resort vacation', 'paradise island ocean'],
            'ocean' => ['ocean sea blue water', 'underwater marine life', 'ocean sunset waves', 'deep sea nature'],
            'océan' => ['ocean sea water waves', 'oceanic blue deep', 'ocean sunset beach', 'marine ocean life'],
            'mer' => ['sea ocean water', 'mer waves beach', 'seaside coast ocean', 'blue sea tropical'],
            'lagon' => ['lagoon turquoise water', 'tropical lagoon paradise', 'lagon beach island', 'crystal lagoon ocean'],
            'hotel' => ['luxury hotel resort', 'modern hotel room', 'resort pool tropical', 'boutique hotel elegant'],
            'hôtel' => ['hotel resort luxury', 'hotel room modern', 'boutique hotel elegant', 'hotel vacation accommodation'],
            'resort' => ['luxury resort hotel', 'beach resort tropical', 'resort spa wellness', 'vacation resort paradise'],
            'diving' => ['scuba diving underwater', 'coral reef ocean', 'diving adventure marine', 'snorkeling tropical water'],
            'plongée' => ['diving underwater scuba', 'plongee coral reef', 'diving ocean adventure', 'underwater exploration diving'],
            'safari' => ['safari wildlife adventure', 'african animals nature', 'safari jeep expedition', 'wild animals photography'],

            // Nature & Environment - NOUVELLE CATÉGORIE
            'nature' => ['nature landscape scenic', 'wilderness natural beauty', 'outdoor forest mountains', 'pristine nature wild'],
            'paysage' => ['landscape nature scenic', 'paysage panorama view', 'natural landscape mountain', 'scenic landscape beautiful'],
            'forest' => ['tropical forest jungle', 'woodland trees green', 'rainforest canopy nature', 'forest path hiking'],
            'forêt' => ['forest woodland trees', 'foret jungle tropical', 'rainforest green nature', 'forest landscape wild'],
            'jungle' => ['jungle rainforest tropical', 'dense jungle vegetation', 'jungle wildlife exotic', 'tropical jungle nature'],
            'mountain' => ['mountain peak landscape', 'alpine hiking adventure', 'mountain range scenic', 'snowy summit nature'],
            'montagne' => ['mountain peak summit', 'montagne alpine landscape', 'mountain range hiking', 'mountain nature scenic'],
            'cascade' => ['waterfall cascade nature', 'cascade flowing water', 'waterfall jungle tropical', 'cascade landscape scenic'],
            'waterfall' => ['waterfall cascade nature', 'tropical waterfall jungle', 'flowing water landscape', 'natural waterfall scenic'],
            'rivière' => ['river flowing water', 'riviere nature landscape', 'river stream scenic', 'water river natural'],
            'lac' => ['lake water mountain', 'lac nature reflection', 'scenic lake landscape', 'mountain lake peaceful'],

            // Faune & Animaux - AJOUT MASSIF
            'wildlife' => ['wildlife animals nature', 'safari wild photography', 'endangered species conservation', 'animal kingdom habitat'],
            'faune' => ['wildlife fauna animals', 'faune nature wild', 'animal wildlife habitat', 'fauna biodiversity nature'],
            'animaux' => ['animals wildlife nature', 'animaux fauna wild', 'animal kingdom habitat', 'wildlife animals exotic'],
            'lémurien' => ['lemur madagascar wildlife', 'lemurien primate cute', 'lemur animal exotic', 'madagascar lemur nature'],
            'lémuriens' => ['lemurs madagascar wildlife', 'lemuriens primates cute', 'lemurs animals exotic', 'madagascar lemurs nature'],
            'lemur' => ['lemur madagascar wildlife', 'cute lemur primate', 'lemur animal nature', 'madagascar lemur forest'],
            'baobab' => ['baobab tree madagascar', 'baobab avenue sunset', 'iconic baobab tree', 'madagascar baobab landscape'],
            'baobabs' => ['baobabs trees madagascar', 'baobab avenue sunset', 'baobabs landscape iconic', 'madagascar baobabs nature'],
            'biodiversité' => ['biodiversity nature wildlife', 'biodiversite ecosystem animals', 'nature biodiversity conservation', 'wildlife biodiversity habitat'],

            // Écologie & Environnement
            'ecology' => ['ecology environment green', 'sustainability nature eco', 'conservation planet earth', 'renewable energy sustainable'],
            'écologie' => ['ecology environment green', 'ecologie sustainability nature', 'ecological conservation earth', 'environment ecology sustainable'],
            'environnement' => ['environment nature ecology', 'environmental protection green', 'environnement sustainability planet', 'nature environment conservation'],

            // Health & Wellness - NOUVELLE CATÉGORIE
            'health' => ['health wellness lifestyle', 'medical healthcare modern', 'healthy living fitness', 'wellness center spa'],
            'santé' => ['health wellness medical', 'sante healthcare lifestyle', 'healthy living wellness', 'health medical care'],
            'fitness' => ['fitness gym workout', 'exercise training athletic', 'fitness equipment modern', 'muscle building strength'],
            'bien-être' => ['wellness wellbeing health', 'bien etre spa relaxation', 'wellness lifestyle healthy', 'wellbeing peace balance'],
            'bien_être' => ['wellness wellbeing health', 'bien etre relaxation spa', 'wellness healthy lifestyle', 'wellbeing balance peace'],
            'yoga' => ['yoga meditation wellness', 'yoga pose peaceful', 'mindfulness zen practice', 'yoga sunset beach'],
            'méditation' => ['meditation mindfulness zen', 'meditation yoga peaceful', 'meditation relaxation calm', 'mindfulness meditation wellness'],
            'nutrition' => ['nutrition healthy food', 'organic vegetables fresh', 'balanced diet wellness', 'superfood healthy eating'],
            'medical' => ['medical healthcare hospital', 'doctor professional care', 'medical technology modern', 'clinical treatment health'],
            'spa' => ['spa wellness relaxation', 'massage therapy luxury', 'spa resort peaceful', 'beauty treatment wellness'],

            // Education & Learning - NOUVELLE CATÉGORIE
            'education' => ['education learning school', 'study knowledge academic', 'classroom teaching modern', 'educational campus university'],
            'elearning' => ['online learning digital', 'virtual classroom education', 'mooc e-learning modern', 'remote learning technology'],
            'university' => ['university campus academic', 'college students learning', 'graduation education success', 'higher education modern'],
            'training' => ['professional training workshop', 'skill development learning', 'corporate training business', 'coaching mentoring growth'],

            // Arts & Culture - NOUVELLE CATÉGORIE
            'art' => ['art artistic creative', 'modern art gallery', 'painting artwork canvas', 'art studio creative'],
            'arts' => ['arts creative artistic', 'arts culture heritage', 'fine arts gallery', 'arts performance creative'],
            'artiste' => ['artist creative painter', 'artiste musician performer', 'artist sculptor designer', 'creative artist professional'],
            'music' => ['music concert performance', 'musician instrument playing', 'music festival live', 'music studio production'],
            'musique' => ['music concert performance', 'musique musician instrument', 'music festival live', 'musical performance sound'],
            'dance' => ['dance performance artistic', 'ballet choreography elegant', 'modern dance movement', 'dance studio practice'],
            'danse' => ['dance performance ballet', 'danse choreography artistic', 'dance movement elegant', 'dancer danse performance'],
            'culture' => ['culture heritage traditional', 'cultural festival celebration', 'traditional art cultural', 'ethnic culture diversity'],
            'culturel' => ['cultural heritage tradition', 'culturel festival arts', 'cultural event celebration', 'culture culturel diversity'],
            'photography' => ['photography camera professional', 'photographer studio creative', 'landscape photography nature', 'portrait photography artistic'],
            'design' => ['graphic design creative', 'designer workspace modern', 'ui design interface', 'interior design elegant'],
            'cinéma' => ['cinema film movie', 'cinema hall theater', 'film industry cinema', 'cinema production movie'],
            'théâtre' => ['theater stage performance', 'theatre drama acting', 'theater performance stage', 'theatrical theatre arts'],

            // Food & Gastronomy - NOUVELLE CATÉGORIE
            'food' => ['food cooking culinary', 'gourmet meal delicious', 'restaurant dining chef', 'food photography plate'],
            'nourriture' => ['food meal dish', 'nourriture cuisine cooking', 'food healthy organic', 'meal nourriture delicious'],
            'cuisine' => ['cooking culinary food', 'cuisine chef restaurant', 'cooking kitchen chef', 'culinary cuisine gourmet'],
            'culinaire' => ['culinary food cooking', 'culinaire chef gourmet', 'culinary art cuisine', 'cooking culinaire restaurant'],
            'restaurant' => ['restaurant fine dining', 'chef kitchen cooking', 'restaurant interior elegant', 'dining experience luxury'],
            'chef' => ['chef cooking professional', 'culinary chef kitchen', 'chef preparing food', 'cooking chef uniform'],
            'plat' => ['dish plate food', 'plat cuisine meal', 'food dish culinary', 'meal plat restaurant'],
            'plats' => ['dishes food meal', 'plats cuisine restaurant', 'food dishes culinary', 'meals plats gourmet'],
            'gastronomie' => ['gastronomy fine dining', 'gastronomie gourmet chef', 'culinary gastronomie cuisine', 'food gastronomie art'],
            'gastronomy' => ['gastronomy fine dining', 'gourmet cuisine art', 'culinary excellence chef', 'haute cuisine presentation'],
            'healthy_food' => ['healthy food organic', 'fresh vegetables salad', 'nutritious meal balanced', 'vegan food healthy'],
            'coffee' => ['coffee shop cafe', 'espresso latte art', 'barista coffee brewing', 'cafe culture lifestyle'],
            'café' => ['coffee shop cafe', 'cafe espresso barista', 'coffee cafe culture', 'cafe interior cozy'],

            // Sports & Fitness - NOUVELLE CATÉGORIE
            'sports' => ['sports athletic competition', 'sports training fitness', 'professional athletes game', 'sports event stadium'],
            'sport' => ['sports athletic fitness', 'sport training exercise', 'sports competition game', 'athletic sport activity'],
            'activité' => ['activity exercise fitness', 'activite sports physical', 'activity outdoor sports', 'fitness activity training'],
            'activités' => ['activities sports exercise', 'activites fitness outdoor', 'activities training sports', 'fitness activities physical'],
            'football' => ['football soccer match', 'soccer ball game', 'football stadium sports', 'football player athletic'],
            'running' => ['running marathon athlete', 'jogging outdoor fitness', 'running track sports', 'runner training athletic'],
            'course' => ['running race track', 'course marathon jogging', 'running sports course', 'race course athletic'],
            'cycling' => ['cycling biking outdoor', 'bicycle riding sports', 'mountain bike trail', 'cycling race athletic'],
            'vélo' => ['cycling bicycle bike', 'velo cycling sports', 'bicycle riding velo', 'bike cycling outdoor'],
            'natation' => ['swimming pool water', 'natation swimming sports', 'swimming athlete natation', 'pool natation fitness'],
            'musculation' => ['bodybuilding gym fitness', 'musculation strength training', 'gym musculation workout', 'bodybuilding musculation muscles'],

            // Real Estate & Home - NOUVELLE CATÉGORIE
            'real_estate' => ['real estate property', 'luxury home modern', 'apartment house residential', 'property investment market'],
            'architecture' => ['architecture modern building', 'architectural design structure', 'contemporary building design', 'building exterior modern'],
            'interior' => ['interior design modern', 'home decor stylish', 'living room elegant', 'furniture design contemporary'],

            // Fashion & Beauty - NOUVELLE CATÉGORIE
            'fashion' => ['fashion style model', 'clothing design trendy', 'fashion photography editorial', 'stylish outfit modern'],
            'mode' => ['fashion style clothing', 'mode trendy design', 'fashion mode outfit', 'style mode modern'],
            'beauty' => ['beauty cosmetics makeup', 'skincare beauty care', 'beauty products luxury', 'natural beauty portrait'],
            'beauté' => ['beauty cosmetics skincare', 'beaute makeup care', 'beauty beaute luxury', 'skincare beaute natural'],
            'lifestyle' => ['lifestyle modern living', 'lifestyle fashion wellness', 'modern lifestyle urban', 'lifestyle healthy living'],
            'mode_de_vie' => ['lifestyle living modern', 'mode de vie wellness', 'lifestyle mode de vie healthy', 'living mode de vie urban'],

            // Technology Home - NOUVELLE CATÉGORIE
            'smart_home' => ['smart home automation', 'connected devices iot', 'home technology modern', 'automated house digital'],

            // Entertainment & Gaming - NOUVELLE CATÉGORIE
            'gaming' => ['gaming video games', 'esports gamer setup', 'game console pc', 'gaming tournament competition'],
            'entertainment' => ['entertainment fun leisure', 'show performance stage', 'entertainment event party', 'amusement recreation fun'],

            // Default fallback
            'default' => ['professional business meeting', 'modern office workspace', 'team collaboration corporate', 'business success growth']
        ];

        return $smartKeywords[$domain] ?? $smartKeywords['default'];
    }

    /**
     * 🚀 MASSIVELY ENRICHED: Mots-clés alternatifs pour variations - 100+ ALTERNATIVES
     */
    private function getAlternativeKeywords(string $primaryKeyword): array
    {
        $alternatives = [
            // ========== Business & Corporate (20+ alternatives) ==========
            'business' => ['corporate', 'professional', 'company', 'office', 'enterprise', 'commercial', 'organizational', 'institutional', 'executive', 'managerial'],
            'startup' => ['new venture', 'entrepreneurial', 'emerging company', 'young business', 'innovation company', 'tech startup', 'scale-up', 'early-stage', 'founder-led', 'bootstrapped'],
            'corporate' => ['business', 'enterprise', 'company', 'organization', 'firm', 'corporation', 'conglomerate', 'institution', 'establishment', 'commercial entity'],
            'professional' => ['expert', 'specialist', 'skilled', 'qualified', 'certified', 'experienced', 'proficient', 'competent', 'trained', 'accomplished'],
            'office' => ['workplace', 'workspace', 'headquarters', 'business center', 'corporate office', 'work environment', 'professional space', 'business location', 'workstation', 'desk area'],

            // ========== Technology & Digital (20+ alternatives) ==========
            'technology' => ['digital', 'innovation', 'tech', 'modern', 'advanced', 'high-tech', 'cutting-edge', 'state-of-the-art', 'futuristic', 'technological'],
            'tech' => ['technology', 'digital', 'IT', 'information technology', 'computer', 'electronic', 'cyber', 'digital tech', 'tech solutions', 'technical'],
            'digital' => ['technology', 'electronic', 'virtual', 'online', 'cyber', 'computerized', 'tech-based', 'internet', 'web-based', 'digital-first'],
            'innovation' => ['breakthrough', 'advancement', 'progress', 'development', 'invention', 'creativity', 'pioneering', 'revolutionary', 'cutting-edge', 'novel'],
            'AI' => ['artificial intelligence', 'machine learning', 'smart technology', 'intelligent systems', 'neural networks', 'deep learning', 'cognitive computing', 'automated intelligence', 'smart AI'],
            'software' => ['program', 'application', 'app', 'platform', 'system', 'tool', 'solution', 'digital product', 'code', 'programming'],

            // ========== Marketing & Communication (20+ alternatives) ==========
            'marketing' => ['advertising', 'promotion', 'branding', 'communication', 'publicity', 'campaigning', 'messaging', 'outreach', 'engagement', 'marketing strategy'],
            'advertising' => ['marketing', 'promotion', 'publicity', 'commercials', 'ads', 'campaigns', 'promotional', 'ad campaign', 'brand awareness', 'marketing communications'],
            'branding' => ['brand identity', 'brand strategy', 'brand building', 'corporate identity', 'brand development', 'brand management', 'brand positioning', 'brand equity', 'brand image'],
            'social media' => ['social network', 'social platforms', 'online community', 'digital social', 'social channels', 'social networking', 'social engagement', 'social presence', 'online social'],
            'content' => ['material', 'information', 'media', 'creative', 'editorial', 'writing', 'copy', 'messaging', 'communication', 'published work'],

            // ========== Finance & Investment (15+ alternatives) ==========
            'finance' => ['money', 'investment', 'banking', 'financial', 'capital', 'funding', 'monetary', 'fiscal', 'economic', 'financial services'],
            'investment' => ['capital allocation', 'funding', 'financing', 'money placement', 'financial commitment', 'venture capital', 'equity investment', 'portfolio', 'asset management', 'financial investment'],
            'banking' => ['financial services', 'financial institution', 'money management', 'financial system', 'bank operations', 'financial services', 'commercial banking', 'retail banking', 'banking sector'],
            'money' => ['capital', 'finance', 'currency', 'funds', 'cash', 'wealth', 'financial resources', 'monetary', 'financial assets', 'liquidity'],

            // ========== Health & Wellness (20+ alternatives) ==========
            'health' => ['wellness', 'medical', 'fitness', 'care', 'wellbeing', 'healthcare', 'health services', 'medical care', 'health management', 'healthy living'],
            'wellness' => ['health', 'wellbeing', 'fitness', 'holistic health', 'lifestyle', 'self-care', 'healthy living', 'mind-body', 'preventive health', 'wellness lifestyle'],
            'medical' => ['healthcare', 'clinical', 'health services', 'medicine', 'medical care', 'health professional', 'medical treatment', 'healthcare services', 'medical practice'],
            'fitness' => ['exercise', 'workout', 'physical fitness', 'training', 'gym', 'athletic', 'physical activity', 'health fitness', 'body conditioning', 'fitness training'],
            'yoga' => ['meditation', 'mindfulness', 'wellness practice', 'mind-body', 'spiritual practice', 'yoga practice', 'holistic exercise', 'yoga meditation', 'zen practice'],

            // ========== Education & Learning (15+ alternatives) ==========
            'education' => ['learning', 'training', 'knowledge', 'academic', 'schooling', 'instruction', 'teaching', 'educational', 'studies', 'scholarly'],
            'learning' => ['education', 'knowledge acquisition', 'studying', 'skill development', 'training', 'educational', 'knowledge building', 'learning process', 'education system'],
            'training' => ['education', 'instruction', 'skill building', 'development', 'coaching', 'workshop', 'learning program', 'professional development', 'skill training'],
            'academic' => ['scholarly', 'educational', 'university', 'college', 'educational institution', 'higher education', 'school', 'learning institution', 'scholarly pursuit'],

            // ========== Travel & Tourism (50+ alternatives avec FRANÇAIS + MADAGASCAR) ==========
            'travel' => ['tourism', 'journey', 'trip', 'vacation', 'exploration', 'adventure', 'voyage', 'expedition', 'wanderlust', 'traveling'],
            'voyage' => ['travel', 'journey', 'trip', 'adventure', 'expedition', 'exploration', 'traveling', 'wanderlust', 'tour', 'voyage trip'],
            'tourisme' => ['tourism', 'travel', 'sightseeing', 'vacation', 'tourist', 'travel industry', 'tourism sector', 'tourist activity', 'destination tourism'],
            'tourism' => ['travel', 'sightseeing', 'vacation', 'holiday', 'tourist activity', 'travel industry', 'destination travel', 'tourism sector', 'tourist experience'],
            'vacances' => ['vacation', 'holiday', 'break', 'getaway', 'leisure', 'time off', 'holiday break', 'vacation time', 'summer vacation'],
            'vacation' => ['holiday', 'break', 'getaway', 'trip', 'leisure time', 'time off', 'rest period', 'vacation time', 'holiday break', 'travel vacation'],
            'destination' => ['travel spot', 'vacation destination', 'tourist destination', 'travel location', 'destination spot', 'journey destination', 'travel destination', 'vacation spot'],

            // Madagascar & Villes
            'madagascar' => ['Malagasy', 'island Madagascar', 'tropical Madagascar', 'exotic Madagascar', 'African island', 'Madagascar island', 'Madagascar destination', 'Madagascar tourism'],
            'nosy_be' => ['Nosy Be Madagascar', 'paradise island', 'beach paradise', 'tropical island', 'island resort', 'Nosy Be beach', 'exotic island', 'island paradise'],
            'nosy be' => ['Nosy Be Madagascar', 'paradise island', 'beach paradise', 'tropical island', 'island resort', 'Nosy Be beach', 'exotic island', 'island paradise'],
            'antananarivo' => ['Tananarive', 'Madagascar capital', 'capital city', 'Antananarivo city', 'Madagascar capital city', 'urban Madagascar', 'city Madagascar'],
            'diego suarez' => ['Antsiranana', 'Diego Madagascar', 'northern Madagascar', 'port city', 'Diego bay', 'Madagascar north', 'coastal city'],
            'tamatave' => ['Toamasina', 'east coast Madagascar', 'Madagascar port', 'coastal city', 'Indian ocean city', 'Madagascar coast', 'port city'],
            'toliara' => ['Tuléar', 'southern Madagascar', 'Madagascar south', 'coastal Madagascar', 'Toliara beach', 'south coast', 'Madagascar southwest'],
            'fianarantsoa' => ['Madagascar highlands', 'highland city', 'central Madagascar', 'Madagascar mountains', 'cultural Madagascar', 'Madagascar heritage'],
            'majunga' => ['Mahajanga', 'west coast Madagascar', 'Madagascar west', 'baobab city', 'western Madagascar', 'Majunga bay', 'coastal west'],
            'morondava' => ['Avenue Baobabs', 'baobab alley', 'Madagascar baobab', 'west Madagascar', 'Morondava beach', 'baobab avenue', 'iconic Madagascar'],

            // Plages & Îles
            'beach' => ['seaside', 'coast', 'shore', 'ocean front', 'waterfront', 'coastal', 'beachfront', 'sandy beach', 'tropical beach', 'beach paradise'],
            'plage' => ['beach', 'seaside', 'shore', 'coast', 'sandy beach', 'tropical beach', 'beach paradise', 'ocean beach', 'coastal beach'],
            'island' => ['tropical island', 'isle', 'remote island', 'island paradise', 'island destination', 'exotic island', 'island retreat', 'island getaway'],
            'île' => ['island', 'isle', 'tropical island', 'island paradise', 'exotic island', 'remote island', 'island destination', 'island retreat'],
            'ocean' => ['sea', 'marine', 'oceanfront', 'oceanic', 'ocean water', 'deep ocean', 'ocean view', 'blue ocean', 'ocean waves'],
            'océan' => ['ocean', 'sea', 'marine', 'oceanic', 'ocean water', 'deep sea', 'ocean view', 'blue ocean', 'ocean waves'],
            'mer' => ['sea', 'ocean', 'marine', 'sea water', 'seaside', 'sea waves', 'blue sea', 'sea coast', 'sea ocean'],
            'lagon' => ['lagoon', 'turquoise lagoon', 'tropical lagoon', 'crystal lagoon', 'lagoon water', 'island lagoon', 'lagoon paradise'],
            'hotel' => ['resort', 'accommodation', 'lodging', 'hospitality', 'hotel resort', 'hotel accommodation', 'vacation hotel', 'boutique hotel'],
            'hôtel' => ['hotel', 'resort', 'accommodation', 'lodging', 'hotel resort', 'vacation hotel', 'boutique hotel', 'luxury hotel'],
            'plongée' => ['diving', 'scuba diving', 'underwater diving', 'dive', 'diving adventure', 'ocean diving', 'underwater exploration'],
            'safari' => ['wildlife safari', 'animal watching', 'nature expedition', 'wildlife tour', 'safari adventure', 'game drive', 'wildlife exploration'],

            // ========== Nature & Environment (40+ alternatives avec FRANÇAIS) ==========
            'nature' => ['natural', 'environment', 'outdoors', 'wilderness', 'natural world', 'eco', 'ecological', 'environmental', 'natural environment', 'nature landscapes'],
            'paysage' => ['landscape', 'scenery', 'view', 'natural landscape', 'scenic', 'panorama', 'landscape nature', 'scenic view', 'natural scenery'],
            'environment' => ['nature', 'ecosystem', 'habitat', 'surroundings', 'natural environment', 'environmental', 'ecological system', 'biosphere', 'natural world'],
            'environnement' => ['environment', 'nature', 'ecosystem', 'environmental', 'natural environment', 'surroundings', 'ecological', 'habitat'],
            'eco' => ['ecological', 'environmental', 'green', 'sustainable', 'eco-friendly', 'earth-friendly', 'environmentally conscious', 'green living', 'sustainability'],
            'écologie' => ['ecology', 'environmental', 'ecosystem', 'ecological', 'green', 'sustainability', 'environmental protection', 'eco-friendly'],
            'green' => ['eco-friendly', 'environmental', 'sustainable', 'ecological', 'earth-friendly', 'environmentally responsible', 'green living', 'eco-conscious'],
            'forest' => ['woodland', 'jungle', 'rainforest', 'woods', 'forest nature', 'tropical forest', 'forest trees', 'dense forest'],
            'forêt' => ['forest', 'woodland', 'jungle', 'rainforest', 'forest nature', 'tropical forest', 'woods', 'forest trees'],
            'jungle' => ['rainforest', 'tropical jungle', 'dense jungle', 'jungle forest', 'tropical rainforest', 'jungle nature', 'exotic jungle'],
            'mountain' => ['peak', 'summit', 'alpine', 'mountain range', 'mountainous', 'mountain peak', 'high mountain', 'mountain landscape'],
            'montagne' => ['mountain', 'peak', 'summit', 'alpine', 'mountain range', 'mountain nature', 'mountain landscape', 'high altitude'],
            'cascade' => ['waterfall', 'falling water', 'waterfall cascade', 'natural waterfall', 'water cascade', 'cascade nature', 'waterfall nature'],
            'rivière' => ['river', 'stream', 'flowing river', 'river water', 'river nature', 'water river', 'river stream', 'natural river'],
            'lac' => ['lake', 'pond', 'lake water', 'mountain lake', 'natural lake', 'lake nature', 'scenic lake', 'water lake'],

            // Faune & Animaux
            'wildlife' => ['fauna', 'animals', 'wild animals', 'animal wildlife', 'nature wildlife', 'animal kingdom', 'wildlife nature', 'wild fauna'],
            'faune' => ['fauna', 'wildlife', 'animals', 'wild animals', 'animal fauna', 'wildlife fauna', 'nature fauna', 'animal wildlife'],
            'animaux' => ['animals', 'wildlife', 'fauna', 'wild animals', 'animal kingdom', 'animal wildlife', 'nature animals', 'animal fauna'],
            'lemur' => ['lemur Madagascar', 'primate', 'lemur wildlife', 'Madagascar lemur', 'cute lemur', 'lemur animal', 'endemic lemur'],
            'lémurien' => ['lemur', 'primate', 'lemur Madagascar', 'Madagascar primate', 'lemur wildlife', 'cute lemur', 'lemur nature'],
            'lémuriens' => ['lemurs', 'primates', 'Madagascar lemurs', 'lemurs wildlife', 'cute lemurs', 'lemurs nature', 'lemur family'],
            'baobab' => ['baobab tree', 'baobab Madagascar', 'iconic tree', 'giant tree', 'baobab avenue', 'African tree', 'tree baobab'],
            'baobabs' => ['baobab trees', 'baobabs Madagascar', 'avenue baobabs', 'baobab forest', 'iconic baobabs', 'giant baobabs', 'baobab landscape'],
            'biodiversité' => ['biodiversity', 'species diversity', 'wildlife diversity', 'ecosystem diversity', 'nature biodiversity', 'biological diversity'],

            // ========== Arts & Culture (30+ alternatives avec FRANÇAIS) ==========
            'art' => ['artistic', 'creative', 'artwork', 'artistic expression', 'visual art', 'fine art', 'creative art', 'artistic creation', 'art form', 'artistic work'],
            'arts' => ['fine arts', 'creative arts', 'visual arts', 'performing arts', 'arts culture', 'artistic', 'arts expression', 'arts creation'],
            'artiste' => ['artist', 'creative artist', 'artist painter', 'artist musician', 'artist performer', 'artist creator', 'professional artist', 'artistic creator'],
            'culture' => ['cultural', 'tradition', 'heritage', 'customs', 'cultural heritage', 'traditions', 'cultural identity', 'cultural expression', 'cultural practices'],
            'culturel' => ['cultural', 'culture', 'cultural heritage', 'cultural tradition', 'cultural event', 'traditional cultural', 'cultural diversity', 'cultural expression'],
            'music' => ['musical', 'sound', 'melody', 'musical art', 'music creation', 'musical expression', 'sound art', 'musical performance', 'music industry'],
            'musique' => ['music', 'musical', 'sound', 'melody', 'music performance', 'musical art', 'music concert', 'musical expression', 'sound music'],
            'dance' => ['dancing', 'ballet', 'choreography', 'dance performance', 'dance art', 'dance movement', 'dance expression', 'dancing performance'],
            'danse' => ['dance', 'dancing', 'ballet', 'choreography', 'dance performance', 'dance art', 'dance movement', 'dancing art'],
            'cinema' => ['film', 'movie', 'filmmaking', 'cinema industry', 'film production', 'movie cinema', 'cinema art', 'film industry'],
            'cinéma' => ['cinema', 'film', 'movie', 'filmmaking', 'cinema industry', 'film production', 'movie cinema', 'cinema art'],
            'théâtre' => ['theater', 'theatre', 'stage', 'theatrical', 'theater performance', 'drama', 'stage performance', 'theatrical arts'],
            'creative' => ['artistic', 'imaginative', 'innovative', 'original', 'inventive', 'creative work', 'creative expression', 'artistic creation', 'creative design'],

            // ========== Food & Gastronomy (30+ alternatives avec FRANÇAIS) ==========
            'food' => ['cuisine', 'culinary', 'gastronomy', 'dining', 'meals', 'food industry', 'culinary arts', 'food culture', 'gastronomy', 'food service'],
            'nourriture' => ['food', 'meal', 'cuisine', 'culinary', 'food meal', 'food dish', 'dining food', 'meal food', 'food cuisine'],
            'cuisine' => ['cooking', 'culinary', 'food cuisine', 'gastronomy', 'culinary art', 'cuisine cooking', 'food preparation', 'culinary cuisine'],
            'culinaire' => ['culinary', 'cooking', 'culinary art', 'culinary chef', 'cuisine', 'food culinary', 'culinary food', 'culinary cooking'],
            'restaurant' => ['dining', 'eatery', 'dining establishment', 'food service', 'dining venue', 'food restaurant', 'culinary establishment', 'dining experience'],
            'plat' => ['dish', 'meal dish', 'food dish', 'cuisine dish', 'dish food', 'meal', 'dish cuisine', 'food meal'],
            'plats' => ['dishes', 'meals dishes', 'food dishes', 'cuisine dishes', 'dishes food', 'meals', 'dishes cuisine', 'food meals'],
            'gastronomie' => ['gastronomy', 'gourmet', 'fine dining', 'culinary art', 'gastronomy cuisine', 'gourmet food', 'culinary gastronomy', 'fine cuisine'],
            'cooking' => ['culinary', 'food preparation', 'cuisine', 'culinary arts', 'food cooking', 'meal preparation', 'kitchen work', 'culinary creation'],
            'chef' => ['cook', 'culinary expert', 'culinary professional', 'kitchen chef', 'head cook', 'culinary artist', 'professional chef', 'master chef'],
            'café' => ['cafe', 'coffee shop', 'coffee cafe', 'cafe coffee', 'coffee house', 'cafe culture', 'espresso cafe', 'barista cafe'],

            // ========== Health & Wellness (20+ alternatives avec FRANÇAIS) ==========
            'santé' => ['health', 'wellness', 'medical', 'healthcare', 'healthy', 'health care', 'wellbeing', 'health lifestyle', 'health wellness'],
            'bien-être' => ['wellbeing', 'wellness', 'health', 'self-care', 'healthy lifestyle', 'wellness lifestyle', 'wellbeing health', 'wellness wellbeing'],
            'bien_être' => ['wellbeing', 'wellness', 'health', 'self-care', 'wellness lifestyle', 'healthy living', 'wellbeing wellness', 'wellness health'],
            'méditation' => ['meditation', 'mindfulness', 'zen', 'meditation practice', 'meditation yoga', 'relaxation meditation', 'peaceful meditation', 'meditation mindfulness'],

            // ========== Sports & Fitness (20+ alternatives avec FRANÇAIS) ==========
            'sport' => ['sports', 'athletic', 'sports activity', 'sport fitness', 'sports training', 'athletic sport', 'sport competition', 'sports exercise'],
            'activité' => ['activity', 'sports activity', 'fitness activity', 'exercise activity', 'activity fitness', 'physical activity', 'activity sports', 'exercise'],
            'activités' => ['activities', 'sports activities', 'fitness activities', 'exercise activities', 'activities fitness', 'physical activities', 'activities sports'],
            'course' => ['running', 'race', 'marathon', 'running race', 'race running', 'course marathon', 'running track', 'race track'],
            'vélo' => ['cycling', 'bicycle', 'bike', 'cycling sport', 'bicycle cycling', 'bike cycling', 'cycling velo', 'cycling bicycle'],
            'natation' => ['swimming', 'swimming pool', 'swimmer', 'swimming sport', 'pool swimming', 'swimming natation', 'swimming fitness'],
            'musculation' => ['bodybuilding', 'gym', 'strength training', 'bodybuilding gym', 'gym training', 'musculation fitness', 'strength bodybuilding'],

            // ========== Fashion & Lifestyle (10+ alternatives avec FRANÇAIS) ==========
            'mode' => ['fashion', 'style', 'clothing', 'fashion mode', 'trendy', 'fashion design', 'mode style', 'fashion style'],
            'beauté' => ['beauty', 'cosmetics', 'makeup', 'beauty care', 'beauty products', 'skincare', 'beauty cosmetics', 'beauty makeup'],
            'lifestyle' => ['modern lifestyle', 'lifestyle fashion', 'lifestyle wellness', 'urban lifestyle', 'lifestyle living', 'healthy lifestyle', 'lifestyle modern'],
            'mode_de_vie' => ['lifestyle', 'lifestyle living', 'lifestyle wellness', 'lifestyle modern', 'healthy lifestyle', 'lifestyle healthy', 'living lifestyle'],

            // Default
            'default' => ['professional', 'modern', 'quality', 'excellent', 'superior', 'premium', 'top-tier', 'high-quality', 'outstanding', 'exceptional']
        ];

        return $alternatives[$primaryKeyword] ?? $alternatives['default'];
    }

    /**
     * ✅ MÉTHODES PRÉSERVÉES MAIS AMÉLIORÉES
     */
    private function getDomainKeywords(string $domain): array
    {
        $domainKeywords = [
            // Technology & Digital
            'tech' => ['technology', 'digital', 'innovation', 'software', 'computer', 'coding', 'developer', 'tech stack', 'IT infrastructure', 'cloud computing'],
            'programming' => ['programming', 'code', 'developer', 'software engineer', 'coding workspace', 'IDE', 'debugging', 'algorithm', 'software development', 'programming language'],
            'ai' => ['artificial intelligence', 'AI', 'machine learning', 'neural network', 'deep learning', 'robotics', 'automation', 'AI technology', 'data science', 'intelligent systems'],
            'blockchain' => ['blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'crypto', 'distributed ledger', 'decentralized', 'smart contracts', 'NFT', 'web3'],
            'cloud' => ['cloud computing', 'cloud server', 'cloud storage', 'data center', 'server room', 'infrastructure', 'cloud technology', 'SaaS', 'cloud architecture', 'cloud services'],
            'mobile' => ['mobile app', 'smartphone', 'mobile development', 'app development', 'iOS', 'Android', 'mobile technology', 'tablet', 'mobile UI', 'responsive design'],
            'cybersecurity' => ['cybersecurity', 'security', 'data protection', 'encryption', 'firewall', 'security audit', 'hacking prevention', 'secure network', 'cyber defense', 'information security'],
            'data' => ['data analytics', 'big data', 'data science', 'data visualization', 'database', 'data analysis', 'statistics', 'business intelligence', 'data mining', 'data engineering'],
            'iot' => ['Internet of Things', 'IoT', 'connected devices', 'smart devices', 'sensors', 'smart home', 'IoT technology', 'embedded systems', 'automation', 'connected technology'],
            'vr' => ['virtual reality', 'VR', 'augmented reality', 'AR', 'metaverse', 'immersive technology', '3D technology', 'VR headset', 'virtual world', 'mixed reality'],

            // Business & Corporate
            'business' => ['business', 'professional', 'corporate', 'office', 'meeting', 'conference room', 'business strategy', 'teamwork', 'collaboration', 'corporate culture'],
            'startup' => ['startup', 'entrepreneur', 'innovation', 'business launch', 'startup team', 'incubator', 'venture', 'pitch', 'entrepreneurship', 'startup culture'],
            'finance' => ['finance', 'money', 'investment', 'banking', 'financial', 'stock market', 'portfolio', 'wealth', 'financial planning', 'capital'],
            'fintech' => ['fintech', 'digital banking', 'mobile payment', 'financial technology', 'digital wallet', 'payment system', 'online banking', 'financial innovation', 'digital finance', 'payment gateway'],
            'ecommerce' => ['e-commerce', 'online shopping', 'online store', 'digital marketplace', 'shopping cart', 'product catalog', 'online retail', 'e-business', 'digital commerce', 'online sales'],
            'management' => ['management', 'leadership', 'team leader', 'project management', 'strategic planning', 'business management', 'executive', 'manager', 'organizational leadership', 'corporate governance'],
            'consulting' => ['consulting', 'business consultant', 'advisory', 'strategy consulting', 'professional services', 'business advice', 'consulting firm', 'expert advice', 'management consulting', 'business solutions'],
            'hr' => ['human resources', 'HR', 'recruitment', 'hiring', 'employee', 'talent management', 'team building', 'workplace culture', 'HR management', 'personnel'],

            // Marketing & Communication
            'marketing' => ['marketing', 'advertising', 'brand', 'promotion', 'social', 'marketing campaign', 'digital marketing', 'marketing strategy', 'brand identity', 'customer engagement'],
            'social_media' => ['social media', 'social network', 'online community', 'influencer', 'content creator', 'social marketing', 'engagement', 'social platform', 'viral content', 'social presence'],
            'content' => ['content creation', 'content marketing', 'storytelling', 'creative content', 'content strategy', 'blogging', 'digital content', 'media production', 'content writer', 'editorial'],
            'seo' => ['SEO', 'search engine optimization', 'Google ranking', 'web traffic', 'keyword research', 'organic search', 'search visibility', 'SEO strategy', 'search marketing', 'web optimization'],
            'branding' => ['branding', 'brand identity', 'logo design', 'brand strategy', 'brand awareness', 'corporate identity', 'brand positioning', 'visual identity', 'brand experience', 'brand management'],
            'advertising' => ['advertising', 'ad campaign', 'commercial', 'billboard', 'digital ads', 'advertisement', 'promotional', 'ad creative', 'media buying', 'advertising strategy'],
            'pr' => ['public relations', 'PR', 'media relations', 'press release', 'communications', 'reputation management', 'media coverage', 'PR campaign', 'corporate communications', 'publicity'],

            // Travel & Tourism - Madagascar Focus
            'travel' => ['travel', 'vacation', 'tourism', 'destination', 'adventure', 'journey', 'explorer', 'travel destination', 'wanderlust', 'world travel'],
            'voyage' => ['travel', 'voyage', 'journey', 'trip', 'adventure', 'vacation', 'exploration', 'travel destination', 'wanderlust', 'expedition'],
            'tourisme' => ['tourism', 'travel', 'vacation', 'tourist', 'sightseeing', 'travel industry', 'tourism destination', 'tourist attraction', 'tourism sector'],
            'vacances' => ['vacation', 'holiday', 'vacances', 'getaway', 'break', 'leisure', 'travel vacation', 'holiday trip', 'summer vacation'],
            'destination' => ['destination', 'travel destination', 'vacation spot', 'tourist destination', 'vacation destination', 'travel spot', 'journey destination', 'exotic destination'],
            'madagascar' => ['Madagascar', 'Malagasy', 'island paradise', 'tropical Madagascar', 'exotic destination', 'African island', 'Madagascar wildlife', 'Madagascar culture', 'Antananarivo', 'Madagascar tourism'],

            // Madagascar Cities & Destinations
            'nosy_be' => ['Nosy Be', 'Nosy Be Madagascar', 'paradise island', 'beach paradise', 'tropical island resort', 'Nosy Be beach', 'island getaway', 'Madagascar beach destination', 'exotic island', 'Nosy Be tourism'],
            'antananarivo' => ['Antananarivo', 'Tananarive', 'Antananarivo Madagascar', 'Madagascar capital', 'capital city Madagascar', 'Antananarivo cityscape', 'Tananarive city', 'Madagascar capital city', 'Antananarivo architecture'],
            'diego' => ['Diego Suarez', 'Antsiranana', 'Diego Madagascar', 'northern Madagascar', 'Diego bay', 'Madagascar port city', 'tropical city', 'Diego beach', 'Madagascar north', 'coastal city Madagascar'],
            'diego_suarez' => ['Diego Suarez', 'Antsiranana', 'Diego Madagascar', 'northern Madagascar port', 'Diego bay ocean', 'Madagascar north city', 'Diego tropical', 'Diego Suarez beach'],
            'antsiranana' => ['Antsiranana', 'Diego Suarez', 'Antsiranana Madagascar', 'northern Madagascar', 'Antsiranana port', 'Diego bay', 'Madagascar north coast', 'Antsiranana beach'],
            'tamatave' => ['Tamatave', 'Toamasina', 'Tamatave Madagascar', 'east coast Madagascar', 'Madagascar port', 'Tamatave beach', 'coastal city', 'Indian ocean city', 'Madagascar coast', 'tropical port'],
            'toamasina' => ['Toamasina', 'Tamatave', 'Toamasina Madagascar', 'east coast port', 'Madagascar east', 'Toamasina beach', 'Indian Ocean Madagascar', 'Toamasina tropical'],
            'toliara' => ['Toliara', 'Tuléar', 'Toliara Madagascar', 'southern Madagascar', 'Toliara beach', 'Madagascar southwest', 'tropical south', 'Toliara coast', 'Madagascar reef', 'coral reef Toliara'],
            'tulear' => ['Tuléar', 'Toliara', 'Tulear Madagascar', 'south Madagascar', 'Tulear beach paradise', 'Madagascar southwest coast', 'Tulear coral reef', 'Tulear tropical'],
            'fianarantsoa' => ['Fianarantsoa', 'Fianarantsoa Madagascar', 'Madagascar highlands', 'highland city', 'cultural city Madagascar', 'Fianarantsoa culture', 'Madagascar mountains', 'historic Madagascar', 'central Madagascar', 'Madagascar heritage'],
            'majunga' => ['Majunga', 'Mahajanga', 'Majunga Madagascar', 'west coast Madagascar', 'Majunga beach', 'Madagascar west', 'baobab city', 'Majunga bay', 'tropical west', 'Madagascar sunset'],
            'mahajanga' => ['Mahajanga', 'Majunga', 'Mahajanga Madagascar', 'west coast port', 'Madagascar west bay', 'Mahajanga baobab', 'Mahajanga sunset', 'Madagascar coastal city'],
            'morondava' => ['Morondava', 'Morondava Madagascar', 'Avenue of Baobabs', 'baobab alley', 'iconic Madagascar', 'Morondava beach', 'west Madagascar', 'baobab trees', 'Madagascar landscape', 'sunset baobabs'],
            'sainte_marie' => ['Sainte Marie', 'Ile Sainte Marie', 'Nosy Boraha', 'Madagascar island', 'pirate island', 'tropical paradise', 'Sainte Marie beach', 'whale watching', 'Madagascar east coast', 'island resort Madagascar'],
            'andasibe' => ['Andasibe', 'Andasibe Madagascar', 'rainforest Madagascar', 'lemur forest', 'Andasibe national park', 'Madagascar jungle', 'wildlife reserve', 'lemur habitat', 'tropical rainforest', 'nature reserve Madagascar'],
            'isalo' => ['Isalo', 'Isalo National Park', 'Isalo Madagascar', 'canyon Madagascar', 'sandstone formations', 'Madagascar desert', 'Isalo landscape', 'hiking Madagascar', 'rock formations', 'natural park Madagascar'],

            // General Travel Categories
            'beach' => ['beach', 'tropical beach', 'paradise beach', 'ocean', 'seaside', 'sandy beach', 'beach resort', 'coastal', 'beach vacation', 'turquoise water'],
            'plage' => ['beach', 'plage', 'sandy beach', 'tropical beach', 'beach paradise', 'ocean beach', 'seaside', 'beach resort', 'coastal beach', 'plage tropicale'],
            'island' => ['island', 'tropical island', 'island paradise', 'island getaway', 'remote island', 'island vacation', 'island resort', 'exotic island', 'island life', 'archipelago'],
            'île' => ['island', 'ile', 'tropical island', 'island paradise', 'exotic island', 'paradise ile', 'island resort', 'remote island', 'île tropicale'],
            'ocean' => ['ocean', 'sea', 'marine', 'underwater', 'coral reef', 'ocean view', 'deep blue', 'ocean waves', 'marine life', 'oceanfront'],
            'océan' => ['ocean', 'ocean', 'sea water', 'marine ocean', 'ocean waves', 'deep ocean', 'ocean view', 'blue ocean', 'oceanfront', 'ocean marine'],
            'mer' => ['sea', 'ocean', 'mer', 'sea water', 'ocean sea', 'seaside', 'marine', 'sea waves', 'blue sea', 'mer ocean'],
            'lagon' => ['lagoon', 'lagon', 'turquoise lagoon', 'tropical lagoon', 'lagoon paradise', 'crystal lagoon', 'beach lagoon', 'lagon turquoise', 'island lagoon'],
            'hotel' => ['hotel', 'resort', 'luxury hotel', 'accommodation', 'boutique hotel', 'hotel room', 'hospitality', 'hotel service', 'vacation resort', 'beach resort'],
            'hôtel' => ['hotel', 'hotel', 'luxury hotel', 'resort hotel', 'boutique hotel', 'hotel accommodation', 'hotel room', 'vacation hotel', 'beach hotel'],
            'resort' => ['resort', 'luxury resort', 'beach resort', 'vacation resort', 'resort hotel', 'tropical resort', 'resort spa', 'resort paradise', 'resort accommodation'],
            'diving' => ['scuba diving', 'underwater diving', 'coral reef', 'marine exploration', 'diving equipment', 'dive site', 'underwater photography', 'ocean diving', 'diving adventure', 'underwater world'],
            'plongée' => ['diving', 'scuba diving', 'plongee', 'underwater diving', 'diving adventure', 'ocean diving', 'coral reef diving', 'plongée sous-marine', 'dive exploration'],
            'safari' => ['safari', 'wildlife safari', 'animal watching', 'nature expedition', 'African safari', 'wildlife tour', 'safari adventure', 'game drive', 'wildlife exploration', 'safari experience'],

            // Nature & Environment
            'nature' => ['nature', 'natural', 'wilderness', 'outdoor', 'landscape', 'natural beauty', 'pristine nature', 'nature photography', 'scenic', 'natural environment'],
            'paysage' => ['landscape', 'paysage', 'scenery', 'natural landscape', 'scenic view', 'landscape nature', 'panorama', 'landscape photography', 'natural scenery', 'paysage naturel'],
            'forest' => ['forest', 'jungle', 'rainforest', 'tropical forest', 'woodland', 'trees', 'forest landscape', 'dense forest', 'forest ecosystem', 'nature reserve'],
            'forêt' => ['forest', 'foret', 'woodland', 'jungle', 'rainforest', 'forest trees', 'forest nature', 'tropical forest', 'forest landscape', 'forêt tropicale'],
            'jungle' => ['jungle', 'tropical jungle', 'rainforest', 'dense jungle', 'jungle wildlife', 'jungle nature', 'exotic jungle', 'jungle vegetation', 'tropical rainforest'],
            'mountain' => ['mountain', 'peak', 'mountain range', 'hiking', 'alpine', 'mountain landscape', 'summit', 'mountaineering', 'mountain adventure', 'high altitude'],
            'montagne' => ['mountain', 'montagne', 'mountain peak', 'alpine', 'mountain range', 'summit', 'mountain landscape', 'hiking mountain', 'montagne alpine', 'mountain nature'],
            'cascade' => ['waterfall', 'cascade', 'waterfall nature', 'falling water', 'cascade waterfall', 'natural waterfall', 'waterfall landscape', 'tropical waterfall', 'cascade nature'],
            'rivière' => ['river', 'riviere', 'flowing river', 'river water', 'river nature', 'river landscape', 'river stream', 'natural river', 'rivière naturelle'],
            'lac' => ['lake', 'lac', 'mountain lake', 'lake water', 'natural lake', 'lake landscape', 'scenic lake', 'lake nature', 'lac montagne', 'peaceful lake'],
            'wildlife' => ['wildlife', 'animals', 'fauna', 'wild animals', 'animal habitat', 'wildlife photography', 'biodiversity', 'endangered species', 'animal conservation', 'natural habitat'],
            'faune' => ['fauna', 'faune', 'wildlife', 'animals', 'wild fauna', 'animal wildlife', 'fauna nature', 'wildlife habitat', 'faune sauvage', 'biodiversity'],
            'animaux' => ['animals', 'animaux', 'wildlife', 'fauna', 'wild animals', 'animal nature', 'animal wildlife', 'animal habitat', 'animaux sauvages', 'animal kingdom'],
            'ecology' => ['ecology', 'ecosystem', 'environmental', 'sustainability', 'conservation', 'biodiversity', 'ecological balance', 'environmental protection', 'green planet', 'eco-friendly'],
            'écologie' => ['ecology', 'ecologie', 'environmental', 'ecosystem', 'ecological', 'sustainability', 'conservation', 'green ecology', 'écologie environnement', 'environmental protection'],
            'environnement' => ['environment', 'environnement', 'nature', 'environmental', 'ecosystem', 'natural environment', 'environmental protection', 'green environment', 'environnement naturel'],
            'biodiversité' => ['biodiversity', 'biodiversite', 'wildlife diversity', 'ecosystem', 'nature biodiversity', 'species diversity', 'natural biodiversity', 'biodiversité nature', 'animal biodiversity'],
            'lemur' => ['lemur', 'lemur Madagascar', 'primate', 'endemic species', 'ring-tailed lemur', 'wildlife Madagascar', 'cute lemur', 'lemur habitat', 'lemur conservation', 'Malagasy wildlife'],
            'lémurien' => ['lemur', 'lemurien', 'Madagascar lemur', 'primate', 'lemur wildlife', 'cute lemur', 'lemur nature', 'Madagascar primate', 'lémurien Madagascar', 'lemur habitat'],
            'lémuriens' => ['lemurs', 'lemuriens', 'Madagascar lemurs', 'primates', 'lemurs wildlife', 'cute lemurs', 'lemurs nature', 'Madagascar wildlife', 'lémuriens Madagascar', 'lemur family'],
            'baobab' => ['baobab tree', 'baobab Madagascar', 'African tree', 'iconic tree', 'giant tree', 'baobab avenue', 'ancient tree', 'Madagascar landscape', 'baobab forest', 'tree of life'],
            'baobabs' => ['baobab trees', 'baobabs', 'baobabs Madagascar', 'avenue baobabs', 'baobab forest', 'iconic baobabs', 'baobabs landscape', 'baobabs avenue', 'Madagascar baobabs', 'giant baobabs'],

            // Health & Wellness
            'health' => ['health', 'medical', 'wellness', 'fitness', 'healthcare', 'healthy lifestyle', 'health care', 'medical care', 'wellbeing', 'health management'],
            'santé' => ['health', 'sante', 'wellness', 'medical', 'healthcare', 'healthy', 'health care', 'wellbeing', 'santé bien-être', 'health lifestyle'],
            'fitness' => ['fitness', 'gym', 'workout', 'exercise', 'training', 'fitness training', 'physical fitness', 'strength training', 'cardio', 'fitness lifestyle'],
            'bien-être' => ['wellbeing', 'bien etre', 'wellness', 'health', 'relaxation', 'healthy lifestyle', 'self-care', 'wellness lifestyle', 'bien-être santé', 'wellbeing health'],
            'bien_être' => ['wellbeing', 'bien etre', 'wellness', 'health', 'relaxation', 'wellness lifestyle', 'healthy living', 'self-care', 'wellbeing wellness'],
            'yoga' => ['yoga', 'meditation', 'mindfulness', 'yoga practice', 'zen', 'yoga pose', 'relaxation', 'spiritual wellness', 'yoga session', 'inner peace'],
            'méditation' => ['meditation', 'meditation', 'mindfulness', 'zen', 'meditation practice', 'meditation yoga', 'relaxation', 'peaceful meditation', 'méditation zen'],
            'nutrition' => ['nutrition', 'healthy eating', 'diet', 'nutritious food', 'balanced diet', 'food nutrition', 'healthy food', 'nutritional wellness', 'dietary', 'organic food'],
            'medical' => ['medical', 'hospital', 'doctor', 'healthcare professional', 'medical treatment', 'clinical', 'patient care', 'medical technology', 'health service', 'medical facility'],
            'spa' => ['spa', 'wellness spa', 'relaxation', 'spa treatment', 'massage', 'spa resort', 'beauty spa', 'spa therapy', 'wellness retreat', 'spa experience'],
            'mental_health' => ['mental health', 'psychology', 'therapy', 'mental wellness', 'emotional health', 'stress relief', 'mindfulness', 'mental care', 'counseling', 'psychological wellbeing'],

            // Education & Learning
            'education' => ['education', 'learning', 'study', 'academic', 'knowledge', 'educational', 'student', 'school', 'learning environment', 'teaching'],
            'elearning' => ['e-learning', 'online education', 'digital learning', 'online course', 'virtual classroom', 'distance learning', 'online training', 'educational technology', 'remote learning', 'digital education'],
            'university' => ['university', 'college', 'higher education', 'campus', 'academic institution', 'university life', 'college student', 'academia', 'university campus', 'graduate school'],
            'training' => ['training', 'professional training', 'skill development', 'workshop', 'training program', 'learning session', 'corporate training', 'training course', 'skill training', 'education program'],
            'research' => ['research', 'scientific research', 'laboratory', 'innovation', 'academic research', 'research project', 'scientific study', 'research development', 'data research', 'research facility'],
            'library' => ['library', 'books', 'reading', 'knowledge center', 'library books', 'study space', 'book collection', 'public library', 'digital library', 'literature'],

            // Arts & Culture
            'art' => ['art', 'artwork', 'artistic', 'creative art', 'fine art', 'contemporary art', 'art gallery', 'visual art', 'art exhibition', 'art creation'],
            'arts' => ['arts', 'creative arts', 'fine arts', 'arts culture', 'artistic', 'arts gallery', 'arts performance', 'arts exhibition', 'visual arts', 'arts creative'],
            'artiste' => ['artist', 'artiste', 'creative artist', 'artist painter', 'artist musician', 'artist performer', 'artist creator', 'professional artist', 'artiste créatif'],
            'music' => ['music', 'musical', 'concert', 'musician', 'music performance', 'live music', 'music festival', 'musical instrument', 'music production', 'sound'],
            'musique' => ['music', 'musique', 'concert', 'musician', 'music performance', 'musical', 'music festival', 'musique concert', 'music sound', 'musique live'],
            'dance' => ['dance', 'dancing', 'ballet', 'dance performance', 'choreography', 'dancer', 'dance studio', 'traditional dance', 'modern dance', 'dance art'],
            'danse' => ['dance', 'danse', 'ballet', 'dance performance', 'dancing', 'dancer', 'dance choreography', 'danse performance', 'dance studio', 'danse ballet'],
            'culture' => ['culture', 'cultural', 'tradition', 'heritage', 'cultural heritage', 'local culture', 'cultural diversity', 'traditional culture', 'cultural event', 'cultural experience'],
            'culturel' => ['cultural', 'culturel', 'culture', 'cultural heritage', 'cultural tradition', 'cultural event', 'culturel tradition', 'cultural diversity', 'culturel arts'],
            'photography' => ['photography', 'camera', 'photographer', 'photo shoot', 'professional photography', 'digital photography', 'photo art', 'landscape photography', 'portrait photography', 'photo studio'],
            'design' => ['design', 'graphic design', 'creative design', 'designer', 'design studio', 'visual design', 'modern design', 'design concept', 'interior design', 'product design'],
            'cinema' => ['cinema', 'film', 'movie', 'filmmaking', 'movie production', 'cinema hall', 'film industry', 'movie theater', 'cinematic', 'film festival'],
            'cinéma' => ['cinema', 'cinema', 'film', 'movie', 'cinema hall', 'film production', 'cinema industry', 'cinéma movie', 'film cinéma', 'cinema theater'],
            'theater' => ['theater', 'stage', 'theatrical performance', 'drama', 'theater production', 'acting', 'stage performance', 'theater arts', 'live performance', 'playhouse'],
            'théâtre' => ['theater', 'theatre', 'stage', 'theatrical', 'theater performance', 'drama', 'stage performance', 'théâtre scene', 'theater arts', 'théâtre drama'],

            // Food & Gastronomy
            'food' => ['food', 'restaurant', 'cuisine', 'cooking', 'chef', 'culinary', 'gourmet', 'dining', 'food preparation', 'delicious food'],
            'nourriture' => ['food', 'nourriture', 'meal', 'food dish', 'healthy food', 'nourriture cuisine', 'food cooking', 'nourriture meal', 'food dining'],
            'cuisine' => ['cooking', 'cuisine', 'culinary', 'food cuisine', 'cooking chef', 'cuisine restaurant', 'culinary cuisine', 'cooking food', 'cuisine gourmet'],
            'culinaire' => ['culinary', 'culinaire', 'cooking', 'culinary art', 'culinary chef', 'cuisine culinaire', 'culinary food', 'culinaire gourmet', 'culinary cuisine'],
            'restaurant' => ['restaurant', 'dining', 'fine dining', 'restaurant interior', 'eatery', 'bistro', 'restaurant service', 'culinary experience', 'restaurant ambiance', 'food service'],
            'chef' => ['chef', 'cook', 'culinary chef', 'professional chef', 'cooking expert', 'kitchen chef', 'master chef', 'chef cooking', 'culinary artist', 'head chef'],
            'plat' => ['dish', 'plat', 'food dish', 'meal dish', 'cuisine dish', 'plat cuisine', 'dish food', 'plat restaurant', 'dish meal', 'plat gourmet'],
            'plats' => ['dishes', 'plats', 'food dishes', 'meal dishes', 'cuisine dishes', 'plats cuisine', 'dishes food', 'plats restaurant', 'dishes meal'],
            'gastronomie' => ['gastronomy', 'gastronomie', 'gourmet', 'fine dining', 'culinary art', 'gastronomie cuisine', 'gastronomy chef', 'gastronomie gourmet', 'culinary gastronomy'],
            'gastronomy' => ['gastronomy', 'gourmet food', 'fine cuisine', 'culinary art', 'gastronomic', 'haute cuisine', 'food culture', 'culinary tradition', 'gourmet dining', 'food excellence'],
            'healthy_food' => ['healthy food', 'organic food', 'fresh food', 'nutritious meal', 'healthy eating', 'clean eating', 'whole foods', 'natural food', 'healthy cuisine', 'wellness food'],
            'coffee' => ['coffee', 'cafe', 'espresso', 'coffee shop', 'barista', 'coffee culture', 'coffee brewing', 'specialty coffee', 'coffee beans', 'coffee house'],
            'café' => ['cafe', 'cafe', 'coffee shop', 'coffee cafe', 'cafe espresso', 'cafe coffee', 'coffee house', 'cafe culture', 'cafe barista'],
            'bakery' => ['bakery', 'bread', 'pastry', 'baking', 'bakery shop', 'fresh bread', 'artisan bakery', 'baked goods', 'pastry shop', 'bakehouse'],

            // Sports & Fitness
            'sports' => ['sports', 'athletics', 'competition', 'sporting event', 'sports activity', 'athletic performance', 'sports training', 'professional sports', 'team sports', 'sports arena'],
            'sport' => ['sports', 'sport', 'athletic', 'sports activity', 'sport fitness', 'sports training', 'athletic sport', 'sport competition', 'sports exercise'],
            'activité' => ['activity', 'activite', 'sports activity', 'fitness activity', 'exercise activity', 'activité sports', 'activity fitness', 'activité physique', 'physical activity'],
            'activités' => ['activities', 'activites', 'sports activities', 'fitness activities', 'exercise activities', 'activités sports', 'activities fitness', 'activités physiques'],
            'football' => ['football', 'soccer', 'soccer match', 'football stadium', 'football game', 'soccer player', 'football team', 'soccer field', 'football training', 'soccer ball'],
            'running' => ['running', 'jogging', 'marathon', 'runner', 'running track', 'running shoes', 'outdoor running', 'running fitness', 'running competition', 'athletic running'],
            'course' => ['running', 'course', 'race', 'marathon', 'running race', 'course running', 'race running', 'course marathon', 'running track', 'course athletics'],
            'cycling' => ['cycling', 'bicycle', 'bike ride', 'cyclist', 'mountain biking', 'road cycling', 'bike race', 'cycling tour', 'bicycle sport', 'cycling fitness'],
            'vélo' => ['cycling', 'velo', 'bicycle', 'bike', 'cycling velo', 'velo bicycle', 'bike cycling', 'vélo cycling', 'cycling sport', 'velo bike'],
            'natation' => ['swimming', 'natation', 'swimming pool', 'swimmer', 'natation swimming', 'swimming natation', 'pool swimming', 'natation pool', 'swimming sport'],
            'musculation' => ['bodybuilding', 'musculation', 'gym', 'strength training', 'bodybuilding gym', 'musculation fitness', 'gym musculation', 'musculation training', 'strength musculation'],
            'swimming' => ['swimming', 'pool', 'swimmer', 'swimming pool', 'aquatic sports', 'swimming competition', 'lap swimming', 'swimming training', 'water sports', 'swimming fitness'],
            'basketball' => ['basketball', 'basketball court', 'basketball game', 'basketball player', 'NBA', 'basketball match', 'basketball training', 'basketball team', 'hoops', 'basketball arena'],

            // Real Estate & Architecture
            'real_estate' => ['real estate', 'property', 'housing', 'real estate market', 'property investment', 'real estate business', 'home selling', 'property development', 'real estate agent', 'residential property'],
            'architecture' => ['architecture', 'building', 'architectural design', 'modern architecture', 'architect', 'building structure', 'architectural style', 'construction', 'urban architecture', 'building design'],
            'interior' => ['interior design', 'home interior', 'interior decoration', 'interior space', 'modern interior', 'luxury interior', 'interior designer', 'home decor', 'interior styling', 'room design'],
            'construction' => ['construction', 'building construction', 'construction site', 'infrastructure', 'construction project', 'building development', 'construction work', 'engineering construction', 'construction industry', 'building process'],

            // Fashion & Beauty
            'fashion' => ['fashion', 'style', 'clothing', 'fashion design', 'trendy fashion', 'fashion industry', 'fashion model', 'haute couture', 'fashion show', 'designer fashion'],
            'mode' => ['fashion', 'mode', 'style', 'clothing', 'fashion mode', 'mode fashion', 'trendy mode', 'mode style', 'fashion design', 'mode clothing'],
            'beauty' => ['beauty', 'cosmetics', 'makeup', 'beauty care', 'beauty products', 'skincare', 'beauty industry', 'beauty salon', 'beauty treatment', 'beauty routine'],
            'beauté' => ['beauty', 'beaute', 'cosmetics', 'makeup', 'beauty beaute', 'beauté care', 'beauty products', 'beauté cosmetics', 'skincare beauté', 'beaute makeup'],
            'lifestyle' => ['lifestyle', 'modern lifestyle', 'lifestyle fashion', 'lifestyle wellness', 'urban lifestyle', 'lifestyle living', 'healthy lifestyle', 'lifestyle modern'],
            'mode_de_vie' => ['lifestyle', 'mode de vie', 'lifestyle living', 'mode de vie wellness', 'lifestyle modern', 'healthy lifestyle', 'mode de vie healthy', 'living lifestyle'],
            'luxury' => ['luxury', 'premium', 'exclusive', 'luxury lifestyle', 'high-end', 'luxury brand', 'luxury experience', 'elegant', 'luxury goods', 'opulent'],

            // Technology Products
            'smart_home' => ['smart home', 'home automation', 'smart devices', 'IoT home', 'connected home', 'smart technology', 'home tech', 'automated home', 'smart living', 'intelligent home'],
            'wearable' => ['wearable technology', 'smartwatch', 'fitness tracker', 'wearable device', 'smart wearable', 'wearable tech', 'health wearable', 'smart band', 'wearable gadget', 'connected wearable'],

            // Entertainment & Gaming
            'gaming' => ['gaming', 'video games', 'gamer', 'esports', 'gaming console', 'gaming setup', 'online gaming', 'game development', 'gaming industry', 'gaming culture'],
            'entertainment' => ['entertainment', 'fun', 'leisure', 'entertainment industry', 'show', 'performance', 'entertainment event', 'amusement', 'entertainment venue', 'live entertainment'],
            'event' => ['event', 'conference', 'seminar', 'event planning', 'corporate event', 'event management', 'special event', 'event venue', 'event organization', 'professional event'],

            // Default fallback
            'default' => ['business', 'professional', 'corporate', 'modern', 'success', 'team', 'growth', 'strategy', 'innovation', 'leadership']
        ];

        return $domainKeywords[$domain] ?? $domainKeywords['default'];
    }

    private function getManualKeywords(string $domain): array
    {
        return $this->getSmartDomainKeywords($domain);
    }

    /**
     * ✅ NOUVEAU : Génération de mots-clés intelligents pour recherche d'images
     */
    private function generateIntelligentKeywords(string $domain, string $content, string $dayContext = 'general'): array
    {
        try {
            // Réutiliser la logique existante de l'analyse contextuelle
            return $this->extractDeepContentKeywords($content, $domain, $dayContext);
        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur génération keywords intelligents, fallback domaine", [
                'domain' => $domain,
                'error' => $e->getMessage()
            ]);
            
            // Fallback vers keywords du domaine
            return $this->getSmartDomainKeywords($domain);
        }
    }

    /**
     * ✅ NOUVEAU : Génération d'image unique avec variation basée sur seed
     */
    private function getUniqueVariationImage(string $domain, string $uniqueSeed): array
    {
        try {
            Log::info("🎯 Génération image variation unique", [
                'domain' => $domain,
                'seed' => substr($uniqueSeed, 0, 20)
            ]);

            // Utiliser le système contextuel existant avec le seed
            $fallbackResult = $this->getContextualFallbackImage($domain, "unique variation content", $uniqueSeed);
            
            if ($fallbackResult['success']) {
                return $fallbackResult;
            }

            // 🔥 PAS DE PICSUM - Les URLs Picsum changent à chaque refresh !
            // Utiliser des images Pexels FIXES par domaine comme fallback absolu

            $fixedPexelsImages = [
                'madagascar' => 'https://images.pexels.com/photos/4666748/pexels-photo-4666748.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'travel' => 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'beach' => 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'island' => 'https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'ocean' => 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'nature' => 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'forest' => 'https://images.pexels.com/photos/957024/pexels-photo-957024.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'mountain' => 'https://images.pexels.com/photos/618833/pexels-photo-618833.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'wildlife' => 'https://images.pexels.com/photos/247502/pexels-photo-247502.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'tech' => 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'programming' => 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'ai' => 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'business' => 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'startup' => 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'finance' => 'https://images.pexels.com/photos/259027/pexels-photo-259027.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'marketing' => 'https://images.pexels.com/photos/7413915/pexels-photo-7413915.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'health' => 'https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'fitness' => 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'yoga' => 'https://images.pexels.com/photos/3822668/pexels-photo-3822668.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'food' => 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'restaurant' => 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'education' => 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'art' => 'https://images.pexels.com/photos/1109354/pexels-photo-1109354.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'music' => 'https://images.pexels.com/photos/210922/pexels-photo-210922.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'sports' => 'https://images.pexels.com/photos/248547/pexels-photo-248547.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'fashion' => 'https://images.pexels.com/photos/291762/pexels-photo-291762.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'real_estate' => 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'default' => 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
            ];

            $fallbackUrl = $fixedPexelsImages[$domain] ?? $fixedPexelsImages['default'];

            Log::info("✅ Image variation unique avec Pexels FIXE par domaine", [
                'domain' => $domain,
                'seed' => substr($uniqueSeed, 0, 20),
                'fallback_url' => substr($fallbackUrl, 0, 80) . '...',
                'note' => 'Fixed Pexels image - will NOT change on refresh'
            ]);

            return [
                'success' => true,
                'image_url' => $fallbackUrl,
                'source' => 'pexels_fixed_domain_fallback',
                'domain' => $domain
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération image variation unique", [
                'domain' => $domain,
                'error' => $e->getMessage()
            ]);

            // 🔥 Fallback absolu avec Pexels FIXE - PAS DE PICSUM !
            return [
                'success' => true,
                'image_url' => 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&fit=crop',
                'source' => 'pexels_absolute_fallback'
            ];
        }
    }

    /**
     * ✅ AMÉLIORATION : Optimiser image pour plateforme avec variation
     */
    public function optimizeImageForPlatform(string $imageUrl, string $platform, string $uniqueSeed = null): string
    {
        // 🔥 SUPPRIMÉ: Plus de support Picsum car les URLs changent à chaque refresh
        // Les URLs Pexels sont déjà optimisées avec les bons paramètres

        // Si c'est une URL Pexels, ajuster les dimensions pour la plateforme
        if (strpos($imageUrl, 'pexels.com') !== false) {
            $dimensions = $this->getPlatformDimensions($platform);
            list($width, $height) = explode('/', $dimensions);

            // Remplacer les dimensions dans l'URL Pexels
            $optimizedUrl = preg_replace('/w=\d+/', "w={$width}", $imageUrl);
            $optimizedUrl = preg_replace('/h=\d+/', "h={$height}", $optimizedUrl);

            return $optimizedUrl;
        }

        // Pour autres URLs, retourner tel quel
        return $imageUrl;
    }

    private function getPlatformDimensions(string $platform): string
    {
        $dimensions = [
            'instagram' => '1080/1080',
            'facebook' => '1200/630',
            'twitter' => '1024/512',
            'linkedin' => '1200/627'
        ];

        return $dimensions[$platform] ?? '1200/600';
    }
}
