<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\AdminProjectInfo;
use App\Models\AdminWeeklyObjective;
use Illuminate\Support\Facades\Log;
use OpenAI;
use Carbon\Carbon;

class AdminObjectiveGenerationService
{
    private $client;

    public function __construct()
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            throw new \Exception('OpenAI API key is not set in the configuration.');
        }

        $this->client = OpenAI::client($apiKey);
    }

    /**
     * ✅ Générer l'objectif hebdomadaire admin à partir des idées
     */
    public function generateWeeklyObjective(AdminProjectInfo $adminInfo): array
    {
        try {
            $weekIdentifier = now()->format('Y-W');

            Log::info("🎯 [ADMIN OBJECTIVE] Génération objectif hebdomadaire", [
                'admin_id' => $adminInfo->user_id,
                'week' => $weekIdentifier
            ]);

            // Vérifier si objectif déjà généré cette semaine
            $existingObjective = AdminWeeklyObjective::where('admin_project_info_id', $adminInfo->id)
                ->where('week_identifier', $weekIdentifier)
                ->first();

            if ($existingObjective) {
                Log::info("ℹ️ [ADMIN OBJECTIVE] Objectif déjà existant", [
                    'objective_id' => $existingObjective->id
                ]);

                return [
                    'success' => true,
                    'data' => $existingObjective,
                    'is_new' => false
                ];
            }

            // Préparer le contexte pour l'IA
            $formattedIdeas = $adminInfo->getFormattedIdeasForAI();

            $prompt = $this->buildObjectivePrompt($formattedIdeas);

            Log::info("📝 [ADMIN OBJECTIVE] Appel OpenAI", [
                'prompt_length' => strlen($prompt)
            ]);

            // Appeler OpenAI
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => "Tu es un expert en stratégie de contenu et marketing digital. Tu génères des objectifs hebdomadaires de contenu cohérents et engageants."
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 1500,
                'temperature' => 0.8
            ]);

            $content = $response->choices[0]->message->content;

            Log::info("✅ [ADMIN OBJECTIVE] Réponse OpenAI reçue", [
                'content_length' => strlen($content)
            ]);

            // Parser la réponse
            $parsed = $this->parseObjectiveResponse($content);

            // Créer l'objectif en base
            $objective = AdminWeeklyObjective::create([
                'admin_project_info_id' => $adminInfo->id,
                'user_id' => $adminInfo->user_id,
                'week_identifier' => $weekIdentifier,
                'week_start_date' => now()->startOfWeek(),
                'week_end_date' => now()->endOfWeek(),
                'objective_text' => $parsed['objective'],
                'daily_topics' => $parsed['daily_topics'],
                'keywords_focus' => $parsed['keywords'],
                'is_generated' => true,
                'posts_generated_count' => 0,
                'posts_target_count' => $adminInfo->posts_per_week
            ]);

            // Marquer l'info admin comme générée
            $adminInfo->markObjectiveGenerated();

            Log::info("✅ [ADMIN OBJECTIVE] Objectif créé avec succès", [
                'objective_id' => $objective->id,
                'week' => $weekIdentifier
            ]);

            return [
                'success' => true,
                'data' => $objective,
                'is_new' => true
            ];

        } catch (\Exception $e) {
            Log::error("❌ [ADMIN OBJECTIVE] Erreur génération", [
                'admin_id' => $adminInfo->user_id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ Construire le prompt pour générer l'objectif
     */
    private function buildObjectivePrompt(string $formattedIdeas): string
    {
        return <<<PROMPT
Génère un objectif hebdomadaire de contenu cohérent et engageant pour la semaine du {$this->getWeekDateRange()}.

CONTEXTE DU PROJET :
{$formattedIdeas}

MISSION :
Crée un objectif de contenu pour cette semaine qui soit :
1. Aligné avec les objectifs business
2. Engageant pour le public cible
3. Optimisé SEO avec les mots-clés pertinents
4. Déclinable en 7 posts quotidiens

FORMAT DE RÉPONSE (strictement respecter ce format JSON) :
{
    "objective": "Objectif principal de la semaine en 1-2 phrases claires",
    "daily_topics": [
        "Lundi : Sujet spécifique",
        "Mardi : Sujet spécifique",
        "Mercredi : Sujet spécifique",
        "Jeudi : Sujet spécifique",
        "Vendredi : Sujet spécifique",
        "Samedi : Sujet spécifique",
        "Dimanche : Sujet spécifique"
    ],
    "keywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3", "mot-clé 4", "mot-clé 5"]
}

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans texte additionnel.
PROMPT;
    }

    /**
     * ✅ Parser la réponse JSON de l'IA
     */
    private function parseObjectiveResponse(string $content): array
    {
        try {
            // Nettoyer le contenu (supprimer markdown code blocks si présents)
            $content = preg_replace('/```json\s*|\s*```/', '', $content);
            $content = trim($content);

            $data = json_decode($content, true);

            if (!$data || !isset($data['objective'])) {
                throw new \Exception('Format de réponse invalide');
            }

            return [
                'objective' => $data['objective'] ?? 'Objectif non défini',
                'daily_topics' => $data['daily_topics'] ?? [],
                'keywords' => $data['keywords'] ?? []
            ];

        } catch (\Exception $e) {
            Log::error("❌ [ADMIN OBJECTIVE] Erreur parsing réponse", [
                'error' => $e->getMessage(),
                'content' => $content
            ]);

            // Fallback : parser manuel simple
            return [
                'objective' => 'Créer du contenu engageant et pertinent pour cette semaine',
                'daily_topics' => $this->getDefaultDailyTopics(),
                'keywords' => []
            ];
        }
    }

    /**
     * ✅ Obtenir sujets quotidiens par défaut (fallback)
     */
    private function getDefaultDailyTopics(): array
    {
        return [
            "Lundi : Introduction et contexte",
            "Mardi : Analyse approfondie",
            "Mercredi : Conseils pratiques",
            "Jeudi : Études de cas",
            "Vendredi : Résumé et perspectives",
            "Samedi : Contenu léger et inspirant",
            "Dimanche : Préparation de la semaine suivante"
        ];
    }

    /**
     * ✅ Obtenir la plage de dates de la semaine
     */
    private function getWeekDateRange(): string
    {
        $start = now()->startOfWeek()->format('d/m/Y');
        $end = now()->endOfWeek()->format('d/m/Y');

        return "{$start} au {$end}";
    }

    /**
     * ✅ Vérifier si génération nécessaire cette semaine
     */
    public function needsGenerationThisWeek(AdminProjectInfo $adminInfo): bool
    {
        if (!$adminInfo->isAutoGenerationEnabled()) {
            return false;
        }

        return !$adminInfo->hasObjectiveThisWeek();
    }
}
