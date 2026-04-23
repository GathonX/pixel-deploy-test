<?php

namespace App\Services\ContentGeneration;

use App\Services\OpenAI\OpenAIService;
use App\Services\ContentGeneration\ImageContextService;
use Illuminate\Support\Facades\Log;

class SocialContentGenerator
{
    private OpenAIService $openAIService;
    private ImageContextService $imageContextService;

    // Limites de caractères par plateforme
    private const PLATFORM_LIMITS = [
        'twitter' => 280,
        'facebook' => 2000,
        'instagram' => 2200,
        'linkedin' => 3000,
    ];

    public function __construct(OpenAIService $openAIService, ImageContextService $imageContextService)
    {
        $this->openAIService = $openAIService;
        $this->imageContextService = $imageContextService;
    }

    /**
     * ✅ Générer contenu social à partir d'un objectif hebdomadaire
     */
    public function generateContentFromObjective(array $objective, string $platform, array $context = []): array
    {
        try {
            $prompt = $this->buildSocialPromptFromObjective($objective, $platform, $context);

            $messages = [
                [
                    'role' => 'system',
                    'content' => 'Tu es un expert en création de contenu pour réseaux sociaux en FRANÇAIS. Tu génères du contenu professionnel, engageant et adapté à chaque plateforme. Le contenu doit être substantiel et de qualité. Réponds uniquement en JSON valide.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ];

            $response = OpenAIService::generateChatCompletion(
                $messages,
                'gpt-3.5-turbo',
                800, // Plus de tokens pour contenu plus riche
                0.95 // ✅ Température très élevée pour maximum de variation et originalité
            );

            if (isset($response['error'])) {
                return [
                    'success' => false,
                    'error' => $response['error']
                ];
            }

            $content = $response['choices'][0]['message']['content'] ?? '';
            $parsedContent = $this->parseAndOptimizeContent($content, $platform);

            // Générer images cohérentes avec Pexels (pas aléatoires)
            $images = $this->generateCoherentImages($platform, $parsedContent, $context);
            $parsedContent['images'] = $images;

            return [
                'success' => true,
                'data' => [
                    'content' => $parsedContent['content'],
                    'platform' => $platform,
                    'hashtags' => isset($objective['keywords']) ? $objective['keywords'] : [],
                    'images' => $images,
                    'objective_used' => $objective
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération social depuis objectif", ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la génération social depuis objectif'
            ];
        }
    }

    /**
     * ✅ Construire prompt basé sur objectif social - FRANÇAIS FORCÉ
     */
    private function buildSocialPromptFromObjective(array $objective, string $platform, array $context): string
    {
        $theme = isset($objective['theme']) ? $objective['theme'] : (isset($objective['title']) ? $objective['title'] : '');
        $keywords = implode(', ', isset($objective['keywords']) ? $objective['keywords'] : []);
        $platformStrategy = isset($objective['platform_strategy']) ? $objective['platform_strategy'] : 'Stratégie générale';
        $dayName = isset($objective['day_name']) ? $objective['day_name'] : '';
        $dayIndex = isset($objective['day_index']) ? $objective['day_index'] : 0;
        $variationSeed = isset($objective['variation_seed']) ? $objective['variation_seed'] : '';
        $projectContext = isset($context['project_context']) ? $context['project_context'] : '';

        $limit = isset(self::PLATFORM_LIMITS[$platform]) ? self::PLATFORM_LIMITS[$platform] : 1000;

        return "GÉNÈRE UN POST {$platform} PROFESSIONNEL EN FRANÇAIS basé sur cet objectif hebdomadaire :

THÈME DE LA SEMAINE : {$theme}
JOUR : {$dayName} (Post #{$dayIndex} de la semaine)
PLATEFORME : {$platform}
STRATÉGIE PLATEFORME : {$platformStrategy}
HASHTAGS/MOTS-CLÉS: {$keywords}
CONTEXTE PROJET: {$projectContext}
IDENTIFIANT UNIQUE : {$variationSeed}

⚠️ ANTI-DUPLICATION CRITIQUE :
- Ce post doit être TOTALEMENT DIFFÉRENT des autres posts de la semaine
- NE JAMAIS répéter les mêmes phrases, titres ou formulations
- Chaque post doit avoir son propre message UNIQUE
- Varier les accroches, les exemples, les appels à l'action
- NE PAS utiliser des formules génériques comme \"Participez à notre concours\"
- Créer un contenu ORIGINAL et SPÉCIFIQUE à ce jour et cette plateforme

EXIGENCES STRICTES :
- LANGUE : Français uniquement, grammaire parfaite
- LIMITE CARACTÈRES: {$limit}
- STYLE : Professionnel mais engageant pour {$platform}
- VALEUR : Apporte une vraie valeur ajoutée
- CALL-TO-ACTION : Inclus un appel à l'action pertinent et UNIQUE
- HASHTAGS : En français et pertinents au secteur
- COHÉRENCE : Reste cohérent avec le thème de la semaine mais adapté à {$platform}

FORMAT JSON REQUIS:
{
  \"content\": \"Texte du post UNIQUE optimisé en français pour {$platform} (contenu substantiel et professionnel)\",
  \"hashtags\": [\"#hashtag1\", \"#hashtag2\", \"#hashtag3\"],
  \"call_to_action\": \"Appel à l'action UNIQUE en français\"
}

Génère un contenu TOTALEMENT ORIGINAL pour ce jour et cette plateforme spécifique.";
    }

    /**
     * ✅ Générer des images cohérentes avec le contenu (PAS ALÉATOIRES)
     */
    private function generateCoherentImages(string $platform, array $content, array $context): array
    {
        try {
            // ✅ CORRECTION : Détecter domaine automatiquement comme pour blog
            $detectedDomain = $this->detectDomainFromContent($content, $context);
            $imageCount = $this->getImageCountForPlatform($platform);

            if ($imageCount === 0) {
                return [];
            }

            // ✅ CORRECTION : Seed ULTRA-unique basé sur contenu + plateforme + timestamp
            $dayOfWeek = date('l');
            $contentForSeed = ($content['content'] ?? '') . ($platform ?? '') . microtime(true);
            $contentHash = md5($contentForSeed);
            $platformHash = substr(md5($platform), 0, 8);
            $timestampMicro = microtime(true);
            $uniqueSeed = date('Y-m-d-H-i-s') . '_' . $contentHash . '_' . $platformHash . '_' . $timestampMicro . '_' . uniqid('social_', true);

            Log::info("🖼️ Génération images cohérentes pour social avec seed unique", [
                'platform' => $platform,
                'detected_domain' => $detectedDomain,
                'count' => $imageCount,
                'content_hash' => substr($contentHash, 0, 10),
                'unique_seed' => substr($uniqueSeed, 0, 30),
                'day_of_week' => $dayOfWeek
            ]);

            // Utiliser le service intelligent avec ImageContextService
            if ($imageCount === 1) {
                $imageResult = $this->imageContextService->generateCoherentImage(
                    $detectedDomain,
                    isset($content['content']) ? $content['content'] : '',
                    [
                        'platform' => $platform,
                        'keywords' => isset($content['hashtags']) ? $content['hashtags'] : [],
                        'unique_seed' => $uniqueSeed,  // ✅ Seed vraiment unique par post
                        'day_context' => $dayOfWeek,   // ✅ Contexte du jour
                        'post_type' => 'social_' . $platform,  // ✅ Type spécifique par plateforme
                        'platform_specific' => $this->getPlatformSpecificKeywords($platform) // ✅ Keywords spécifiques
                    ]
                );

                if ($imageResult['success'] && !empty($imageResult['image_url'])) {
                    Log::info("✅ Image cohérente générée", [
                        'platform' => $platform,
                        'image_url' => $imageResult['image_url']
                    ]);
                    return [$imageResult['image_url']];
                }
            }

            // Fallback - Utiliser PexelsService directement pour cohérence
            Log::info("🔄 Fallback vers Pexels pour cohérence", ['platform' => $platform]);
            return $this->generatePexelsCoherentImages($platform, $content, $context);

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur images cohérentes, fallback Pexels", [
                'platform' => $platform,
                'error' => $e->getMessage()
            ]);

            return $this->generatePexelsCoherentImages($platform, $content, $context);
        }
    }

    /**
     * ✅ Générer images Pexels cohérentes (PAS Picsum aléatoires)
     */
    private function generatePexelsCoherentImages(string $platform, array $content, array $context): array
    {
        $imageCount = $this->getImageCountForPlatform($platform);
        if ($imageCount === 0) return [];

        try {
            // Extraire mots-clés du contenu pour recherche cohérente
            $searchTerms = $this->extractImageKeywords($content, $context);

            Log::info("🔍 Recherche Pexels avec mots-clés cohérents", [
                'platform' => $platform,
                'search_terms' => $searchTerms
            ]);

            // Appel direct au PexelsService pour recherche cohérente
            $pexelsService = app('App\Services\ContentGeneration\PexelsService');

            if ($pexelsService) {
                $images = $pexelsService->searchCoherentImages(
                    $searchTerms,
                    $imageCount,
                    ['orientation' => 'landscape']
                );

                if (!empty($images)) {
                    Log::info("✅ Images Pexels cohérentes trouvées", [
                        'platform' => $platform,
                        'count' => count($images)
                    ]);
                    return $images;
                }
            }

            // Ultime fallback si Pexels échoue
            Log::warning("⚠️ Pexels échoué, fallback images génériques", ['platform' => $platform]);
            return $this->getGenericBusinessImages($platform, $imageCount);

        } catch (\Exception $e) {
            Log::error("❌ Erreur Pexels cohérent", [
                'platform' => $platform,
                'error' => $e->getMessage()
            ]);

            return $this->getGenericBusinessImages($platform, $imageCount);
        }
    }

    /**
     * ✅ Extraire mots-clés pour recherche d'images cohérentes
     */
    private function extractImageKeywords(array $content, array $context): string
    {
        $keywords = [];

        // Mots-clés du contexte
        if (isset($context['domain'])) {
            $keywords[] = $context['domain'];
        }

        // Mots-clés des hashtags
        if (isset($content['hashtags']) && is_array($content['hashtags'])) {
            foreach ($content['hashtags'] as $tag) {
                $keywords[] = str_replace('#', '', $tag);
            }
        }

        // Mots-clés du contenu
        if (isset($content['content'])) {
            $businessWords = ['business', 'entreprise', 'professionnel', 'travail', 'équipe', 'bureau', 'meeting', 'stratégie'];
            foreach ($businessWords as $word) {
                if (stripos($content['content'], $word) !== false) {
                    $keywords[] = $word;
                }
            }
        }

        // Default keywords si rien trouvé
        if (empty($keywords)) {
            $keywords = ['business', 'professional', 'corporate'];
        }

        return implode(' ', array_slice($keywords, 0, 3));
    }

    /**
     * ✅ NOUVEAU : Keywords spécifiques par plateforme pour diversifier les images
     */
    private function getPlatformSpecificKeywords(string $platform): array
    {
        $platformKeywords = [
            'facebook' => ['community', 'network', 'social', 'engagement', 'discussion'],
            'instagram' => ['visual', 'lifestyle', 'inspiration', 'creative', 'aesthetic'], 
            'twitter' => ['trending', 'news', 'update', 'conversation', 'realtime'],
            'linkedin' => ['professional', 'career', 'networking', 'industry', 'business']
        ];
        
        return $platformKeywords[$platform] ?? ['social', 'media', 'content'];
    }

    /**
     * ✅ CORRIGÉ : Images business contextuelles avec seed unique (pas fixes)
     */
    private function getGenericBusinessImages(string $platform, int $count): array
    {
        if ($count === 0) return [];

        // ✅ Générer seed unique pour éviter duplication
        $contentHash = md5($platform . microtime(true));
        $uniqueSeed = date('Y-m-d-H-i-s') . '_' . $contentHash . '_fallback';

        Log::info("📋 Génération images business contextuelles avec seed unique", [
            'platform' => $platform,
            'count' => $count,
            'unique_seed' => substr($uniqueSeed, 0, 30)
        ]);

        // ✅ Utiliser ImageContextService même pour fallback
        $imageContextService = app(ImageContextService::class);
        
        $images = [];
        for ($i = 0; $i < $count; $i++) {
            $imageSeed = $uniqueSeed . '_img_' . $i;
            
            $fallbackResult = $imageContextService->getContextualFallbackImage(
                'business', // Domaine par défaut
                "professional business content for {$platform}", // Contenu générique
                $imageSeed
            );
            
            if ($fallbackResult['success']) {
                $images[] = $fallbackResult['image_url'];
                
                Log::debug("🖼️ Image business contextuelle générée", [
                    'platform' => $platform,
                    'image_index' => $i,
                    'image_seed' => substr($imageSeed, 0, 20),
                    'url' => substr($fallbackResult['image_url'], 0, 50) . '...'
                ]);
            }
        }

        // ✅ Fallback ultime si ImageContextService échoue
        if (empty($images)) {
            $hashNumber = hexdec(substr(md5($uniqueSeed), 0, 8));
            $dimensions = $this->getPlatformDimensions($platform);
            
            for ($i = 0; $i < $count; $i++) {
                $imageId = 5000 + ($hashNumber % 500) + ($i * 10); // Business range 5000-5500
                $imageUrl = "https://picsum.photos/{$dimensions}?random={$imageId}";
                $images[] = $imageUrl;
            }
            
            Log::warning("⚠️ Fallback ultime vers Picsum pour images business", [
                'platform' => $platform,
                'images_generated' => count($images)
            ]);
        }

        return $images;
    }

    /**
     * ✅ Dimensions par plateforme
     */
    private function getPlatformDimensions(string $platform): string
    {
        $dimensions = [
            'instagram' => '1080/1080', // Carré
            'facebook' => '1200/630',   // Rectangle
            'twitter' => '1024/512',    // Rectangle Twitter
            'linkedin' => '1200/627',   // Rectangle LinkedIn
        ];

        return isset($dimensions[$platform]) ? $dimensions[$platform] : '1200/600';
    }

    /**
     * ✅ Nombre d'images selon la plateforme
     */
    private function getImageCountForPlatform(string $platform): int
    {
        $imageSettings = [
            'twitter' => 1,      // 1 image principale
            'facebook' => 1,     // 1 image d'accroche
            'instagram' => 1,    // 1 image (Instagram est très visuel)
            'linkedin' => 1,     // 1 image professionnelle
        ];

        return isset($imageSettings[$platform]) ? $imageSettings[$platform] : 1;
    }

    /**
     * ✅ Parser et optimiser le contenu pour la plateforme
     */
    private function parseAndOptimizeContent(string $content, string $platform): array
    {
        // Nettoyer le contenu pour extraire le JSON
        $content = trim($content);
        $content = preg_replace('/^```json\s*/', '', $content);
        $content = preg_replace('/\s*```$/', '', $content);

        $decoded = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning("⚠️ Erreur JSON social, fallback français", [
                'platform' => $platform,
                'json_error' => json_last_error_msg(),
                'content_preview' => substr($content, 0, 100)
            ]);
            return $this->createFallbackFrenchContent($content, $platform);
        }

        $result = [
            'content' => isset($decoded['content']) ? $this->ensureFrenchContent($decoded['content']) : '',
            'hashtags' => isset($decoded['hashtags']) ? $decoded['hashtags'] : [],
            'call_to_action' => isset($decoded['call_to_action']) ? $decoded['call_to_action'] : ''
        ];

        // Optimiser pour la plateforme
        $result = $this->optimizeForPlatform($result, $platform);

        return $result;
    }

    /**
     * ✅ S'assurer que le contenu est en français
     */
    private function ensureFrenchContent(string $content): string
    {
        $frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'dans', 'pour', 'avec', 'être', 'avoir', 'entreprise'];
        $hasFrenchWords = false;

        foreach ($frenchWords as $word) {
            if (stripos($content, $word) !== false) {
                $hasFrenchWords = true;
                break;
            }
        }

        if (!$hasFrenchWords) {
            Log::warning("⚠️ Contenu social non-français détecté, correction");
            return "💼 Développez votre entreprise avec des stratégies innovantes et efficaces. 📈 Restez à l'avant-garde de votre secteur !";
        }

        return $content;
    }

    /**
     * ✅ Optimiser le contenu pour une plateforme spécifique
     */
    private function optimizeForPlatform(array $content, string $platform): array
    {
        $limit = isset(self::PLATFORM_LIMITS[$platform]) ? self::PLATFORM_LIMITS[$platform] : 2000;

        // Tronquer si nécessaire
        if (strlen($content['content']) > $limit) {
            $content['content'] = substr($content['content'], 0, $limit - 3) . '...';
        }

        // Optimiser les hashtags par plateforme
        $content['hashtags'] = $this->optimizeHashtagsFrench($content['hashtags'], $platform);

        // Ajouter des spécificités par plateforme
        switch ($platform) {
            case 'instagram':
                $content = $this->addInstagramEmojis($content);
                break;
            case 'linkedin':
                $content = $this->addLinkedInProfessionalism($content);
                break;
            case 'twitter':
                $content = $this->optimizeForTwitter($content);
                break;
        }

        return $content;
    }

    /**
     * ✅ Optimiser les hashtags français par plateforme
     */
    private function optimizeHashtagsFrench(array $tags, string $platform): array
    {
        $maxTags = [
            'twitter' => 4,
            'facebook' => 5,
            'instagram' => 10,
            'linkedin' => 6,
        ];

        $limit = isset($maxTags[$platform]) ? $maxTags[$platform] : 5;

        // S'assurer que les hashtags sont en français
        $frenchTags = [];
        foreach (array_slice($tags, 0, $limit) as $tag) {
            $tag = str_replace('#', '', $tag);
            // Ajouter hashtags français par défaut si nécessaire
            if (!empty($tag)) {
                $frenchTags[] = '#' . $tag;
            }
        }

        // Ajouter hashtags français par défaut si pas assez
        $defaultFrenchTags = ['#entreprise', '#professionnel', '#business', '#stratégie', '#innovation'];
        while (count($frenchTags) < 3 && count($frenchTags) < $limit) {
            $defaultTag = $defaultFrenchTags[count($frenchTags) % count($defaultFrenchTags)];
            if (!in_array($defaultTag, $frenchTags)) {
                $frenchTags[] = $defaultTag;
            } else {
                break;
            }
        }

        return $frenchTags;
    }

    /**
     * ✅ Contenu de fallback EN FRANÇAIS professionnel
     */
    private function createFallbackFrenchContent(string $rawContent, string $platform): array
    {
        $limit = isset(self::PLATFORM_LIMITS[$platform]) ? self::PLATFORM_LIMITS[$platform] : 2000;

        $fallbackContent = "💼 Dans un monde en constante évolution, il est essentiel de rester à la pointe de l'innovation. Découvrez comment développer votre entreprise avec des stratégies éprouvées. 📈";

        if (strlen($rawContent) > 50) {
            $fallbackContent = substr($rawContent, 0, $limit - 100) . "... 💼 Votre succès commence par les bonnes stratégies !";
        }

        return [
            'content' => $fallbackContent,
            'hashtags' => ['#entreprise', '#professionnel', '#business'],
            'call_to_action' => 'Partagez votre expérience en commentaire !'
        ];
    }

    /**
     * ✅ Ajouter emojis pour Instagram
     */
    private function addInstagramEmojis(array $content): array
    {
        // Ajouter emojis si pas déjà présents
        if (!preg_match('/[\x{1F600}-\x{1F64F}]|[\x{1F300}-\x{1F5FF}]|[\x{1F680}-\x{1F6FF}]/u', $content['content'])) {
            $content['content'] .= ' ✨📸';
        }

        // Hashtags Instagram français
        if (!in_array('#instagram', $content['hashtags'])) {
            $content['hashtags'][] = '#instagram';
        }

        return $content;
    }

    /**
     * ✅ Ajout professionnalisme LinkedIn EN FRANÇAIS
     */
    private function addLinkedInProfessionalism(array $content): array
    {
        // Ajouter hashtags professionnels français
        $professionalTags = ['#professionnel', '#linkedinfrance', '#réseauprofessionnel'];

        foreach ($professionalTags as $tag) {
            if (!in_array($tag, $content['hashtags']) && count($content['hashtags']) < 6) {
                $content['hashtags'][] = $tag;
            }
        }

        // Ajouter call-to-action LinkedIn français si manquant
        if (empty($content['call_to_action'])) {
            $content['call_to_action'] = 'Connectons-nous pour échanger sur ce sujet !';
        }

        return $content;
    }

    /**
     * ✅ Optimiser pour Twitter
     */
    private function optimizeForTwitter(array $content): array
    {
        // Vérifier la limite stricte de Twitter avec hashtags
        $hashtagsText = implode(' ', $content['hashtags']);
        $totalLength = strlen($content['content']) + strlen($hashtagsText) + strlen($content['call_to_action'] ?? '');

        if ($totalLength > 280) {
            // Réduire le contenu principal
            $availableSpace = 280 - strlen($hashtagsText) - 20; // 20 pour call-to-action
            $content['content'] = substr($content['content'], 0, $availableSpace - 3) . '...';
        }

        // Limiter hashtags pour Twitter
        $content['hashtags'] = array_slice($content['hashtags'], 0, 3);

        return $content;
    }

    /**
     * ✅ NOUVEAU : Détecter domaine selon le contenu social
     */
    private function detectDomainFromContent(array $content, array $context): string
    {
        // 1. Priorité au contexte fourni
        if (isset($context['domain']) && !empty($context['domain'])) {
            return $context['domain'];
        }

        // 2. Analyser le contenu du post social
        $text = isset($content['content']) ? strtolower($content['content']) : '';
        $hashtags = isset($content['hashtags']) ? $content['hashtags'] : [];
        $allText = strtolower($text . ' ' . implode(' ', $hashtags));

        // 3. Mapping domaines 500+ mots-clés
        $domainKeywords = require __DIR__ . '/enriched_domains.php';

        // 4. Recherche du domaine le plus pertinent
        $domainScores = [];
        foreach ($domainKeywords as $domain => $domainWords) {
            $score = 0;
            foreach ($domainWords as $word) {
                if (strpos($allText, $word) !== false) {
                    $score += (strlen($word) > 5) ? 2 : 1;
                }
            }
            $domainScores[$domain] = $score;
        }

        // 5. Retourner le domaine avec le meilleur score
        $bestDomain = array_keys($domainScores, max($domainScores))[0] ?? 'business';
        
        Log::info("🎯 Domaine détecté pour social media", [
            'content_preview' => substr($text, 0, 100),
            'hashtags' => $hashtags,
            'domain_scores' => $domainScores,
            'selected_domain' => $bestDomain
        ]);

        return $bestDomain;
    }
}
