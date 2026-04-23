<?php

namespace App\Services\ContentGeneration;

use App\Services\ContentGeneration\BlogContentGenerator;
use App\Services\ContentGeneration\SocialContentGenerator;
use App\Services\ContentGeneration\WeeklyObjectivesService;
use App\Models\User;
use App\Models\WeeklyContentObjective;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ContentGenerationService
{
    private BlogContentGenerator $blogGenerator;
    private SocialContentGenerator $socialGenerator;
    private WeeklyObjectivesService $weeklyObjectivesService;

    public function __construct(
        BlogContentGenerator $blogGenerator,
        SocialContentGenerator $socialGenerator,
        WeeklyObjectivesService $weeklyObjectivesService
    ) {
        $this->blogGenerator = $blogGenerator;
        $this->socialGenerator = $socialGenerator;
        $this->weeklyObjectivesService = $weeklyObjectivesService;
    }

    /**
     * ✅ Générer contenu blog basé sur objectifs hebdomadaires
     */
    public function generateBlogContent(User $user, array $options = []): array
    {
        try {
            Log::info("🎯 Génération blog depuis objectifs hebdomadaires", ['user_id' => $user->id]);

            // 1. Récupérer ou générer les objectifs de la semaine
            $objectivesResult = $this->getOrCreateWeeklyObjectives($user, 'blog');
            if (!$objectivesResult['success']) {
                // 🚨 FALLBACK : Générer contenu sans objectifs
                return $this->generateFallbackBlogContent($user, $objectivesResult['error']);
            }

            $weeklyObjectives = $objectivesResult['objectives'];
            $weekObjective = $weeklyObjectives->objectives;

            // ✅ NOUVELLE APPROCHE: weekObjective est maintenant un seul objectif (pas un array)
            if (empty($weekObjective) || !is_array($weekObjective)) {
                Log::warning("⚠️ Objectif hebdomadaire vide, fallback", ['user_id' => $user->id]);
                return $this->generateFallbackBlogContent($user, 'Objectif vide');
            }

            // 2. ✅ NOUVELLE APPROCHE: Utiliser l'objectif unique + variation par jour
            $dayOfWeek = Carbon::now()->dayOfWeek; // 0 = dimanche, 1 = lundi
            $dayIndex = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1; // Convertir pour index 0-6
            $dayName = Carbon::now()->format('l'); // Monday, Tuesday, etc.
            
            // ✅ Sélectionner l'angle du jour depuis content_angles
            $contentAngles = isset($weekObjective['content_angles']) ? $weekObjective['content_angles'] : [];
            $todayAngle = isset($contentAngles[$dayIndex]) ? $contentAngles[$dayIndex] : (isset($contentAngles[0]) ? $contentAngles[0] : 'Analyse générale');
            
            // ✅ Construire l'objectif du jour avec variation
            $todayObjective = $weekObjective;
            $todayObjective['day_index'] = $dayIndex;
            $todayObjective['day_name'] = $dayName;
            $todayObjective['content_angle'] = $todayAngle;
            $todayObjective['variation_seed'] = $user->id . '_' . now()->format('Y-m-d') . '_blog';

            Log::info("✅ Objectif unique de la semaine avec variation jour", [
                'user_id' => $user->id,
                'theme' => isset($weekObjective['theme']) ? $weekObjective['theme'] : 'N/A',
                'day_index' => $dayIndex,
                'day_name' => $dayName,
                'today_angle' => $todayAngle
            ]);

            // 3. Construire contexte projet
            $context = $this->buildProjectContext($user);

            // 4. Générer contenu basé sur l'objectif
            $result = $this->blogGenerator->generateContentFromObjective($todayObjective, $context);

            if ($result['success']) {
                $result['data']['generation_context'] = [
                    'user_id' => $user->id,
                    'source' => 'weekly_objectives',
                    'week_identifier' => $weeklyObjectives->week_identifier,
                    'day_index' => $dayIndex,
                    'objective_used' => $todayObjective,
                    'generated_at' => now()->toISOString()
                ];
            } else {
                // 🚨 FALLBACK si génération échoue
                return $this->generateFallbackBlogContent($user, $result['error'] ?? 'Génération échouée');
            }

            return $result;

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération blog depuis objectifs", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            // 🚨 FALLBACK en cas d'exception
            return $this->generateFallbackBlogContent($user, $e->getMessage());
        }
    }

    /**
     * ✅ Générer contenu social basé sur objectifs hebdomadaires
     */
    public function generateSocialContent(User $user, string $platform, array $options = []): array
    {
        try {
            Log::info("🎯 Génération social depuis objectifs hebdomadaires", [
                'user_id' => $user->id,
                'platform' => $platform
            ]);

            // 1. Récupérer ou générer les objectifs de la semaine
            $objectivesResult = $this->getOrCreateWeeklyObjectives($user, 'social_media');
            if (!$objectivesResult['success']) {
                // 🚨 FALLBACK : Générer contenu sans objectifs
                return $this->generateFallbackSocialContent($user, $platform, $objectivesResult['error']);
            }

            $weeklyObjectives = $objectivesResult['objectives'];
            $weekObjective = $weeklyObjectives->objectives;

            // ✅ NOUVELLE APPROCHE: weekObjective est maintenant un seul objectif (pas un array)
            if (empty($weekObjective) || !is_array($weekObjective)) {
                Log::warning("⚠️ Objectif social hebdomadaire vide, fallback", ['user_id' => $user->id]);
                return $this->generateFallbackSocialContent($user, $platform, 'Objectif vide');
            }

            // 2. ✅ NOUVELLE APPROCHE: Utiliser l'objectif unique + variation par jour et plateforme
            $dayOfWeek = Carbon::now()->dayOfWeek;
            $dayIndex = $dayOfWeek === 0 ? 6 : $dayOfWeek - 1;
            $dayName = Carbon::now()->format('l');

            // ✅ Sélectionner stratégie plateforme
            $platformStrategies = isset($weekObjective['platform_strategies']) ? $weekObjective['platform_strategies'] : [];
            $platformStrategy = isset($platformStrategies[$platform]) ? $platformStrategies[$platform] : 'Stratégie générale';
            
            // ✅ Construire l'objectif du jour avec variation
            $todayObjective = $weekObjective;
            $todayObjective['day_index'] = $dayIndex;
            $todayObjective['day_name'] = $dayName;
            $todayObjective['platform'] = $platform;
            $todayObjective['platform_strategy'] = $platformStrategy;
            $todayObjective['variation_seed'] = $user->id . '_' . now()->format('Y-m-d') . '_' . $platform;

            Log::info("✅ Objectif social unique avec variation jour/plateforme", [
                'user_id' => $user->id,
                'theme' => isset($weekObjective['theme']) ? $weekObjective['theme'] : 'N/A',
                'platform' => $platform,
                'day_index' => $dayIndex,
                'platform_strategy' => $platformStrategy
            ]);

            // 3. Construire contexte projet
            $context = $this->buildProjectContext($user);

            // 4. Générer contenu basé sur l'objectif
            $result = $this->socialGenerator->generateContentFromObjective($todayObjective, $platform, $context);

            if ($result['success']) {
                $result['data']['generation_context'] = [
                    'user_id' => $user->id,
                    'source' => 'weekly_objectives',
                    'platform' => $platform,
                    'week_identifier' => $weeklyObjectives->week_identifier,
                    'day_index' => $dayIndex,
                    'objective_used' => $todayObjective,
                    'generated_at' => now()->toISOString()
                ];
            } else {
                // 🚨 FALLBACK si génération échoue
                return $this->generateFallbackSocialContent($user, $platform, $result['error'] ?? 'Génération échouée');
            }

            return $result;

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération social depuis objectifs", [
                'user_id' => $user->id,
                'platform' => $platform,
                'error' => $e->getMessage()
            ]);

            // 🚨 FALLBACK en cas d'exception
            return $this->generateFallbackSocialContent($user, $platform, $e->getMessage());
        }
    }

    /**
     * 🆘 FALLBACK : Générer contenu blog sans objectifs
     */
    private function generateFallbackBlogContent(User $user, string $reason): array
    {
        Log::info("🆘 Génération fallback blog", ['user_id' => $user->id, 'reason' => $reason]);

        $project = $user->projects()->where('is_active', true)->first();
        $projectName = $project ? $project->name : 'Mon Projet';
        $today = now()->format('d/m/Y');

        $fallbackObjective = [
            'title' => "Développement de {$projectName} - {$today}",
            'keywords' => ['développement', 'projet', 'innovation'],
            'seo_focus' => 'stratégie business',
            'content_angle' => 'Analyse et réflexions sur le développement du projet'
        ];

        $context = $this->buildProjectContext($user);
        $context['fallback'] = true;

        return $this->blogGenerator->generateContentFromObjective($fallbackObjective, $context);
    }

    /**
     * 🆘 FALLBACK : Générer contenu social sans objectifs
     */
    private function generateFallbackSocialContent(User $user, string $platform, string $reason): array
    {
        Log::info("🆘 Génération fallback social", [
            'user_id' => $user->id,
            'platform' => $platform,
            'reason' => $reason
        ]);

        $project = $user->projects()->where('is_active', true)->first();
        $projectName = $project ? $project->name : 'Mon Projet';

        $fallbackObjective = [
            'title' => "Innovation pour {$projectName}",
            'keywords' => ['innovation', 'développement', 'projet'],
            'content_angle' => 'Partage des avancées et réflexions',
            'hashtags' => ['#innovation', '#développement', '#business']
        ];

        $context = $this->buildProjectContext($user);
        $context['fallback'] = true;

        return $this->socialGenerator->generateContentFromObjective($fallbackObjective, $platform, $context);
    }

    /**
     * ✅ Génération en lot basée sur objectifs
     */
    public function generateBatchContent(User $user, array $requirements = []): array
    {
        try {
            Log::info("🔄 Génération contenu en lot avec objectifs", ['user_id' => $user->id]);

            $results = [];

            // Générer blog si demandé
            if ((isset($requirements['blog_count']) ? $requirements['blog_count'] : 1) > 0) {
                $blogResult = $this->generateBlogContent($user, isset($requirements['blog_options']) ? $requirements['blog_options'] : []);
                $results['blog'] = $blogResult;
            }

            // Générer posts social media
            $platforms = isset($requirements['platforms']) ? $requirements['platforms'] : ['facebook', 'linkedin', 'twitter', 'instagram'];
            $results['social'] = [];

            foreach ($platforms as $platform) {
                $socialResult = $this->generateSocialContent($user, $platform, isset($requirements['social_options']) ? $requirements['social_options'] : []);
                $results['social'][$platform] = $socialResult;
            }

            return [
                'success' => true,
                'data' => $results
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération batch", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la génération en lot'
            ];
        }
    }

    /**
     * ✅ Récupérer ou créer objectifs hebdomadaires
     */
    private function getOrCreateWeeklyObjectives(User $user, string $contentType): array
    {
        $project = $user->projects()->where('is_active', true)->first();
        if (!$project) {
            return [
                'success' => false,
                'error' => 'Aucun projet actif trouvé'
            ];
        }

        $weekIdentifier = Carbon::now()->format('Y-\WW');

        // Vérifier si objectifs existent déjà
        $existingObjectives = WeeklyContentObjective::where([
            'project_id' => $project->id,
            'week_identifier' => $weekIdentifier,
            'content_type' => $contentType
        ])->first();

        if ($existingObjectives) {
            return [
                'success' => true,
                'objectives' => $existingObjectives
            ];
        }

        // Générer nouveaux objectifs
        $result = $this->weeklyObjectivesService->generateWeeklyObjectives($project, $weekIdentifier);

        if (!$result['success']) {
            return $result;
        }

        $objectives = $contentType === 'blog' ? $result['blog_objectives'] : $result['social_objectives'];

        return [
            'success' => true,
            'objectives' => $objectives
        ];
    }

    /**
     * ✅ Construire contexte projet pour génération
     */
    private function buildProjectContext(User $user): array
    {
        $project = $user->projects()->where('is_active', true)->first();
        if (!$project) {
            return ['project_context' => 'Aucun projet actif'];
        }

        return [
            'project_context' => $project->description,
            'domain' => $this->extractDomainFromProject($project),
            'target_audience' => $project->target_audience,
            'main_objective' => $project->main_objective
        ];
    }

    /**
     * ✅ CORRIGÉ : Extraire domaine depuis projet avec détection complète
     */
    private function extractDomainFromProject($project): string
    {
        $description = strtolower($project->description ?? '');
        $name = strtolower($project->name ?? '');
        $targetAudience = strtolower($project->target_audience ?? '');
        $mainObjective = strtolower($project->main_objective ?? '');

        // Combiner tous les textes du projet pour meilleure détection
        $allProjectText = $description . ' ' . $name . ' ' . $targetAudience . ' ' . $mainObjective;

        // Mapping domaines avec 500+ mots-clés
        $domainKeywords = require __DIR__ . '/enriched_domains.php';

        // Fallback si fichier non trouvé
        if (!is_array($domainKeywords)) {
            $domainKeywords = [
            'food' => [
                'boulang', 'pâtisserie', 'boulanger', 'pain', 'viennoiserie', 'croissant',
                'restaurant', 'cuisine', 'chef', 'gastronomie', 'alimentation', 'recette',
                'nourriture', 'plat', 'menu', 'traiteur', 'café', 'bar', 'bistro'
            ],
            'travel' => [
                'voyage', 'tourisme', 'hôtel', 'vacances', 'destination', 'tour',
                'agence de voyage', 'aventure', 'découverte', 'transport', 'avion',
                'plage', 'mer', 'montagne', 'camping', 'excursion', 'croisière'
            ],
            'health' => [
                'santé', 'médical', 'médecin', 'hôpital', 'clinique', 'pharmacie',
                'bien-être', 'fitness', 'sport', 'gym', 'yoga', 'nutrition',
                'thérapie', 'soin', 'massage', 'kinésithérapeute', 'dentiste'
            ],
            'education' => [
                'éducation', 'formation', 'école', 'université', 'cours', 'apprentissage',
                'enseignement', 'professeur', 'étudiant', 'pédagogie', 'stage',
                'certification', 'diplôme', 'académie', 'institut', 'tutoriel'
            ],
            'tech' => [
                'technologie', 'digital', 'informatique', 'logiciel', 'application',
                'développement', 'code', 'programmation', 'web', 'mobile', 'ia',
                'intelligence artificielle', 'robotique', 'innovation', 'startup tech',
                'saas', 'cloud', 'data', 'cybersécurité'
            ],
            'marketing' => [
                'marketing', 'publicité', 'communication', 'branding', 'réseaux sociaux',
                'seo', 'social media', 'content', 'audience', 'engagement', 'conversion',
                'campagne', 'stratégie marketing', 'digital marketing', 'influence'
            ],
            'finance' => [
                'finance', 'banque', 'investissement', 'économie', 'comptabilité',
                'argent', 'budget', 'épargne', 'bourse', 'crypto', 'assurance',
                'crédit', 'prêt', 'conseiller financier', 'patrimoine'
            ],
            'fashion' => [
                'mode', 'vêtement', 'fashion', 'boutique', 'couture', 'styliste',
                'prêt-à-porter', 'accessoire', 'chaussure', 'tendance', 'collection',
                'textile', 'design de mode', 'maroquinerie'
            ],
            'real_estate' => [
                'immobilier', 'maison', 'appartement', 'propriété', 'location',
                'vente', 'achat', 'construction', 'rénovation', 'architecture',
                'agent immobilier', 'promotion immobilière'
            ],
            'beauty' => [
                'beauté', 'cosmétique', 'coiffure', 'esthétique', 'maquillage',
                'salon', 'spa', 'parfum', 'soin de la peau', 'manucure', 'barbier'
            ],
            'automotive' => [
                'auto', 'voiture', 'automobile', 'garage', 'mécanique', 'concessionnaire',
                'véhicule', 'réparation', 'entretien', 'pièce', 'moteur'
            ],
            'art' => [
                'art', 'artiste', 'peinture', 'sculpture', 'galerie', 'musée',
                'création', 'œuvre', 'exposition', 'design', 'graphisme', 'illustration'
            ],
            'business' => [
                'business', 'entreprise', 'stratégie', 'management', 'gestion',
                'leadership', 'productivité', 'croissance', 'startup', 'entrepreneuriat',
                'consultant', 'conseil', 'service', 'projet'
            ]
        ];
        }

        // Scoring pour trouver le meilleur domaine
        $domainScores = [];
        foreach ($domainKeywords as $domain => $keywords) {
            $score = 0;
            foreach ($keywords as $keyword) {
                if (strpos($allProjectText, $keyword) !== false) {
                    // Plus de points pour les mots longs et spécifiques
                    $score += (strlen($keyword) > 7) ? 3 : (strlen($keyword) > 4 ? 2 : 1);
                }
            }
            $domainScores[$domain] = $score;
        }

        // Trouver le domaine avec le meilleur score
        $maxScore = max($domainScores);

        if ($maxScore > 0) {
            $bestDomain = array_keys($domainScores, $maxScore)[0];

            Log::info("✅ Domaine extrait du projet", [
                'project_name' => $project->name,
                'domain_scores' => $domainScores,
                'selected_domain' => $bestDomain,
                'score' => $maxScore
            ]);

            return $bestDomain;
        }

        // Fallback si aucun match
        Log::warning("⚠️ Aucun domaine détecté, fallback 'business'", [
            'project_name' => $project->name,
            'description' => substr($description, 0, 100)
        ]);

        return 'business';
    }
}
