<?php

namespace App\Services\ContentGeneration;

use App\Services\OpenAI\OpenAIService;
use App\Services\ContentGeneration\ImageContextService;
use Illuminate\Support\Facades\Log;

class BlogContentGenerator
{
    private OpenAIService $openAIService;
    private ImageContextService $imageContextService;

    public function __construct(OpenAIService $openAIService, ImageContextService $imageContextService)
    {
        $this->openAIService = $openAIService;
        $this->imageContextService = $imageContextService;
    }

    /**
     * ✅ Générer contenu à partir d'un objectif hebdomadaire
     */
    public function generateContentFromObjective(array $objective, array $context = []): array
    {
        try {
            $prompt = $this->buildBlogPromptFromObjective($objective, $context);

            $messages = [
                [
                    'role' => 'system',
                    'content' => 'Tu es un expert en rédaction de contenu blog professionnel en FRANÇAIS. Tu génères du contenu substantiel et professionnel basé sur des objectifs prédéfinis. Le contenu doit être long, détaillé et engageant. Réponds uniquement en JSON valide.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ];

            $response = OpenAIService::generateChatCompletion(
                $messages,
                'gpt-3.5-turbo',
                4000, // Maximum tokens pour contenu substantiel
                0.9  // ✅ Température élevée pour plus de variation et créativité
            );

            if (isset($response['error'])) {
                return [
                    'success' => false,
                    'error' => $response['error']
                ];
            }

            $content = $response['choices'][0]['message']['content'] ?? '';
            $parsedContent = $this->parseGeneratedContent($content);

            // ✅ OPTIMISATION : Extraire image_keywords depuis OpenAI (fusion appel 1+2)
            $imageKeywords = $parsedContent['image_keywords'] ?? [];

            $dayOfWeek = date('l');
            $contentForSeed = $parsedContent['title'] . ' ' . substr($parsedContent['content'], 0, 200);
            $contentHash = md5($contentForSeed);
            $uniqueSeed = date('Y-m-d-H-i-s') . '_' . $contentHash . '_' . uniqid();
            $detectedDomain = $this->detectDomainFromObjective($objective, $context);

            Log::info("🖼️ Génération image avec keywords OpenAI", [
                'detected_domain' => $detectedDomain,
                'image_keywords' => $imageKeywords,
                'unique_seed' => substr($uniqueSeed, 0, 30),
            ]);

            $fullContentForImage = $parsedContent['title'] . ' ' .
                                   $parsedContent['summary'] . ' ' .
                                   strip_tags($parsedContent['content']);

            $imageResult = $this->imageContextService->generateCoherentImage(
                $detectedDomain,
                $fullContentForImage,
                [
                    'keywords' => isset($objective['keywords']) ? $objective['keywords'] : [],
                    'content_angle' => isset($objective['content_angle']) ? $objective['content_angle'] : '',
                    'unique_seed' => $uniqueSeed,
                    'day_context' => $dayOfWeek,
                    'post_type' => 'blog',
                    'image_keywords' => $imageKeywords  // ✅ NOUVEAU: Keywords pré-générés par OpenAI
                ]
            );

            return [
                'success' => true,
                'data' => [
                    'title' => isset($parsedContent['title']) ? $parsedContent['title'] : $objective['title'],
                    'summary' => isset($parsedContent['summary']) ? $parsedContent['summary'] : '',
                    'content' => isset($parsedContent['content']) ? $parsedContent['content'] : '',
                    'tags' => isset($objective['keywords']) ? $objective['keywords'] : [],
                    'header_image' => $imageResult['success'] ? $imageResult['image_url'] : null,
                    'objective_used' => $objective
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération blog depuis objectif", ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la génération blog depuis objectif'
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Détecter automatiquement le domaine selon l'objectif
     */
    private function detectDomainFromObjective(array $objective, array $context = []): string
    {
        // 1. Priorité au contexte fourni
        if (isset($context['domain']) && !empty($context['domain'])) {
            return $context['domain'];
        }

        // 2. Détecter selon les mots-clés de l'objectif
        $keywords = isset($objective['keywords']) ? $objective['keywords'] : [];
        $title = isset($objective['title']) ? strtolower($objective['title']) : '';
        $allText = strtolower($title . ' ' . implode(' ', $keywords));

        // 3. Mapping domaines 500+ mots-clés
        $domainKeywords = require __DIR__ . '/enriched_domains.php';

        // 4. Recherche du domaine le plus pertinent
        $domainScores = [];
        foreach ($domainKeywords as $domain => $domainWords) {
            $score = 0;
            foreach ($domainWords as $word) {
                if (strpos($allText, $word) !== false) {
                    $score += (strlen($word) > 5) ? 2 : 1; // Plus de points pour mots longs
                }
            }
            $domainScores[$domain] = $score;
        }

        // 5. Retourner le domaine avec le meilleur score
        $bestDomain = array_keys($domainScores, max($domainScores))[0] ?? 'business';
        
        Log::info("🎯 Domaine détecté automatiquement", [
            'objective_title' => $title,
            'keywords' => $keywords,
            'domain_scores' => $domainScores,
            'selected_domain' => $bestDomain
        ]);

        return $bestDomain;
    }

    /**
     * ✅ Construire le prompt basé sur objectif - FRANÇAIS FORCÉ
     */
    private function buildBlogPromptFromObjective(array $objective, array $context): string
    {
        $theme = isset($objective['theme']) ? $objective['theme'] : (isset($objective['title']) ? $objective['title'] : '');
        $keywords = implode(', ', isset($objective['keywords']) ? $objective['keywords'] : []);
        $seoFocus = isset($objective['seo_focus']) ? $objective['seo_focus'] : '';
        $contentAngle = isset($objective['content_angle']) ? $objective['content_angle'] : '';
        $dayName = isset($objective['day_name']) ? $objective['day_name'] : '';
        $dayIndex = isset($objective['day_index']) ? $objective['day_index'] : 0;
        $variationSeed = isset($objective['variation_seed']) ? $objective['variation_seed'] : '';
        $projectContext = isset($context['project_context']) ? $context['project_context'] : '';
        $businessName = isset($objective['business_name']) ? $objective['business_name'] : '';
        $toneOfVoice = isset($objective['tone_of_voice']) ? $objective['tone_of_voice'] : 'professionnel';
        $objectiveText = isset($objective['objective_text']) ? $objective['objective_text'] : '';

        return "GÉNÈRE UN ARTICLE DE BLOG PROFESSIONNEL EN FRANÇAIS basé sur cet objectif hebdomadaire :

THÈME DE LA SEMAINE : {$theme}
JOUR : {$dayName} (Article #{$dayIndex} de la semaine)
ANGLE SPÉCIFIQUE DU JOUR : {$contentAngle}
MOTS-CLÉS : {$keywords}
FOCUS SEO : {$seoFocus}
CONTEXTE PROJET : {$projectContext}
IDENTIFIANT UNIQUE : {$variationSeed}

⚠️ ANTI-DUPLICATION CRITIQUE :
- Ce contenu doit être TOTALEMENT DIFFÉRENT des autres articles de la semaine
- NE JAMAIS répéter les mêmes titres, phrases ou structures
- Chaque article doit avoir son propre titre UNIQUE
- Chaque article doit explorer l'angle du jour de manière ORIGINALE
- Varier les exemples, les formulations, les perspectives
- Le titre doit refléter l'angle spécifique du jour

EXIGENCES STRICTES - RESPECTE ABSOLUMENT CES RÈGLES :
- LANGUE : Français uniquement, grammaire parfaite
- LONGUEUR MINIMALE OBLIGATOIRE : 1500-2000 mots (PAS MOINS !)
  * Introduction : 200-300 mots minimum
  * Corps principal : 1000-1400 mots avec 4-5 sections détaillées
  * Conclusion : 200-300 mots minimum
- STYLE : {$toneOfVoice}, engageant, informatif, expertise approfondie
- STRUCTURE OBLIGATOIRE :
  * Introduction captivante avec contexte et enjeux
  * 4-5 sections H2 avec sous-sections H3
  * Chaque section : 250-350 mots minimum
  * Exemples concrets, données, statistiques
  * Listes à puces détaillées
  * Conclusion actionnable avec prochaines étapes
- SEO : Utilise les mots-clés naturellement (densité 2-3%)
- VALEUR : Contenu actionnable avec conseils pratiques détaillés
- FORMATAGE : HTML riche avec <h2>, <h3>, <p>, <strong>, <em>, <ul>, <li>, <blockquote>
- COHÉRENCE : Aligné avec l'objectif semaine mais angle unique du jour
- PROFONDEUR : Développe CHAQUE point avec détails, exemples, applications pratiques

FORMAT JSON REQUIS :
{
    \"title\": \"Titre UNIQUE et accrocheur en français (50-60 caractères) - Doit refléter {$dayName}\",
    \"summary\": \"Résumé exécutif UNIQUE en français (200-250 mots) - Doit captiver et donner envie de lire\",
    \"content\": \"Article complet UNIQUE en français (MINIMUM 1500-2000 mots OBLIGATOIRE, formaté en HTML propre avec multiples sections H2/H3, listes, exemples concrets)\",
    \"image_keywords\": [\"keyword1 en anglais\", \"keyword2 en anglais\", \"keyword3 en anglais\"]
}

⚠️ CRITIQUE : Le contenu DOIT faire AU MINIMUM 1500 mots. Si tu génères moins, c'est un échec.
⚠️ CRITIQUE : Génère 3-6 mots-clés EN ANGLAIS dans image_keywords pour recherche d'images Pexels (concepts visuels liés au contenu).
Développe CHAQUE section en profondeur avec exemples, données, conseils pratiques détaillés.

Génère un contenu TOTALEMENT ORIGINAL pour ce jour spécifique.";
    }

    /**
     * ✅ Parser le contenu généré avec validation
     */
    private function parseGeneratedContent(string $content): array
    {
        // Nettoyer le contenu pour extraire le JSON
        $content = trim($content);
        $content = preg_replace('/^```json\s*/', '', $content);
        $content = preg_replace('/\s*```$/', '', $content);

        $decoded = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::warning("⚠️ Erreur JSON blog, fallback français", [
                'json_error' => json_last_error_msg(),
                'content_preview' => substr($content, 0, 100)
            ]);

            // Fallback en français professionnel
            return [
                'title' => 'Article Professionnel Généré par IA',
                'summary' => 'Contenu professionnel généré automatiquement basé sur vos objectifs stratégiques et adapté à votre secteur d\'activité.',
                'content' => $this->createFallbackFrenchContent($content),
                'tags' => ['expertise', 'professionnel', 'stratégie']
            ];
        }

        // Validation du contenu français
        return [
            'title' => isset($decoded['title']) ? $decoded['title'] : 'Article Professionnel',
            'summary' => isset($decoded['summary']) ? $decoded['summary'] : 'Contenu professionnel généré.',
            'content' => isset($decoded['content']) ? $this->ensureFrenchContent($decoded['content']) : $this->createFallbackFrenchContent($content),
            'tags' => isset($decoded['tags']) ? $decoded['tags'] : ['expertise', 'professionnel']
        ];
    }

    /**
     * ✅ Créer contenu français de fallback professionnel
     */
    private function createFallbackFrenchContent(string $rawContent): string
    {
        Log::warning("⚠️ [BlogGenerator] Utilisation fallback content - OpenAI a probablement retourné un JSON invalide", [
            'raw_content_preview' => substr($rawContent, 0, 200)
        ]);
        
        // Contenu fallback substantiel et professionnel
        $frenchContent = "<h2>Introduction</h2>
<p>Dans le contexte entrepreneurial actuel, il est essentiel de développer des stratégies efficaces et innovantes pour se démarquer sur le marché. Les entreprises qui réussissent sont celles qui savent s'adapter rapidement aux changements et anticiper les besoins de leur audience.</p>

<p>Cet article explore les meilleures pratiques et stratégies éprouvées pour développer votre activité de manière durable et rentable. Nous aborderons les aspects clés qui font la différence entre une entreprise qui stagne et une entreprise qui prospère.</p>

<h2>Comprendre Votre Marché</h2>
<p>La première étape vers le succès consiste à bien comprendre votre marché cible. Cela implique une analyse approfondie de votre secteur d'activité, de vos concurrents, et surtout de vos clients potentiels. Une connaissance approfondie de votre marché vous permettra de prendre des décisions éclairées et d'éviter les erreurs coûteuses.</p>

<p>Il est crucial d'identifier les tendances émergentes, les opportunités inexploitées, et les menaces potentielles. Cette veille stratégique vous donnera un avantage compétitif significatif et vous aidera à positionner votre offre de manière optimale.</p>

<h2>Développement Stratégique</h2>
<p>La mise en place d'une stratégie solide nécessite une analyse approfondie du marché et une compréhension claire des besoins de votre audience cible. Chaque décision doit être guidée par des données concrètes et une vision à long terme.</p>

<p>Une stratégie efficace repose sur plusieurs piliers fondamentaux : la clarté de la vision, la cohérence des actions, et la capacité d'adaptation. Il est essentiel de définir des objectifs SMART (Spécifiques, Mesurables, Atteignables, Réalistes, Temporellement définis) et de mettre en place des indicateurs de performance pertinents.</p>

<h3>Points Clés à Considérer</h3>
<ul>
<li><strong>Analyse approfondie du marché et de la concurrence</strong> - Comprendre votre positionnement et identifier vos avantages compétitifs</li>
<li><strong>Définition claire des objectifs et indicateurs de performance</strong> - Établir des KPIs mesurables et suivre votre progression</li>
<li><strong>Mise en œuvre progressive et mesurée des actions</strong> - Procéder par étapes pour minimiser les risques</li>
<li><strong>Suivi régulier et ajustement de la stratégie</strong> - Rester agile et adapter votre approche selon les résultats</li>
<li><strong>Innovation continue et adaptation aux tendances</strong> - Se tenir informé des évolutions du marché et innover constamment</li>
<li><strong>Investissement dans les ressources clés</strong> - Allouer les ressources nécessaires aux initiatives prioritaires</li>
<li><strong>Développement d'une culture d'excellence</strong> - Cultiver l'excellence à tous les niveaux de l'organisation</li>
</ul>

<h2>Mise en Pratique</h2>
<p>L'application de ces principes dans votre quotidien professionnel vous permettra de construire une base solide pour votre croissance. Il est important de rester flexible et d'adapter votre approche en fonction des retours du marché.</p>

<p>Commencez par établir un plan d'action détaillé avec des étapes concrètes et des échéances réalistes. Impliquez votre équipe dans le processus et assurez-vous que chacun comprend son rôle et ses responsabilités. La communication transparente et régulière est essentielle pour maintenir l'engagement et la motivation.</p>

<h3>Conseils Pratiques</h3>
<p>Pour maximiser vos chances de succès, concentrez-vous sur l'exécution plutôt que sur la planification excessive. Testez vos idées rapidement, apprenez de vos erreurs, et itérez continuellement. N'ayez pas peur d'échouer - chaque échec est une opportunité d'apprentissage qui vous rapproche de votre objectif.</p>

<h2>Conclusion</h2>
<p>En suivant ces recommandations et en restant engagé dans votre démarche d'amélioration continue, vous serez en mesure d'atteindre vos objectifs professionnels avec succès et de créer un impact durable dans votre secteur.</p>

<p>Le chemin vers le succès n'est pas linéaire, mais avec de la persévérance, une stratégie claire, et une exécution rigoureuse, vous pouvez transformer votre vision en réalité. Restez focus sur vos objectifs, entourez-vous des bonnes personnes, et n'arrêtez jamais d'apprendre et de vous améliorer.</p>";

        return $frenchContent;
    }

    /**
     * ✅ S'assurer que le contenu est en français
     */
    private function ensureFrenchContent(string $content): string
    {
        // Vérifier si le contenu contient des mots français typiques
        $frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'dans', 'pour', 'avec', 'être', 'avoir', 'entreprise', 'stratégie'];
        $hasFrenchWords = false;

        foreach ($frenchWords as $word) {
            if (stripos($content, $word) !== false) {
                $hasFrenchWords = true;
                break;
            }
        }

        // Si pas de mots français détectés, créer contenu français
        if (!$hasFrenchWords) {
            Log::warning("⚠️ Contenu non-français détecté, création contenu français");
            return $this->createFallbackFrenchContent($content);
        }

        return $content;
    }

    /**
     * ✅ Optimiser le contenu pour le SEO français
     */
    public function optimizeForSEO(array $content, string $domain): array
    {
        // Ajouter des mots-clés SEO français basés sur le domaine
        $seoKeywords = $this->getSEOKeywordsFrench($domain);

        if (!empty($seoKeywords)) {
            $content['tags'] = array_merge($content['tags'], $seoKeywords);
            $content['tags'] = array_unique($content['tags']);
        }

        return $content;
    }

    /**
     * ✅ FIXED: Utilise dynamiquement enriched_domains.php pour extraire SEO keywords
     */
    private function getSEOKeywordsFrench(string $domain): array
    {
        // Charger depuis enriched_domains.php
        $domainKeywords = require __DIR__ . '/enriched_domains.php';

        // Si domaine existe, extraire 8-12 keywords les plus pertinents (les plus longs = plus spécifiques)
        if (isset($domainKeywords[$domain])) {
            $keywords = $domainKeywords[$domain];

            // Trier par longueur (mots longs = plus spécifiques pour SEO)
            usort($keywords, function($a, $b) {
                return strlen($b) - strlen($a);
            });

            // Prendre les 12 premiers (plus spécifiques)
            return array_slice($keywords, 0, 12);
        }

        // Fallback: essayer de trouver dans hardcoded pour domaines spécialisés
        $seoKeywords = [
            // Core 18 domaines
            'food' => ['cuisine', 'gastronomie', 'restaurant', 'recette', 'chef', 'pâtisserie', 'alimentation', 'produits frais', 'terroir', 'boulanger', 'cuisinier', 'bio'],
            'travel' => ['voyage', 'tourisme', 'destination', 'vacances', 'hôtel', 'plage', 'aventure', 'découverte', 'séjour', 'excursion', 'tropical', 'exotique'],
            'health' => ['santé', 'bien-être', 'fitness', 'nutrition', 'médical', 'soins', 'prévention', 'forme', 'wellness', 'sport', 'yoga', 'massage'],
            'education' => ['formation', 'apprentissage', 'éducation', 'enseignement', 'pédagogie', 'cours', 'diplôme', 'compétences', 'université', 'e-learning', 'professeur'],
            'tech' => ['technologie', 'innovation', 'digital', 'numérique', 'développement', 'ia', 'cloud', 'data', 'software', 'programmation', 'application', 'startup'],
            'marketing' => ['marketing', 'digital', 'stratégie', 'communication', 'promotion', 'seo', 'réseaux sociaux', 'contenu', 'branding', 'publicité', 'campagne', 'analytics'],
            'finance' => ['finance', 'investissement', 'économie', 'budget', 'comptabilité', 'banque', 'épargne', 'gestion', 'crypto', 'bourse', 'patrimoine', 'fintech'],
            'fashion' => ['mode', 'style', 'tendance', 'vêtement', 'accessoire', 'design', 'collection', 'boutique', 'couture', 'luxe', 'designer', 'chaussure'],
            'real_estate' => ['immobilier', 'maison', 'appartement', 'propriété', 'location', 'architecture', 'rénovation', 'construction', 'villa', 'investissement', 'agent'],
            'beauty' => ['beauté', 'cosmétique', 'soin', 'maquillage', 'coiffure', 'spa', 'esthétique', 'parfum', 'skincare', 'salon', 'barbier', 'manucure'],
            'automotive' => ['automobile', 'voiture', 'garage', 'mécanique', 'entretien', 'véhicule', 'mobilité', 'transport', 'électrique', 'moto', 'réparation'],
            'art' => ['art', 'culture', 'création', 'peinture', 'design', 'musique', 'spectacle', 'exposition', 'artiste', 'galerie', 'photographie', 'cinéma'],
            'nature' => ['nature', 'environnement', 'écologie', 'biodiversité', 'conservation', 'green', 'durable', 'bio', 'forêt', 'animaux', 'océan', 'climat'],
            'sports' => ['sport', 'fitness', 'entraînement', 'performance', 'compétition', 'athlète', 'coaching', 'wellness', 'gym', 'musculation', 'marathon', 'football'],
            'family' => ['famille', 'enfants', 'parents', 'éducation', 'parentalité', 'activités', 'loisirs', 'puériculture', 'bébé', 'jouets', 'grossesse', 'crèche'],
            'business' => ['entreprise', 'stratégie', 'croissance', 'performance', 'gestion', 'management', 'productivité', 'startup', 'leadership', 'innovation', 'projet'],
            'home_tech' => ['domotique', 'smart home', 'maison connectée', 'technologie', 'automatisation', 'sécurité', 'iot', 'alexa', 'caméra', 'alarme'],
            'entertainment' => ['divertissement', 'loisirs', 'gaming', 'streaming', 'hobby', 'passion', 'entertainment', 'jeux vidéo', 'podcast', 'netflix', 'youtube'],

            // Domaines spécialisés (50+)
            'bakery' => ['boulangerie', 'pain', 'viennoiserie', 'pâtisserie', 'croissant', 'artisan', 'boulanger', 'farine', 'levain', 'bio'],
            'restaurant' => ['restaurant', 'gastronomie', 'cuisine', 'chef', 'menu', 'plat', 'dining', 'terrasse', 'réservation', 'étoilé'],
            'cafe' => ['café', 'espresso', 'barista', 'coffee', 'cappuccino', 'terrasse', 'torréfaction', 'arabica', 'latte', 'cozy'],
            'patisserie' => ['pâtisserie', 'gâteau', 'dessert', 'chocolat', 'tarte', 'macaron', 'entremet', 'mousse', 'sucré', 'artisan'],
            'wine' => ['vin', 'vignoble', 'dégustation', 'sommelier', 'cave', 'cépage', 'terroir', 'rouge', 'blanc', 'œnologie'],
            'beer' => ['bière', 'brasserie', 'craft', 'houblon', 'dégustation', 'ipa', 'blonde', 'ambrée', 'pression', 'artisanale'],
            'seafood' => ['fruits de mer', 'poisson', 'océan', 'frais', 'marché', 'crustacés', 'sushi', 'restaurant', 'pêche', 'homard'],
            'vegan' => ['vegan', 'végétarien', 'végétal', 'bio', 'santé', 'légumes', 'recette', 'nutrition', 'plantes', 'éthique'],
            'street_food' => ['street food', 'food truck', 'marché', 'urbain', 'street', 'food', 'tacos', 'burger', 'rapide', 'mobile'],

            'beach' => ['plage', 'mer', 'sable', 'océan', 'tropical', 'vacances', 'sunset', 'côte', 'baignade', 'palmier'],
            'mountain' => ['montagne', 'sommet', 'randonnée', 'altitude', 'alpes', 'ski', 'trek', 'panorama', 'nature', 'refuge'],
            'hotel' => ['hôtel', 'hébergement', 'luxe', 'resort', 'chambre', 'suite', 'spa', 'confort', 'réservation', 'étoiles'],
            'adventure' => ['aventure', 'exploration', 'outdoor', 'camping', 'nature', 'trek', 'safari', 'découverte', 'expédition'],
            'safari' => ['safari', 'faune', 'afrique', 'animaux', 'jeep', 'lion', 'éléphant', 'réserve', 'aventure', 'savane'],
            'cruise' => ['croisière', 'bateau', 'voyage', 'luxe', 'océan', 'cabine', 'escale', 'navire', 'vacances', 'tour'],
            'backpacking' => ['backpacking', 'routard', 'voyage', 'budget', 'hostel', 'aventure', 'sac', 'trail', 'trek', 'nomade'],
            'resort' => ['resort', 'luxe', 'vacances', 'piscine', 'spa', 'tropical', 'all inclusive', 'détente', 'paradis', 'plage'],

            'yoga' => ['yoga', 'méditation', 'wellness', 'zen', 'mindfulness', 'relaxation', 'posture', 'breathing', 'spirituel', 'paix'],
            'gym' => ['gym', 'fitness', 'musculation', 'training', 'workout', 'équipement', 'coach', 'force', 'cardio', 'crossfit'],
            'nutrition' => ['nutrition', 'alimentation', 'santé', 'régime', 'diet', 'vitamines', 'protéines', 'équilibré', 'healthy', 'bio'],
            'mental_health' => ['santé mentale', 'psychologie', 'thérapie', 'stress', 'anxiété', 'bien-être', 'méditation', 'coaching', 'émotions'],
            'medical' => ['médical', 'médecin', 'hôpital', 'clinique', 'soins', 'santé', 'diagnostic', 'traitement', 'professionnel', 'docteur'],
            'pharmacy' => ['pharmacie', 'médicaments', 'ordonnance', 'santé', 'conseil', 'prescription', 'soins', 'drugstore', 'parapharmacie'],
            'dental' => ['dentaire', 'dentiste', 'dents', 'orthodontie', 'implant', 'blanchiment', 'sourire', 'hygiène', 'cabinet', 'soins'],

            'ai' => ['intelligence artificielle', 'ia', 'machine learning', 'deep learning', 'neural', 'robot', 'automation', 'future', 'technology'],
            'blockchain' => ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'nft', 'web3', 'decentralized', 'token', 'smart contract'],
            'cloud' => ['cloud', 'computing', 'aws', 'azure', 'saas', 'serveur', 'storage', 'infrastructure', 'data center', 'scalable'],
            'mobile' => ['mobile', 'app', 'smartphone', 'ios', 'android', 'application', 'ux', 'interface', 'development', 'native'],
            'cybersecurity' => ['cybersécurité', 'sécurité', 'hacker', 'protection', 'firewall', 'encryption', 'threat', 'privacy', 'data'],
            'data_science' => ['data science', 'analytics', 'big data', 'machine learning', 'visualization', 'python', 'statistics', 'insights'],
            'robotics' => ['robotique', 'robot', 'automation', 'ai', 'manufacturing', 'industry', 'autonomous', 'mechanical', 'engineering'],
            'vr_ar' => ['réalité virtuelle', 'vr', 'ar', 'augmented', 'immersive', 'headset', 'metaverse', '3d', 'simulation', 'gaming'],

            'startup' => ['startup', 'entrepreneuriat', 'innovation', 'levée fonds', 'venture', 'pitch', 'scale-up', 'disruption', 'business'],
            'coworking' => ['coworking', 'espace partagé', 'bureau', 'flexible', 'freelance', 'communauté', 'networking', 'moderne', 'workspace'],
            'consulting' => ['consulting', 'conseil', 'stratégie', 'expertise', 'audit', 'accompagnement', 'business', 'transformation', 'performance'],
            'ecommerce' => ['e-commerce', 'boutique en ligne', 'vente', 'marketplace', 'digital', 'shop', 'livraison', 'paiement', 'online'],
            'retail' => ['retail', 'magasin', 'commerce', 'vente', 'boutique', 'client', 'shopping', 'stock', 'merchandising', 'point vente'],
            'logistics' => ['logistique', 'transport', 'livraison', 'entrepôt', 'supply chain', 'shipping', 'warehouse', 'distribution', 'fleet'],

            'photography' => ['photographie', 'photo', 'appareil', 'studio', 'shooting', 'portrait', 'image', 'photographe', 'lumière', 'editing'],
            'design' => ['design', 'graphisme', 'création', 'branding', 'logo', 'ux', 'ui', 'créatif', 'visuel', 'identité'],
            'music' => ['musique', 'concert', 'artiste', 'album', 'son', 'studio', 'instrument', 'composition', 'live', 'festival'],
            'cinema' => ['cinéma', 'film', 'movie', 'réalisateur', 'production', 'scénario', 'acteur', 'tournage', 'caméra', 'salle'],
            'theater' => ['théâtre', 'scène', 'pièce', 'spectacle', 'comédie', 'drame', 'acteur', 'représentation', 'salle', 'troupe'],
            'dance' => ['danse', 'ballet', 'chorégraphie', 'spectacle', 'studio', 'danseur', 'contemporary', 'performance', 'musique', 'art'],

            'wedding' => ['mariage', 'wedding', 'cérémonie', 'noce', 'union', 'couple', 'célébration', 'photographe', 'traiteur', 'organisation'],
            'pet' => ['animal', 'chien', 'chat', 'pet', 'vétérinaire', 'soins', 'alimentation', 'accessoire', 'adoption', 'toilettage'],
            'garden' => ['jardin', 'jardinage', 'plantes', 'fleurs', 'potager', 'green', 'nature', 'outdoor', 'paysagiste', 'permaculture'],
            'home_decor' => ['décoration', 'intérieur', 'design', 'mobilier', 'aménagement', 'style', 'maison', 'home', 'tendance', 'architecture'],
            'crafts' => ['artisanat', 'diy', 'handmade', 'création', 'fait main', 'hobby', 'craft', 'créatif', 'manuel', 'atelier'],
        ];

        return isset($seoKeywords[$domain]) ? $seoKeywords[$domain] : ['professionnel', 'expertise', 'conseil'];
    }
}
