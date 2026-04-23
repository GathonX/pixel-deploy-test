<?php

namespace App\Services\ContentGeneration;

use App\Models\Project;
use App\Models\WeeklyContentObjective;
use App\Services\OpenAI\OpenAIService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class WeeklyObjectivesService
{
    private OpenAIService $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Générer les objectifs hebdomadaires pour un projet
     */
    public function generateWeeklyObjectives(Project $project, string $weekIdentifier = null): array
    {
        try {
            $weekIdentifier = $weekIdentifier ?? $this->getCurrentWeekIdentifier();
            $weekDates = $this->getWeekDates($weekIdentifier);

            // Vérifier si déjà généré
            $existingBlog = WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'blog'
            ])->first();

            $existingSocial = WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'social_media'
            ])->first();

            if ($existingBlog && $existingSocial) {
                return [
                    'success' => true,
                    'message' => 'Objectifs déjà générés pour cette semaine',
                    'blog_objectives' => $existingBlog,
                    'social_objectives' => $existingSocial
                ];
            }

            // Récupérer le contexte du projet
            $projectContext = $this->buildProjectContext($project);

            // Générer objectifs blog
            $blogObjectives = $this->generateBlogObjectives($projectContext);
            if (!$blogObjectives['success']) {
                return $blogObjectives;
            }

            // Générer objectifs réseaux sociaux
            $socialObjectives = $this->generateSocialObjectives($projectContext);
            if (!$socialObjectives['success']) {
                return $socialObjectives;
            }

            // Sauvegarder en base
            $blogRecord = WeeklyContentObjective::updateOrCreate([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'blog'
            ], [
                'objectives' => $blogObjectives['data'],
                'week_start_date' => $weekDates['start'],
                'week_end_date' => $weekDates['end'],
                'is_generated' => true
            ]);

            $socialRecord = WeeklyContentObjective::updateOrCreate([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'social_media'
            ], [
                'objectives' => $socialObjectives['data'],
                'week_start_date' => $weekDates['start'],
                'week_end_date' => $weekDates['end'],
                'is_generated' => true
            ]);

            return [
                'success' => true,
                'blog_objectives' => $blogRecord,
                'social_objectives' => $socialRecord
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur génération objectifs hebdomadaires", [
                'project_id' => $project->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la génération des objectifs'
            ];
        }
    }

    /**
     * Construire le contexte du projet pour l'IA
     */
    private function buildProjectContext(Project $project): array
    {
        return [
            'project_name' => $project->name,
            'description' => $project->description,
            'target_audience' => $project->target_audience,
            'main_objective' => $project->main_objective,
            'business_plan' => $project->businessPlan?->content,
            'swot_analysis' => $project->swotAnalysis?->content,
            'marketing_plan' => $project->marketingPlan?->content,
            'financial_plan' => $project->financialPlan?->content
        ];
    }

    /**
     * ✅ NOUVELLE APPROCHE: Générer 1 seul objectif pour toute la semaine
     */
    private function generateBlogObjectives(array $context): array
    {
        $prompt = $this->buildBlogObjectivesPrompt($context);

        $messages = [
            [
                'role' => 'system',
                'content' => 'Tu es un expert en stratégie de contenu blog. Tu génères UN SEUL objectif stratégique pour une semaine complète, avec des mots-clés SEO et un focus spécifique qui permettra de créer 7 articles différents mais cohérents. Réponds uniquement en JSON valide.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ];

        $response = OpenAIService::generateChatCompletion($messages, 'gpt-3.5-turbo', 1500, 0.85); // ✅ Plus de variation chaque semaine

        if (isset($response['error'])) {
            return ['success' => false, 'error' => $response['error']];
        }

        $content = $response['choices'][0]['message']['content'] ?? '';
        $objective = $this->parseSingleObjective($content);

        return [
            'success' => true,
            'data' => $objective
        ];
    }

    /**
     * ✅ NOUVELLE APPROCHE: Générer 1 seul objectif pour toute la semaine
     */
    private function generateSocialObjectives(array $context): array
    {
        $prompt = $this->buildSocialObjectivesPrompt($context);

        $messages = [
            [
                'role' => 'system',
                'content' => 'Tu es un expert en stratégie de contenu réseaux sociaux. Tu génères UN SEUL objectif stratégique pour une semaine complète, adapté aux différentes plateformes, qui permettra de créer 7 posts différents mais cohérents. Réponds uniquement en JSON valide.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ];

        $response = OpenAIService::generateChatCompletion($messages, 'gpt-3.5-turbo', 1500, 0.85); // ✅ Plus de variation chaque semaine

        if (isset($response['error'])) {
            return ['success' => false, 'error' => $response['error']];
        }

        $content = $response['choices'][0]['message']['content'] ?? '';
        $objective = $this->parseSingleObjective($content);

        return [
            'success' => true,
            'data' => $objective
        ];
    }

    /**
     * Construire le prompt pour les objectifs blog
     */
    private function buildBlogObjectivesPrompt(array $context): string
    {
        $businessPlan = isset($context['business_plan']) ? $context['business_plan'] : 'Non disponible';
        
        return "Analyse ce business plan et génère UN SEUL objectif stratégique de contenu blog pour la semaine :

PROJET: {$context['project_name']}
DESCRIPTION: {$context['description']}
PUBLIC CIBLE: {$context['target_audience']}
OBJECTIF: {$context['main_objective']}
BUSINESS PLAN: {$businessPlan}

EXIGENCES:
- Cet objectif unique servira à générer 7 articles différents durant la semaine
- Chaque article aura un angle différent mais restera cohérent avec l'objectif
- Les mots-clés doivent permettre une variation de contenu
- Le thème doit être assez large pour 7 variations

FORMAT JSON REQUIS:
{
  \"theme\": \"Thème principal de la semaine\",
  \"title\": \"Titre général de l'objectif\",
  \"keywords\": [\"mot-clé1\", \"mot-clé2\", \"mot-clé3\", \"mot-clé4\", \"mot-clé5\"],
  \"seo_focus\": \"Focus SEO principal\",
  \"content_angles\": [\"Angle 1\", \"Angle 2\", \"Angle 3\", \"Angle 4\", \"Angle 5\", \"Angle 6\", \"Angle 7\"],
  \"target_audience\": \"Audience spécifique\",
  \"week_strategy\": \"Stratégie globale pour la semaine\"
}

Génère UN SEUL objectif riche qui permettra 7 variations de contenu.";
    }

    /**
     * Construire le prompt pour les objectifs réseaux sociaux
     */
    private function buildSocialObjectivesPrompt(array $context): string
    {
        $businessPlan = isset($context['business_plan']) ? $context['business_plan'] : 'Non disponible';
        
        return "Analyse ce business plan et génère UN SEUL objectif stratégique de contenu social media pour la semaine :

PROJET: {$context['project_name']}
DESCRIPTION: {$context['description']}
PUBLIC CIBLE: {$context['target_audience']}
BUSINESS PLAN: {$businessPlan}

EXIGENCES:
- Cet objectif unique servira à générer 7 posts différents durant la semaine
- Chaque post aura un angle différent mais restera cohérent avec l'objectif
- Les hashtags doivent permettre une variation de contenu
- Le thème doit être adapté aux 4 plateformes (Facebook, Instagram, Twitter, LinkedIn)

FORMAT JSON REQUIS:
{
  \"theme\": \"Thème principal de la semaine\",
  \"title\": \"Titre général de l'objectif\",
  \"keywords\": [\"hashtag1\", \"hashtag2\", \"hashtag3\", \"hashtag4\", \"hashtag5\"],
  \"content_types\": [\"Type 1\", \"Type 2\", \"Type 3\"],
  \"engagement_goals\": [\"Objectif 1\", \"Objectif 2\", \"Objectif 3\"],
  \"platform_strategies\": {
    \"facebook\": \"Stratégie Facebook\",
    \"instagram\": \"Stratégie Instagram\",
    \"twitter\": \"Stratégie Twitter\",
    \"linkedin\": \"Stratégie LinkedIn\"
  },
  \"week_strategy\": \"Stratégie globale pour la semaine\"
}

Génère UN SEUL objectif riche qui permettra 7 variations de contenu.";
    }

    /**
     * ✅ NOUVELLE APPROCHE: Parser un seul objectif
     */
    private function parseSingleObjective(string $content): array
    {
        try {
            $cleanContent = trim($content);

            if (preg_match('/^```(?:json)?\s*(.*?)\s*```$/s', $cleanContent, $matches)) {
                $cleanContent = $matches[1];
            }

            $cleanContent = trim($cleanContent);

            Log::info("📄 Parsing objectif unique IA", [
                'original_length' => strlen($content),
                'cleaned_length' => strlen($cleanContent),
                'preview' => substr($cleanContent, 0, 200)
            ]);

            $decoded = json_decode($cleanContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("❌ Erreur JSON parsing objectif unique", [
                    'error' => json_last_error_msg(),
                    'content_preview' => substr($cleanContent, 0, 500)
                ]);
                return [];
            }

            if (empty($decoded)) {
                Log::warning("⚠️ Objectif vide après parsing");
                return [];
            }

            Log::info("✅ Objectif unique parsé avec succès", [
                'theme' => isset($decoded['theme']) ? $decoded['theme'] : 'N/A'
            ]);

            return $decoded;

        } catch (\Exception $e) {
            Log::error("💥 Exception parsing objectif unique", [
                'error' => $e->getMessage(),
                'content_preview' => substr($content, 0, 500)
            ]);
            return [];
        }
    }

    /**
     * Parser les objectifs depuis la réponse IA (ancienne méthode conservée pour compatibilité)
     */
    private function parseObjectives(string $content): array
    {
        return $this->parseSingleObjective($content);
    }

    /**
     * Obtenir l'identifiant de la semaine courante
     */
    private function getCurrentWeekIdentifier(): string
    {
        return Carbon::now()->format('Y-\WW');
    }

    /**
     * Obtenir les dates de début et fin de semaine
     */
    private function getWeekDates(string $weekIdentifier): array
    {
        $year = substr($weekIdentifier, 0, 4);
        $week = substr($weekIdentifier, 6, 2);

        $startOfWeek = Carbon::now()->setISODate($year, $week)->startOfDay();
        $endOfWeek = $startOfWeek->copy()->addDays(6)->endOfDay();

        return [
            'start' => $startOfWeek,
            'end' => $endOfWeek
        ];
    }
}
