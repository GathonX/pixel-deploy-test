<?php

namespace App\Services\OpenAI;

use App\Models\User;
use OpenAI;
use App\Models\Project;
use App\Models\MarketingPlan;
use App\Models\SwotAnalysis;
use App\Models\BlueOceanStrategy;
use App\Models\Sprint;
use Illuminate\Support\Facades\Log;
use Exception;

class SprintGenerationService
{
    private $client;
    private $userLanguage;
    private $contextUserId; // ✅ NOUVEAU : Pour stocker l'ID utilisateur dans le contexte

    public function __construct(?int $userId = null)
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            throw new Exception('OpenAI API key is not set in the configuration.');
        }

        $this->client = OpenAI::client($apiKey);

        // ✅ NOUVEAU : Stocker l'ID utilisateur si fourni
        $this->contextUserId = $userId;

        // Set user language
        $this->userLanguage = $this->getUserLanguage();
    }

    /**
     * Get the current user's preferred language
     *
     * @return string
     */
    private function getUserLanguage(): string
    {
        try {
            // ✅ AMÉLIORATION : Essayer d'abord avec le contexte utilisateur (pour les jobs)
            if ($this->contextUserId) {
                $user = User::find($this->contextUserId);
                if ($user && isset($user->language)) {
                    Log::info('✅ [SprintService] Langue détectée depuis contexte job', [
                        'user_id' => $this->contextUserId,
                        'language' => $user->language,
                        'mapped_language' => $this->mapLanguageToFullName($user->language)
                    ]);
                    return $this->mapLanguageToFullName($user->language);
                }
            }

            // Fallback: essayer auth()->user() (pour les requêtes HTTP)
            $user = auth()->user();
            if ($user && isset($user->language)) {
                Log::info('✅ [SprintService] Langue détectée depuis auth()->user()', [
                    'user_id' => $user->id,
                    'language' => $user->language,
                    'mapped_language' => $this->mapLanguageToFullName($user->language)
                ]);
                return $this->mapLanguageToFullName($user->language);
            }
        } catch (Exception $e) {
            Log::warning('⚠️ [SprintService] Erreur détection langue: ' . $e->getMessage());
        }

        Log::info('ℹ️ [SprintService] Utilisation langue par défaut (French)');
        return 'French'; // Default fallback
    }

    /**
     * Map language codes to full language names
     * 
     * @param string $languageCode
     * @return string
     */
    private function mapLanguageToFullName(string $languageCode): string
    {
        $languageMap = [
            'french' => 'French',
            'english' => 'English',
            'spanish' => 'Spanish',
            'german' => 'German',
            'chinese' => 'Chinese',
            'arabic' => 'Arabic',
            'portuguese' => 'Portuguese',
            'russian' => 'Russian',
            'japanese' => 'Japanese',
            'hindi' => 'Hindi'
        ];

        return $languageMap[$languageCode] ?? 'French';
    }

    /**
     * Create an instance with a specific language
     * 
     * @param string $language
     * @return SprintGenerationService
     */
    public static function withLanguage(string $language): self
    {
        $instance = new self();
        $instance->userLanguage = $instance->mapLanguageToFullName($language);
        return $instance;
    }

    /**
     * Generate tasks for a weekly sprint based on business data
     * 
     * @param int $projectId The ID of the project
     * @param \DateTime $startDate The start date of the sprint (Monday)
     * @param \DateTime $endDate The end date of the sprint (Sunday)
     * @return array The generated sprint with daily tasks
     */
    public function generateWeeklySprint(int $projectId, \DateTime $startDate, \DateTime $endDate)
    {
        try {
            // Retrieve project data
            $project = Project::find($projectId);
            if (!$project) {
                return [
                    'success' => false,
                    'error' => 'Project not found'
                ];
            }

            $projectOnBoardingData = '';

            // Retrieve business data
            $businessPlan = null;
            $marketingPlan = MarketingPlan::where('project_id', $projectId)->first();
            $swotAnalysis = SwotAnalysis::where('project_id', $projectId)->first();
            $blueOceanStrategy = BlueOceanStrategy::where('project_id', $projectId)->first();

            $assistantSharedContent = '';

            // ✅ NOUVEAU : Récupérer les objectifs hebdomadaires (blog + social)
            $weeklyObjectives = $this->getWeeklyObjectives($project);
            Log::info('🎯 [SprintGeneration] Weekly objectives retrieved', [
                'user_id' => $project->user_id,
                'has_blog_objectives' => !empty($weeklyObjectives['blog']),
                'has_social_objectives' => !empty($weeklyObjectives['social'])
            ]);

            // Build the context for OpenAI avec objectifs hebdomadaires
            $context = $this->buildSprintContext($project, $businessPlan, $marketingPlan, $swotAnalysis, $blueOceanStrategy, $assistantSharedContent, $weeklyObjectives);

            // Enhanced prompt for better task generation with user language
            $systemPrompt = "You are an expert AI business sprint planner. Your mission is to create comprehensive weekly sprint plans that drive real business growth. You must respond in " . $this->userLanguage . ".
            
CRITICAL REQUIREMENTS:
1. Generate EXACTLY 7 days of tasks (Monday through Sunday)
2. Each day MUST have EXACTLY 6 tasks (not more, not less)
3. Tasks must be diverse: mix strategic thinking, operational work, marketing activities, and business development
4. Each task must be specific, actionable, and measurable
5. Balance urgent/important tasks across the week
6. Include both quick wins (15-30 min) and substantial work (1-3 hours)
7. All content must be generated in " . $this->userLanguage . "
8. Use the language from the following data for context but respond in " . $this->userLanguage . ":
// start of data
{$projectOnBoardingData}
// end of data

🤖 IMPORTANT: If the context includes 'CONNAISSANCES BUSINESS DE L'UTILISATEUR' (user's business knowledge from analyzed documents), use this information extensively to create highly personalized and contextual tasks. These insights come from the user's own documents and should be prioritized for task creation.

🎯 CRITICAL: The context includes WEEKLY CONTENT OBJECTIVES (blog and social media). You MUST align sprint tasks with these objectives:
- Blog objective defines the content strategy for the week
- Social media objective defines the communication strategy
- Create tasks that support these content/communication goals
- Include tasks for content creation, promotion, and engagement based on these objectives

TASK TYPES TO INCLUDE:
- Mission/Vision: Strategic planning, goal setting, vision work
- Objective: Specific measurable goals and milestones
- Action: Concrete marketing and business activities

DAILY FOCUS AREAS:
- Monday: Planning, strategy, goal setting
- Tuesday: Market research, competitive analysis
- Wednesday: Content creation, marketing materials
- Thursday: Customer engagement, networking
- Friday: Operations, systems, processes
- Saturday: Creative work, innovation, partnerships
- Sunday: Review, analysis, planning ahead

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  \"title\": \"Sprint Week [X] - [Focus Theme]\",
  \"description\": \"Brief description of week's main objectives\",
  \"days\": {
    \"Monday\": [
      {\"title\": \"Task title\", \"description\": \"Detailed actionable description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|low|normal\"},
      ...
    ],
    \"Tuesday\": [...],
    \"Wednesday\": [...],
    \"Thursday\": [...],
    \"Friday\": [...],
    \"Saturday\": [...],
    \"Sunday\": [...]
  }
}";

            // Call OpenAI API to generate sprint content
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => "Generate a comprehensive weekly sprint plan for this business:\n\n" . $context
                    ]
                ],
                'temperature' => 0.8,
                'max_tokens' => 4000
            ]);

            // Get the content from response
            $content = $response->choices[0]->message->content;

            // Clean the response to ensure it's valid JSON
            $content = trim($content);
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }

            // Parse the JSON response
            $sprintData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON parsing error: ' . json_last_error_msg());
                Log::error('Raw content: ' . $content);

                // Fallback: generate default sprint structure
                $sprintData = $this->generateDefaultSprintStructure($project);
            }

            // Validate and ensure all days have tasks
            $sprintData = $this->validateAndEnhanceSprintData($sprintData, $project);

            return [
                'success' => true,
                'sprint' => $sprintData
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error when generating sprint: ' . $e->getMessage());

            // Return fallback sprint
            return [
                'success' => true,
                'sprint' => $this->generateDefaultSprintStructure($project)
            ];
        }
    }

    /**
     * Generate additional tasks for a specific day if needed
     * 
     * @param int $sprintId The ID of the sprint
     * @param string $dayOfWeek The day of the week (Monday, Tuesday, etc.)
     * @param int $count Number of tasks to generate
     * @return array The generated tasks
     */
    public function generateDailyTasks(int $sprintId, string $dayOfWeek, int $count = 6)
    {
        try {
            // Get sprint data
            $sprint = Sprint::with('tasks')->find($sprintId);
            if (!$sprint) {
                return [
                    'success' => false,
                    'error' => 'Sprint not found'
                ];
            }

            // Get project data
            $project = $sprint->project;
            if (!$project) {
                return [
                    'success' => false,
                    'error' => 'Project not found'
                ];
            }

            // Retrieve business data
            $businessPlan = null;
            $marketingPlan = MarketingPlan::where('project_id', $project->id)->first();

            $assistantSharedContent = '';

            // Get existing tasks for that day
            $existingTasks = $sprint->tasks()
                ->whereRaw("DATE_FORMAT(scheduled_date, '%W') = ?", [$dayOfWeek])
                ->get()
                ->map(function ($task) {
                    return [
                        'title' => $task->title,
                        'description' => $task->description,
                        'type' => $task->type
                    ];
                });

            // Build context for AI
            $context = "Sprint title: {$sprint->title}\n";
            $context .= "Sprint description: {$sprint->description}\n";
            $context .= "Day of the week: {$dayOfWeek}\n\n";

            if ($businessPlan) {
                $businessPlanContent = $businessPlan->text_content;
                if (is_string($businessPlanContent)) {
                    $context .= "Business Plan Summary:\n" . substr($businessPlanContent, 0, 1000) . "\n\n";
                } elseif (is_array($businessPlanContent)) {
                    $context .= "Business Plan Summary:\n" . json_encode($businessPlanContent, JSON_PRETTY_PRINT) . "\n\n";
                }
            }

            if ($marketingPlan) {
                $marketingPlanContent = $marketingPlan->content;
                if (is_string($marketingPlanContent)) {
                    $context .= "Marketing Plan Summary:\n" . substr($marketingPlanContent, 0, 1000) . "\n\n";
                } elseif (is_array($marketingPlanContent)) {
                    $context .= "Marketing Plan Summary:\n" . json_encode($marketingPlanContent, JSON_PRETTY_PRINT) . "\n\n";
                }
            }

            // ✅ NOUVEAU : Ajouter le contenu partagé avec l'assistant
            if (!empty($assistantSharedContent)) {
                $context .= "\n" . str_repeat("=", 60) . "\n";
                $context .= "🤖 DOCUMENTS ANALYSÉS PAR L'UTILISATEUR :\n";
                $context .= str_repeat("=", 60) . "\n";
                $context .= $assistantSharedContent . "\n";
                $context .= str_repeat("=", 60) . "\n\n";
            }

            $context .= "Existing tasks for this day:\n";
            foreach ($existingTasks as $task) {
                $context .= "- {$task['title']}: {$task['description']}\n";
            }

            $context .= "\nPlease generate {$count} new tasks for {$dayOfWeek} that are different from the existing tasks.";

            // ✅ NOUVEAU : Instructions spécifiques pour utiliser le contenu assistant
            if (!empty($assistantSharedContent)) {
                $context .= "\n\nIMPORTANT: Utilisez prioritairement les 'DOCUMENTS ANALYSÉS PAR L'UTILISATEUR' pour créer des tâches personnalisées et contextuelles. Ces informations viennent directement des documents de l'utilisateur et doivent inspirer au moins 50% des tâches générées.";
            }

            // Enhanced system prompt
            $systemPrompt = "You are an AI task planner specialized in creating personalized business tasks. Generate daily business tasks that are specific, actionable, and relevant to the business context. Format your response as JSON with an array of tasks. Each task should have title, description, type (mission, vision, objective, or action), and priority (high, medium, low, or normal). You must respond in " . $this->userLanguage . ".";

            if (!empty($assistantSharedContent)) {
                $systemPrompt .= "\n\n🤖 CRITICAL: If the context includes 'DOCUMENTS ANALYSÉS PAR L'UTILISATEUR' (user's analyzed documents), use this information as the PRIMARY SOURCE for task creation. These insights come from the user's own business documents and should drive the majority of your task suggestions.";
            }

            // Call OpenAI API
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $context
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 2000
            ]);

            // Parse the response
            $content = $response->choices[0]->message->content;

            // Clean JSON if needed
            $content = trim($content);
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }

            $tasksData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    'success' => false,
                    'error' => 'Failed to parse tasks data',
                    'details' => json_last_error_msg()
                ];
            }

            return [
                'success' => true,
                'tasks' => $tasksData['tasks'] ?? $tasksData
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error when generating daily tasks: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to generate tasks. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Build context for sprint generation from business data
     * 
     * @param Project $project
     * @param BusinessPlan|null $businessPlan
     * @param MarketingPlan|null $marketingPlan
     * @param SwotAnalysis|null $swotAnalysis
     * @param BlueOceanStrategy|null $blueOceanStrategy
     * @return string
     */
    private function buildSprintContext($project, $businessPlan, $marketingPlan, $swotAnalysis, $blueOceanStrategy, $assistantSharedContent = '', $weeklyObjectives = [])
    {
        $context = "Project: {$project->name}\n";
        if ($project->description) {
            $context .= "Description: {$project->description}\n\n";
        }

        if ($businessPlan) {
            $businessPlanContent = $businessPlan->text_content;
            if (is_string($businessPlanContent)) {
                $context .= "Business Plan Summary:\n" . substr($businessPlanContent, 0, 1000) . "\n\n";
            } elseif (is_array($businessPlanContent)) {
                $context .= "Business Plan Summary:\n" . json_encode($businessPlanContent, JSON_PRETTY_PRINT) . "\n\n";
            }
        }

        if ($marketingPlan) {
            $marketingPlanContent = $marketingPlan->content;
            if (is_string($marketingPlanContent)) {
                $context .= "Marketing Plan Summary:\n" . substr($marketingPlanContent, 0, 1000) . "\n\n";
            } elseif (is_array($marketingPlanContent)) {
                $context .= "Marketing Plan Summary:\n" . json_encode($marketingPlanContent, JSON_PRETTY_PRINT) . "\n\n";
            }
        }

        if ($swotAnalysis) {
            $swotContent = $swotAnalysis->content;
            if (is_string($swotContent)) {
                $swotContent = json_decode($swotContent, true);
            }
            $context .= "SWOT Analysis:\n";

            if (isset($swotContent['forces']) && is_array($swotContent['forces'])) {
                $context .= "Strengths: " . implode(", ", array_slice($swotContent['forces'], 0, 3)) . "\n";
            }

            if (isset($swotContent['faiblesses']) && is_array($swotContent['faiblesses'])) {
                $context .= "Weaknesses: " . implode(", ", array_slice($swotContent['faiblesses'], 0, 3)) . "\n";
            }

            if (isset($swotContent['opportunites']) && is_array($swotContent['opportunites'])) {
                $context .= "Opportunities: " . implode(", ", array_slice($swotContent['opportunites'], 0, 3)) . "\n";
            }

            if (isset($swotContent['menaces']) && is_array($swotContent['menaces'])) {
                $context .= "Threats: " . implode(", ", array_slice($swotContent['menaces'], 0, 3)) . "\n";
            }

            $context .= "\n";
        }

        if ($blueOceanStrategy) {
            $blueOceanContent = $blueOceanStrategy->content;
            if (is_string($blueOceanContent)) {
                $blueOceanContent = json_decode($blueOceanContent, true);
            }
            $context .= "Blue Ocean Strategy:\n";

            if (isset($blueOceanContent['facteursCles']) && is_array($blueOceanContent['facteursCles'])) {
                $context .= "Key Factors: " . implode(", ", array_slice($blueOceanContent['facteursCles'], 0, 3)) . "\n";
            }

            $context .= "\n";
        }

        // ✅ NOUVEAU : Ajouter le contenu partagé avec l'assistant
        if (!empty($assistantSharedContent)) {
            $context .= "\n" . str_repeat("=", 80) . "\n";
            $context .= "🤖 DOCUMENTS ANALYSÉS PAR L'UTILISATEUR (SOURCE PRIORITAIRE) :\n";
            $context .= str_repeat("=", 80) . "\n";
            $context .= $assistantSharedContent . "\n";
            $context .= str_repeat("=", 80) . "\n\n";

            Log::info('🤖 [SprintGeneration] Assistant content added to context', [
                'content_length' => strlen($assistantSharedContent),
                'context_total_length' => strlen($context)
            ]);
        }

        // ✅ NOUVEAU : Ajouter les objectifs hebdomadaires (blog + social)
        if (!empty($weeklyObjectives)) {
            $context .= "\n" . str_repeat("=", 80) . "\n";
            $context .= "🎯 OBJECTIFS DE CONTENU DE LA SEMAINE (PRIORITÉ ABSOLUE) :\n";
            $context .= str_repeat("=", 80) . "\n";
            
            if (!empty($weeklyObjectives['blog'])) {
                $blogObj = $weeklyObjectives['blog'];
                $context .= "\n📝 OBJECTIF BLOG DE LA SEMAINE :\n";
                $context .= "Thème : " . ($blogObj['theme'] ?? 'N/A') . "\n";
                $context .= "Mots-clés : " . implode(', ', $blogObj['keywords'] ?? []) . "\n";
                $context .= "Focus SEO : " . ($blogObj['seo_focus'] ?? 'N/A') . "\n";
                if (!empty($blogObj['content_angles'])) {
                    $context .= "Angles de contenu : " . implode(', ', $blogObj['content_angles']) . "\n";
                }
                $context .= "\n";
            }
            
            if (!empty($weeklyObjectives['social'])) {
                $socialObj = $weeklyObjectives['social'];
                $context .= "📱 OBJECTIF RÉSEAUX SOCIAUX DE LA SEMAINE :\n";
                $context .= "Thème : " . ($socialObj['theme'] ?? 'N/A') . "\n";
                $context .= "Mots-clés : " . implode(', ', $socialObj['keywords'] ?? []) . "\n";
                $context .= "Message clé : " . ($socialObj['key_message'] ?? 'N/A') . "\n";
                if (!empty($socialObj['hashtags'])) {
                    $context .= "Hashtags : " . implode(', ', $socialObj['hashtags']) . "\n";
                }
                $context .= "\n";
            }
            
            $context .= str_repeat("=", 80) . "\n\n";
            
            Log::info('🎯 [SprintGeneration] Weekly objectives added to context', [
                'has_blog' => !empty($weeklyObjectives['blog']),
                'has_social' => !empty($weeklyObjectives['social'])
            ]);
        }

        $context .= "Requirements:\n";
        $context .= "1. Generate a weekly sprint with a clear title and description\n";
        $context .= "2. For each day (Monday through Sunday), create EXACTLY 6 tasks\n";
        $context .= "3. Each task should have a title, description, type (mission, vision, objective, or action), and priority (high, medium, low, or normal)\n";
        $context .= "4. Tasks must be specific, actionable, and directly related to the business context\n";
        $context .= "5. Include a good mix of strategic and tactical tasks\n";
        $context .= "6. Format the output as structured JSON\n";

        // ✅ NOUVEAU : Instructions spécifiques pour l'utilisation du contenu assistant
        $instructionNumber = 7;
        if (!empty($assistantSharedContent)) {
            $context .= "{$instructionNumber}. PRIORITÉ ABSOLUE : Utilisez les 'DOCUMENTS ANALYSÉS PAR L'UTILISATEUR' ci-dessus pour créer des tâches personnalisées et contextuelles. Ces informations viennent directement des documents de l'utilisateur et doivent être au cœur de la planification du sprint.\n";
            $instructionNumber++;
            $context .= "{$instructionNumber}. Créez des tâches qui exploitent spécifiquement les insights, recommandations et opportunités identifiés dans les documents analysés.\n";
            $instructionNumber++;
            $context .= "{$instructionNumber}. Assurez-vous que chaque jour contient au moins 2-3 tâches directement inspirées des connaissances business de l'utilisateur.\n";
            $instructionNumber++;
        }

        // ✅ NOUVEAU : Instructions pour utilisation des objectifs hebdomadaires
        if (!empty($weeklyObjectives)) {
            $context .= "{$instructionNumber}. CRITIQUE : Les 'OBJECTIFS DE CONTENU DE LA SEMAINE' définissent la stratégie de contenu. Créez des tâches qui supportent ces objectifs :\n";
            $instructionNumber++;
            $context .= "   - Mercredi : Tâches de création de contenu blog basées sur le thème et les angles définis\n";
            $context .= "   - Jeudi : Tâches de création de posts sociaux alignés avec le message clé\n";
            $context .= "   - Vendredi : Tâches de promotion et optimisation SEO basées sur les mots-clés\n";
            $context .= "{$instructionNumber}. Intégrez les mots-clés, hashtags et angles de contenu dans les descriptions des tâches.\n";
            $instructionNumber++;
            $context .= "{$instructionNumber}. Chaque semaine doit avoir au moins 3-4 tâches directement liées aux objectifs de contenu.\n";
        }

        return $context;
    }

    /**
     * ✅ Récupérer les objectifs hebdomadaires (blog + social)
     */
    private function getWeeklyObjectives($project): array
    {
        try {
            $weekIdentifier = \Carbon\Carbon::now()->format('Y-\WW');
            
            $blogObjective = \App\Models\WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'blog'
            ])->first();
            
            $socialObjective = \App\Models\WeeklyContentObjective::where([
                'project_id' => $project->id,
                'week_identifier' => $weekIdentifier,
                'content_type' => 'social_media'
            ])->first();
            
            return [
                'blog' => $blogObjective ? $blogObjective->objectives : null,
                'social' => $socialObjective ? $socialObjective->objectives : null
            ];
        } catch (\Exception $e) {
            Log::warning('⚠️ [SprintGeneration] Could not retrieve weekly objectives: ' . $e->getMessage());
            return [];
        }
    }

    private function generateDefaultSprintStructure($project)
    {
        // Try to generate default content using AI in the user's preferred language
        try {
            $prompt = "Generate a default weekly sprint structure for a business project named '{$project->name}'. Create tasks for each day of the week (Monday through Sunday) with 6 tasks per day. Each task should have: title, description, type (mission, vision, objective, or action), and priority (high, medium, low, or normal). Focus on general business activities like planning, marketing, operations, and growth.";

            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a business sprint planner. Generate default weekly sprint content in ' . $this->userLanguage . '. Return only valid JSON with this exact structure: {"title": "Sprint title", "description": "Sprint description", "days": {"Monday": [{"title": "Task title", "description": "Task description", "type": "mission|vision|objective|action", "priority": "high|medium|low|normal"}], "Tuesday": [...], "Wednesday": [...], "Thursday": [...], "Friday": [...], "Saturday": [...], "Sunday": [...]}}'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 3000
            ]);

            $content = $response->choices[0]->message->content;

            // Clean the response
            $content = trim($content);
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }

            $sprintData = json_decode($content, true);

            if (json_last_error() === JSON_ERROR_NONE && isset($sprintData['days'])) {
                // Validate that we have all 7 days
                $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                $hasAllDays = true;
                foreach ($daysOfWeek as $day) {
                    if (!isset($sprintData['days'][$day]) || !is_array($sprintData['days'][$day]) || count($sprintData['days'][$day]) < 3) {
                        $hasAllDays = false;
                        break;
                    }
                }

                if ($hasAllDays) {
                    return $sprintData;
                }
            }
        } catch (Exception $e) {
            Log::warning('Failed to generate AI-powered default sprint: ' . $e->getMessage());
        }

        // Fallback: Generate localized content based on user language
        $defaultContent = $this->getLocalizedDefaultContent($project);
        return $defaultContent;
    }

    /**
     * Get localized default content based on user language
     */
    /**
     * ✅ NOUVELLE MÉTHODE : Génère seulement les tâches du jour actuel
     * 
     * @param int $projectId
     * @param \DateTime $currentDate
     * @return array
     */
    public function generateCurrentDayTasks(int $projectId, \DateTime $currentDate): array
    {
        try {
            $dayOfWeek = $currentDate->format('l'); // Monday, Tuesday, etc.
            
            Log::info("🎯 [SPRINT-OPTIMIZED] Génération jour actuel seulement", [
                'project_id' => $projectId,
                'day_of_week' => $dayOfWeek,
                'date' => $currentDate->format('Y-m-d')
            ]);

            // Récupérer le projet
            $project = Project::find($projectId);
            if (!$project) {
                return [
                    'success' => false,
                    'error' => 'Project not found'
                ];
            }

            // Construire le contexte
            $context = $this->buildOptimizedContext($project, $dayOfWeek);

            // Prompt optimisé pour un seul jour - FORCÉ EN FRANÇAIS
            $systemPrompt = "Vous êtes un expert en planification de tâches business. Générez EXACTEMENT 6 tâches de haute qualité pour {$dayOfWeek} UNIQUEMENT. Vous DEVEZ répondre en " . $this->userLanguage . ".

EXIGENCES CRITIQUES:
1. Générer des tâches pour {$dayOfWeek} UNIQUEMENT
2. Créer EXACTEMENT 6 tâches (ni plus, ni moins)
3. Chaque tâche doit être spécifique, actionnable et mesurable
4. Mélanger différents types: mission, vision, objective, action
5. Équilibrer les priorités: 2 high, 2 medium, 2 normal
6. TOUT le contenu doit être en " . $this->userLanguage . "

FORMAT DE SORTIE: Retourner UNIQUEMENT du JSON valide avec cette structure exacte:
{
  \"day\": \"{$dayOfWeek}\",
  \"tasks\": [
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"}
  ]
}";

            // Appel OpenAI optimisé
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => "Générez 6 tâches pour {$dayOfWeek} pour ce business:\n\n" . $context
                    ]
                ],
                'temperature' => 0.8,
                'max_tokens' => 1500 // Réduit car seulement 6 tâches
            ]);

            // Parser la réponse
            $content = $response->choices[0]->message->content;
            $content = trim($content);
            
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }

            $dayData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('JSON parsing error for current day: ' . json_last_error_msg());
                // Fallback avec tâches par défaut
                return $this->generateDefaultCurrentDayTasks($project, $dayOfWeek);
            }

            // Valider la structure
            if (!isset($dayData['tasks']) || !is_array($dayData['tasks'])) {
                return $this->generateDefaultCurrentDayTasks($project, $dayOfWeek);
            }

            Log::info("✅ [SPRINT-OPTIMIZED] Jour actuel généré avec succès", [
                'project_id' => $projectId,
                'day_of_week' => $dayOfWeek,
                'tasks_count' => count($dayData['tasks'])
            ]);

            return [
                'success' => true,
                'day' => $dayOfWeek,
                'tasks' => $dayData['tasks'],
                'date' => $currentDate->format('Y-m-d')
            ];

        } catch (\Exception $e) {
            Log::error('Error generating current day tasks: ' . $e->getMessage());
            return $this->generateDefaultCurrentDayTasks($project, $dayOfWeek ?? 'Monday');
        }
    }

    /**
     * ✅ NOUVELLE MÉTHODE : Génère les tâches des jours futurs (différé)
     * 
     * @param int $projectId
     * @param \DateTime $currentDate
     * @return array
     */
    public function generateRemainingDaysTasks(int $projectId, \DateTime $currentDate, bool $includeCurrentDay = false): array
    {
        try {
            $currentDayOfWeek = $currentDate->format('l');
            $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            // ✅ CORRECTION : Inclure le jour actuel si demandé (pour régénération automatique)
            $currentDayIndex = array_search($currentDayOfWeek, $daysOfWeek);
            $startIndex = $includeCurrentDay ? $currentDayIndex : $currentDayIndex + 1;
            $futureDays = array_slice($daysOfWeek, $startIndex);

            Log::info("📅 [SPRINT-OPTIMIZED] Génération jours", [
                'project_id' => $projectId,
                'current_day' => $currentDayOfWeek,
                'include_current_day' => $includeCurrentDay,
                'days_to_generate' => $futureDays,
                'days_count' => count($futureDays)
            ]);

            if (empty($futureDays)) {
                Log::info("ℹ️ [SPRINT-OPTIMIZED] Aucun jour futur à générer");
                return [
                    'success' => true,
                    'days' => [],
                    'message' => 'No future days to generate'
                ];
            }

            // Récupérer le projet
            $project = Project::find($projectId);
            if (!$project) {
                return [
                    'success' => false,
                    'error' => 'Project not found'
                ];
            }

            // Construire le contexte
            $context = $this->buildOptimizedContext($project);

            // ✅ GÉNÉRER UN JOUR À LA FOIS pour éviter la surcharge de tokens
            $allFutureDays = [];
            
            Log::info("🎯 [SPRINT-FUTURE] Génération jour par jour", [
                'project_id' => $projectId,
                'future_days' => $futureDays,
                'method' => 'individual_day_generation'
            ]);

            foreach ($futureDays as $dayName) {
                try {
                    // Utiliser la même méthode que le jour actuel mais pour chaque jour futur
                    $dayResult = $this->generateSingleDayTasks($project, $dayName, $context);
                    
                    if ($dayResult['success'] && isset($dayResult['tasks'])) {
                        $allFutureDays[$dayName] = $dayResult['tasks'];
                        
                        Log::info("✅ [SPRINT-FUTURE] Jour généré avec succès", [
                            'project_id' => $projectId,
                            'day' => $dayName,
                            'tasks_count' => count($dayResult['tasks'])
                        ]);
                    } else {
                        Log::error("❌ [SPRINT-FUTURE] Échec génération jour", [
                            'project_id' => $projectId,
                            'day' => $dayName,
                            'error' => $dayResult['error'] ?? 'Unknown error'
                        ]);
                        
                        // Pour ce jour spécifique, utiliser fallback mais continuer les autres
                        throw new \Exception("Failed to generate day: {$dayName}");
                    }
                    
                } catch (\Exception $e) {
                    Log::warning("⚠️ [SPRINT-FUTURE] Jour échoué, skip pour l'instant", [
                        'project_id' => $projectId,
                        'day' => $dayName,
                        'error' => $e->getMessage()
                    ]);
                    
                    // Skip ce jour et continuer les autres
                    continue;
                }
            }

            if (count($allFutureDays) > 0) {
                Log::info("✅ [SPRINT-FUTURE] Génération réussie", [
                    'project_id' => $projectId,
                    'successfully_generated_days' => array_keys($allFutureDays),
                    'total_days' => count($allFutureDays)
                ]);

                return [
                    'success' => true,
                    'future_days' => $allFutureDays,
                    'generated_count' => count($allFutureDays)
                ];
            } else {
                Log::error("💥 [SPRINT-FUTURE] Aucun jour généré avec succès", [
                    'project_id' => $projectId,
                    'attempted_days' => $futureDays
                ]);
                
                throw new \Exception("Failed to generate any future days with AI");
            }

        } catch (\Exception $e) {
            Log::error("❌ [SPRINT-FUTURE] Erreur génération OpenAI", [
                'project_id' => $projectId,
                'error' => $e->getMessage(),
                'attempting_retry' => true
            ]);
            
            // ✅ RETRY avec prompt simplifié avant fallback
            return $this->retryWithSimplifiedPrompt($project, $futureDays, $context);
        }
    }

    /**
     * ✅ MÉTHODE HELPER : Construit un contexte optimisé
     */
    private function buildOptimizedContext($project, $specificDay = null): string
    {
        // ✅ NETTOYAGE UTF-8: Utiliser TOUTES les données projet avec nettoyage automatique
        $projectName = $this->cleanUTF8($project->name);
        $context = "Project: {$projectName}\n";

        if ($project->description) {
            $description = $this->cleanUTF8($project->description);
            $context .= "Description: {$description}\n\n";
        }

        if ($specificDay) {
            $context .= "Focus Day: {$specificDay}\n";
        }

        return $context;
    }

    /**
     * Nettoyage UTF-8 robuste pour gérer les caractères malformés automatiquement
     */
    private function cleanUTF8(string $text): string
    {
        if (empty($text)) {
            return '';
        }

        // Étape 1: Supprimer les caractères invalides avec iconv
        $text = iconv('UTF-8', 'UTF-8//IGNORE', $text);

        // Étape 2: Si toujours pas UTF-8 valide, essayer conversion depuis ISO-8859-1
        if (!mb_check_encoding($text, 'UTF-8')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'ISO-8859-1');
        }

        // Étape 3: Dernier nettoyage
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

        // Étape 4: Supprimer les caractères de contrôle problématiques
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text);

        return $text;
    }

    /**
     * ✅ MÉTHODE FALLBACK : Génère des tâches par défaut pour le jour actuel
     */
    private function generateDefaultCurrentDayTasks($project, $dayOfWeek): array
    {
        $defaultTasks = $this->getDefaultTasksForDay($dayOfWeek);
        
        return [
            'success' => true,
            'day' => $dayOfWeek,
            'tasks' => $defaultTasks,
            'fallback' => true
        ];
    }

    /**
     * ✅ Générer les tâches pour un seul jour (réutilise la logique du jour actuel)
     */
    private function generateSingleDayTasks($project, $dayName, $context): array
    {
        try {
            Log::debug("🎯 [SPRINT-SINGLE-DAY] Génération jour individuel", [
                'project_id' => $project->id,
                'day_name' => $dayName
            ]);

            // Exemples adaptés à la langue
            $exampleTitle = $this->userLanguage === 'French' ? 'Titre de la tâche' : 'Task title';
            $exampleDesc = $this->userLanguage === 'French' ? 'Description détaillée' : 'Detailed description';

            $systemPrompt = "You are an expert business task planner. Generate EXACTLY 6 high-quality tasks for {$dayName} ONLY. You MUST respond in " . $this->userLanguage . ".

CRITICAL REQUIREMENTS:
1. Generate tasks for {$dayName} ONLY
2. Create EXACTLY 6 tasks (no more, no less)
3. Each task must be specific, actionable and measurable
4. Mix different types: mission, vision, objective, action
5. Balance priorities: 2 high, 2 medium, 2 normal
6. ALL content MUST be in " . $this->userLanguage . "

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  \"day\": \"{$dayName}\",
  \"tasks\": [
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"},
    {\"title\": \"{$exampleTitle}\", \"description\": \"{$exampleDesc}\", \"type\": \"mission|vision|objective|action\", \"priority\": \"high|medium|normal\"}
  ]
}";

            // Message utilisateur adapté à la langue
            $userMessage = $this->userLanguage === 'French'
                ? "Générez 6 tâches en français pour {$dayName} pour ce business:\n\n" . $context
                : "Generate 6 tasks in English for {$dayName} for this business:\n\n" . $context;

            // ✅ DEBUG: Log du contexte avant envoi OpenAI
            Log::debug("📝 [SPRINT-DEBUG] Context avant OpenAI", [
                'day' => $dayName,
                'context_length' => strlen($context),
                'context_encoding' => mb_detect_encoding($context, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true),
                'context_preview' => substr($context, 0, 200)
            ]);

            // Appel OpenAI (même config que jour actuel)
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $userMessage
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 1500 // Même limite que jour actuel
            ]);

            // Parser la réponse
            $content = $response->choices[0]->message->content;
            $content = trim($content);
            
            Log::debug("🤖 [SPRINT-SINGLE-DAY] Réponse IA reçue", [
                'project_id' => $project->id,
                'day_name' => $dayName,
                'response_length' => strlen($content)
            ]);
            
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }
            
            $dayData = json_decode($content, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("❌ [SPRINT-SINGLE-DAY] JSON parse error", [
                    'day_name' => $dayName,
                    'json_error' => json_last_error_msg(),
                    'raw_content' => substr($content, 0, 500)
                ]);
                
                return [
                    'success' => false,
                    'error' => 'JSON parsing failed: ' . json_last_error_msg()
                ];
            }
            
            if (!isset($dayData['tasks']) || !is_array($dayData['tasks']) || count($dayData['tasks']) === 0) {
                Log::error("❌ [SPRINT-SINGLE-DAY] Invalid response structure", [
                    'day_name' => $dayName,
                    'has_tasks' => isset($dayData['tasks']),
                    'tasks_count' => isset($dayData['tasks']) ? count($dayData['tasks']) : 0
                ]);
                
                return [
                    'success' => false,
                    'error' => 'Invalid response structure'
                ];
            }

            Log::info("✅ [SPRINT-SINGLE-DAY] Jour généré avec IA", [
                'project_id' => $project->id,
                'day_name' => $dayName,
                'tasks_generated' => count($dayData['tasks'])
            ]);

            return [
                'success' => true,
                'day' => $dayName,
                'tasks' => $dayData['tasks']
            ];

        } catch (\Exception $e) {
            Log::error("💥 [SPRINT-SINGLE-DAY] Erreur génération", [
                'project_id' => $project->id,
                'day_name' => $dayName,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * ✅ RETRY avec prompt simplifié avant fallback
     */
    private function retryWithSimplifiedPrompt($project, $futureDays, $context): array
    {
        try {
            $futureDaysString = implode(', ', $futureDays);
            
            Log::info("🔄 [SPRINT-FUTURE] Retry avec prompt simplifié", [
                'project_id' => $project->id,
                'future_days' => $futureDaysString
            ]);
            
            // Prompt ultra-simplifié mais contextuel
            $simplePrompt = "Generate tasks for {$futureDaysString} for this project: {$project->name}";
            if ($project->description) {
                $simplePrompt .= " - {$project->description}";
            }
            $simplePrompt .= "\n\nReturn JSON format:
{
  \"future_days\": {";
            
            foreach ($futureDays as $day) {
                $simplePrompt .= "\n    \"{$day}\": [
      {\"title\": \"Task title\", \"description\": \"Detailed description\", \"type\": \"action\", \"priority\": \"normal\"}
    ],";
            }
            $simplePrompt = rtrim($simplePrompt, ',') . "
  }
}

Generate 6 tasks per day, related to: {$project->name}";

            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'user', 'content' => $simplePrompt]
                ],
                'temperature' => 0.5,
                'max_tokens' => 2000
            ]);

            $content = trim($response->choices[0]->message->content);
            
            if (strpos($content, '```json') !== false) {
                $content = str_replace(['```json', '```'], '', $content);
                $content = trim($content);
            }

            $retryData = json_decode($content, true);
            
            if (json_last_error() === JSON_ERROR_NONE && isset($retryData['future_days'])) {
                Log::info("✅ [SPRINT-FUTURE] Retry réussi !", [
                    'project_id' => $project->id,
                    'generated_days_count' => count($retryData['future_days'])
                ]);
                
                return [
                    'success' => true,
                    'future_days' => $retryData['future_days'],
                    'retry_success' => true
                ];
            }
            
        } catch (\Exception $e) {
            Log::warning("⚠️ [SPRINT-FUTURE] Retry échoué", [
                'project_id' => $project->id,
                'error' => $e->getMessage(),
                'falling_back' => 'contextual_default'
            ]);
        }
        
        // Si retry échoue aussi, fallback contextuel
        return $this->generateContextualFallback($project, $futureDays);
    }

    /**
     * ✅ FALLBACK CONTEXTUEL : Génère des tâches basées sur le projet
     */
    private function generateContextualFallback($project, $futureDays): array
    {
        Log::info("🎯 [SPRINT-FUTURE] Fallback contextuel pour projet", [
            'project_id' => $project->id,
            'project_name' => $project->name,
            'project_description' => $project->description
        ]);

        $futureDaysData = [];
        
        foreach ($futureDays as $day) {
            $futureDaysData[$day] = $this->getContextualTasksForDay($project, $day);
        }
        
        return [
            'success' => true,
            'future_days' => $futureDaysData,
            'contextual_fallback' => true
        ];
    }

    /**
     * ✅ Tâches contextuelles basées sur le projet
     */
    private function getContextualTasksForDay($project, $dayOfWeek): array
    {
        // Analyser le nom et description du projet pour des mots-clés
        $projectText = strtolower($project->name . ' ' . ($project->description ?? ''));
        
        // Déterminer le type de projet
        if (strpos($projectText, 'cours') !== false || strpos($projectText, 'formation') !== false || strpos($projectText, 'éducation') !== false || strpos($projectText, 'enseignement') !== false) {
            return $this->getEducationTasks($project, $dayOfWeek);
        } elseif (strpos($projectText, 'e-commerce') !== false || strpos($projectText, 'boutique') !== false || strpos($projectText, 'vente') !== false) {
            return $this->getEcommerceTasks($project, $dayOfWeek);
        } elseif (strpos($projectText, 'développement') !== false || strpos($projectText, 'dev') !== false || strpos($projectText, 'app') !== false || strpos($projectText, 'site') !== false) {
            return $this->getDevelopmentTasks($project, $dayOfWeek);
        } else {
            // Fallback générique mais adapté
            return $this->getGenericContextualTasks($project, $dayOfWeek);
        }
    }

    /**
     * ✅ MÉTHODE FALLBACK : Génère des tâches par défaut pour les jours futurs
     */
    private function generateDefaultFutureDays($project, $futureDays): array
    {
        Log::warning("⚠️ [SPRINT-FUTURE] Utilisation des tâches par défaut (fallback)", [
            'project_id' => $project->id ?? 'unknown',
            'future_days' => $futureDays,
            'reason' => 'OpenAI failed or returned invalid JSON'
        ]);

        $futureDaysData = [];
        
        foreach ($futureDays as $day) {
            $futureDaysData[$day] = $this->getDefaultTasksForDay($day);
        }
        
        return [
            'success' => true,
            'future_days' => $futureDaysData,
            'fallback' => true
        ];
    }

    /**
     * ✅ MÉTHODE HELPER : Récupère les tâches par défaut pour un jour
     */
    private function getDefaultTasksForDay($dayOfWeek): array
    {
        // Tâches par défaut simplifiées (6 tâches par jour)
        $defaultTasksPerDay = [
            'Monday' => [
                ['title' => 'Planification hebdomadaire', 'description' => 'Définir les objectifs de la semaine', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Révision de la stratégie', 'description' => 'Analyser les performances précédentes', 'type' => 'mission', 'priority' => 'high'],
                ['title' => 'Préparation marketing', 'description' => 'Organiser les activités marketing', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Vérification KPI', 'description' => 'Contrôler les indicateurs clés', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Communication équipe', 'description' => 'Briefing équipe sur la semaine', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Organisation calendrier', 'description' => 'Planifier les rendez-vous importants', 'type' => 'action', 'priority' => 'normal']
            ],
            'Tuesday' => [
                ['title' => 'Analyse concurrentielle', 'description' => 'Étudier les actions des concurrents', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Recherche marché', 'description' => 'Analyser les tendances du marché', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Optimisation SEO', 'description' => 'Améliorer le référencement', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Analyse métriques', 'description' => 'Étudier les données analytiques', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Veille technologique', 'description' => 'Se tenir informé des nouveautés', 'type' => 'mission', 'priority' => 'normal'],
                ['title' => 'Mise à jour BDD clients', 'description' => 'Enrichir la base de données', 'type' => 'action', 'priority' => 'normal']
            ],
            'Wednesday' => [
                ['title' => 'Création de contenu', 'description' => 'Rédiger articles et contenus', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Design graphique', 'description' => 'Créer des visuels marketing', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Réseaux sociaux', 'description' => 'Programmer les publications', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Amélioration site web', 'description' => 'Optimiser l\'expérience utilisateur', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Newsletter', 'description' => 'Préparer la communication client', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Processus internes', 'description' => 'Améliorer les processus', 'type' => 'objective', 'priority' => 'normal']
            ],
            'Thursday' => [
                ['title' => 'Prospection clients', 'description' => 'Contacter nouveaux prospects', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Suivi commercial', 'description' => 'Suivre devis et propositions', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Networking', 'description' => 'Participer à des événements pro', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Formation continue', 'description' => 'Développer de nouvelles compétences', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Relation client', 'description' => 'Maintenir contact avec clients', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Feedback clients', 'description' => 'Analyser les retours clients', 'type' => 'objective', 'priority' => 'normal']
            ],
            'Friday' => [
                ['title' => 'Optimisation opérationnelle', 'description' => 'Améliorer les processus', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Gestion financière', 'description' => 'Réviser comptes et trésorerie', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Systèmes informatiques', 'description' => 'Maintenir les outils', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Budget marketing', 'description' => 'Ajuster les budgets', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Documentation', 'description' => 'Documenter les procédures', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Sécurité données', 'description' => 'Vérifier sauvegardes', 'type' => 'action', 'priority' => 'normal']
            ],
            'Saturday' => [
                ['title' => 'Innovation créativité', 'description' => 'Brainstorming nouvelles idées', 'type' => 'mission', 'priority' => 'high'],
                ['title' => 'Partenariats', 'description' => 'Rechercher nouveaux partenaires', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Développement produit', 'description' => 'Améliorer produits/services', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Tendances secteur', 'description' => 'Explorer nouvelles tendances', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Prototypes tests', 'description' => 'Tester nouvelles approches', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Stratégie long terme', 'description' => 'Réflexion stratégique', 'type' => 'mission', 'priority' => 'normal']
            ],
            'Sunday' => [
                ['title' => 'Bilan hebdomadaire', 'description' => 'Analyser les résultats', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Préparation semaine suivante', 'description' => 'Planifier objectifs futurs', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Métriques hebdomadaires', 'description' => 'Étudier les KPI', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Ajustement stratégie', 'description' => 'Adapter selon résultats', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Rapport d\'activité', 'description' => 'Documenter la semaine', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Organisation workspace', 'description' => 'Nettoyer espace de travail', 'type' => 'action', 'priority' => 'normal']
            ]
        ];

        return $defaultTasksPerDay[$dayOfWeek] ?? $defaultTasksPerDay['Monday'];
    }

    /**
     * ✅ Tâches spécialisées pour projets éducatifs
     */
    private function getEducationTasks($project, $dayOfWeek): array
    {
        $educationTasks = [
            'Monday' => [
                ['title' => 'Planification du contenu pédagogique', 'description' => 'Définir la progression pédagogique et les objectifs d\'apprentissage pour la semaine, réviser le plan de cours et préparer les supports nécessaires', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Révision du curriculum', 'description' => 'Analyser et mettre à jour le programme de formation pour s\'assurer de sa pertinence et de sa cohérence avec les objectifs pédagogiques fixés', 'type' => 'mission', 'priority' => 'high'],
                ['title' => 'Préparation des supports de cours', 'description' => 'Créer ou mettre à jour les présentations, exercices et documents pédagogiques nécessaires pour les sessions d\'enseignement de la semaine', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Évaluation des étudiants', 'description' => 'Corriger les travaux, devoirs et évaluations des apprenants, fournir des retours constructifs et mettre à jour les notes', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Recherche pédagogique', 'description' => 'Se tenir informé des nouvelles méthodes d\'enseignement et innovations pédagogiques dans le domaine pour améliorer la qualité des cours', 'type' => 'mission', 'priority' => 'normal'],
                ['title' => 'Communication avec les apprenants', 'description' => 'Répondre aux questions des étudiants, organiser des sessions de tutorat et maintenir un dialogue constructif avec les apprenants', 'type' => 'action', 'priority' => 'normal']
            ],
            'Tuesday' => [
                ['title' => 'Création de contenu interactif', 'description' => 'Développer des activités pratiques, quiz et exercices interactifs pour renforcer l\'engagement des apprenants et améliorer la rétention', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Analyse des résultats d\'apprentissage', 'description' => 'Étudier les performances des étudiants, identifier les difficultés récurrentes et adapter la méthodologie d\'enseignement en conséquence', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Développement d\'outils pédagogiques', 'description' => 'Créer ou améliorer les ressources numériques, simulateurs ou applications éducatives pour enrichir l\'expérience d\'apprentissage', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Formation continue personnelle', 'description' => 'Se former aux nouvelles technologies éducatives et méthodes d\'enseignement pour maintenir un niveau d\'expertise élevé', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Collaboration avec collègues', 'description' => 'Échanger avec d\'autres formateurs, partager les bonnes pratiques et participer à des projets pédagogiques collaboratifs', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Veille technologique éducative', 'description' => 'Explorer les nouveaux outils et plateformes d\'apprentissage en ligne pour intégrer les innovations pertinentes dans les cours', 'type' => 'mission', 'priority' => 'normal']
            ]
        ];

        return $educationTasks[$dayOfWeek] ?? $educationTasks['Monday'];
    }

    /**
     * ✅ Tâches spécialisées pour projets e-commerce
     */
    private function getEcommerceTasks($project, $dayOfWeek): array
    {
        $ecommerceTasks = [
            'Monday' => [
                ['title' => 'Analyse des ventes hebdomadaires', 'description' => 'Examiner les performances commerciales de la semaine précédente, identifier les tendances et optimiser la stratégie de vente', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Gestion de l\'inventaire', 'description' => 'Vérifier les stocks, identifier les produits en rupture, planifier les réapprovisionnements et optimiser la rotation des stocks', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Optimisation des fiches produits', 'description' => 'Améliorer les descriptions, photos et informations produits pour maximiser les conversions et réduire le taux d\'abandon', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Suivi des commandes et livraisons', 'description' => 'Traiter les commandes en attente, coordonner avec les transporteurs et résoudre les problèmes de livraison', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Analyse concurrentielle', 'description' => 'Étudier les prix et stratégies des concurrents, identifier les opportunités de différenciation et ajuster le positionnement', 'type' => 'mission', 'priority' => 'normal'],
                ['title' => 'Service client et support', 'description' => 'Répondre aux questions clients, traiter les retours et réclamations, maintenir un excellent niveau de satisfaction client', 'type' => 'action', 'priority' => 'normal']
            ]
        ];

        return $ecommerceTasks[$dayOfWeek] ?? $ecommerceTasks['Monday'];
    }

    /**
     * ✅ Tâches spécialisées pour projets de développement
     */
    private function getDevelopmentTasks($project, $dayOfWeek): array
    {
        $developmentTasks = [
            'Monday' => [
                ['title' => 'Planification du sprint de développement', 'description' => 'Définir les objectifs de développement pour la semaine, prioriser les fonctionnalités et organiser les tâches techniques', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Révision du code et architecture', 'description' => 'Examiner la qualité du code existant, identifier les améliorations nécessaires et optimiser l\'architecture technique du projet', 'type' => 'mission', 'priority' => 'high'],
                ['title' => 'Tests et débogage', 'description' => 'Effectuer les tests unitaires et d\'intégration, identifier et corriger les bugs, assurer la stabilité de l\'application', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Documentation technique', 'description' => 'Mettre à jour la documentation du code, créer des guides d\'utilisation et documenter les nouvelles fonctionnalités développées', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Veille technologique', 'description' => 'Se tenir informé des nouvelles technologies, frameworks et bonnes pratiques de développement dans l\'écosystème technique', 'type' => 'mission', 'priority' => 'normal'],
                ['title' => 'Optimisation des performances', 'description' => 'Analyser et améliorer les performances de l\'application, optimiser les requêtes et réduire les temps de chargement', 'type' => 'action', 'priority' => 'normal']
            ]
        ];

        return $developmentTasks[$dayOfWeek] ?? $developmentTasks['Monday'];
    }

    /**
     * ✅ Tâches génériques adaptées au projet
     */
    private function getGenericContextualTasks($project, $dayOfWeek): array
    {
        $genericTasks = [
            'Monday' => [
                ['title' => 'Planification du projet ' . $project->name, 'description' => 'Définir les objectifs et priorités spécifiques au projet ' . $project->name . ' pour la semaine, organiser les tâches et ressources nécessaires', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Révision des objectifs du projet', 'description' => 'Analyser l\'avancement du projet ' . $project->name . ', ajuster la stratégie si nécessaire et définir les prochaines étapes importantes', 'type' => 'mission', 'priority' => 'high'],
                ['title' => 'Recherche et développement', 'description' => 'Effectuer des recherches approfondies liées au domaine du projet ' . $project->name . ' et explorer de nouvelles approches ou solutions', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Coordination des ressources', 'description' => 'Organiser et coordonner les ressources humaines, techniques et financières nécessaires à l\'avancement du projet ' . $project->name, 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Communication et networking', 'description' => 'Maintenir les relations avec les parties prenantes du projet ' . $project->name . ' et développer le réseau professionnel dans ce domaine', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Évaluation et amélioration continue', 'description' => 'Analyser les processus actuels du projet ' . $project->name . ' et identifier les opportunités d\'optimisation et d\'amélioration', 'type' => 'objective', 'priority' => 'normal']
            ]
        ];

        return $genericTasks[$dayOfWeek] ?? $genericTasks['Monday'];
    }

    private function getLocalizedDefaultContent($project)
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Default French content (fallback)
        $defaultTasks = [
            'Monday' => [
                ['title' => 'Planification hebdomadaire', 'description' => 'Définir les objectifs et priorités de la semaine', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Révision de la stratégie', 'description' => 'Analyser les performances et ajuster la stratégie', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Préparation des tâches marketing', 'description' => 'Organiser les activités marketing de la semaine', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Vérification des KPI', 'description' => 'Contrôler les indicateurs de performance clés', 'type' => 'objective', 'priority' => 'normal'],
                ['title' => 'Mise à jour du calendrier', 'description' => 'Organiser les rendez-vous et événements importants', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Communication équipe', 'description' => 'Briefing avec l\'équipe sur les objectifs de la semaine', 'type' => 'action', 'priority' => 'medium']
            ],
            'Tuesday' => [
                ['title' => 'Analyse concurrentielle', 'description' => 'Étudier les actions des concurrents et identifier les opportunités', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Recherche de marché', 'description' => 'Analyser les tendances du marché et les besoins clients', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Optimisation SEO', 'description' => 'Améliorer le référencement naturel du site web', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Analyse des métriques', 'description' => 'Étudier les données analytiques et les conversions', 'type' => 'objective', 'priority' => 'normal'],
                ['title' => 'Veille technologique', 'description' => 'Se tenir informé des nouvelles technologies du secteur', 'type' => 'mission', 'priority' => 'low'],
                ['title' => 'Mise à jour base de données clients', 'description' => 'Nettoyer et enrichir la base de données clients', 'type' => 'action', 'priority' => 'normal']
            ],
            'Wednesday' => [
                ['title' => 'Création de contenu', 'description' => 'Rédiger des articles de blog ou contenus marketing', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Design graphique', 'description' => 'Créer des visuels pour les campagnes marketing', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Planification réseaux sociaux', 'description' => 'Programmer les publications sur les réseaux sociaux', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Révision du site web', 'description' => 'Vérifier et améliorer l\'expérience utilisateur du site', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Création de newsletters', 'description' => 'Préparer la newsletter hebdomadaire pour les clients', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Optimisation des processus', 'description' => 'Identifier et améliorer les processus internes', 'type' => 'objective', 'priority' => 'low']
            ],
            'Thursday' => [
                ['title' => 'Prospection clients', 'description' => 'Contacter de nouveaux prospects et clients potentiels', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Suivi commercial', 'description' => 'Faire le suivi des devis et propositions en cours', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Networking professionnel', 'description' => 'Participer à des événements ou groupes professionnels', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Formation continue', 'description' => 'Se former sur de nouvelles compétences ou outils', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Gestion relation client', 'description' => 'Contacter les clients existants pour maintenir la relation', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Analyse des retours clients', 'description' => 'Étudier les feedbacks et avis clients', 'type' => 'objective', 'priority' => 'normal']
            ],
            'Friday' => [
                ['title' => 'Optimisation opérationnelle', 'description' => 'Analyser et améliorer les processus et outils de travail pour maximiser l\'efficacité opérationnelle, identifier les goulots d\'étranglement et optimiser les workflows internes pour une meilleure productivité globale', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Gestion financière', 'description' => 'Réviser en détail les comptes et la trésorerie, analyser les flux de trésorerie, mettre à jour les prévisions financières et identifier les opportunités d\'optimisation des coûts et de maximisation des revenus', 'type' => 'action', 'priority' => 'high'],
                ['title' => 'Mise à jour systèmes', 'description' => 'Maintenir et mettre à jour l\'ensemble des outils informatiques, systèmes de gestion et applications métier pour assurer la sécurité, la performance et la compatibilité des infrastructures technologiques', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Planification budgétaire', 'description' => 'Préparer et ajuster les budgets marketing et opérationnels, analyser le ROI des investissements actuels et planifier les allocations budgétaires pour les prochains mois selon les objectifs stratégiques', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Documentation processus', 'description' => 'Documenter de manière exhaustive les procédures et bonnes pratiques, créer des guides utilisateur détaillés et mettre à jour la base de connaissances pour faciliter la formation et l\'onboarding', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Backup et sécurité', 'description' => 'Vérifier l\'intégrité des sauvegardes de données, tester les procédures de récupération, analyser les logs de sécurité et mettre à jour les protocoles de protection des données sensibles', 'type' => 'action', 'priority' => 'normal']
            ],
            'Saturday' => [
                ['title' => 'Innovation et créativité', 'description' => 'Brainstorming pour de nouvelles idées et innovations', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Recherche de partenariats', 'description' => 'Identifier et contacter des partenaires potentiels', 'type' => 'action', 'priority' => 'medium'],
                ['title' => 'Développement produit', 'description' => 'Travailler sur l\'amélioration ou création de produits/services', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Étude de nouvelles tendances', 'description' => 'Explorer les nouvelles tendances du secteur', 'type' => 'mission', 'priority' => 'low'],
                ['title' => 'Prototype et tests', 'description' => 'Créer des prototypes et tester de nouvelles approches', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Planification stratégique', 'description' => 'Réflexion stratégique à moyen et long terme', 'type' => 'mission', 'priority' => 'normal']
            ],
            'Sunday' => [
                ['title' => 'Bilan hebdomadaire', 'description' => 'Analyser les résultats et performances de la semaine', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Préparation semaine suivante', 'description' => 'Planifier les objectifs et tâches de la semaine suivante', 'type' => 'objective', 'priority' => 'high'],
                ['title' => 'Analyse des métriques hebdomadaires', 'description' => 'Étudier les KPI et indicateurs de la semaine écoulée', 'type' => 'objective', 'priority' => 'medium'],
                ['title' => 'Mise à jour stratégie', 'description' => 'Ajuster la stratégie en fonction des résultats obtenus', 'type' => 'mission', 'priority' => 'medium'],
                ['title' => 'Rapport d\'activité', 'description' => 'Préparer un rapport sur les activités et résultats', 'type' => 'action', 'priority' => 'normal'],
                ['title' => 'Organisation workspace', 'description' => 'Nettoyer et organiser l\'espace de travail', 'type' => 'action', 'priority' => 'low']
            ]
        ];

        // For non-French languages, try to translate the default content
        if ($this->userLanguage !== 'French') {
            try {
                // Try to translate the entire structure at once
                $translationPrompt = "Translate the following sprint tasks from French to " . $this->userLanguage . ". Maintain the exact JSON structure but translate the title and description fields: " . json_encode($defaultTasks);

                $response = $this->client->chat()->create([
                    'model' => 'gpt-3.5-turbo',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a translator. Translate the content while maintaining the exact JSON structure. Only translate the "title" and "description" fields to ' . $this->userLanguage . '. Return only valid JSON.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $translationPrompt
                        ]
                    ],
                    'temperature' => 0.3,
                    'max_tokens' => 2000
                ]);

                $translatedContent = $response->choices[0]->message->content;
                $translatedContent = trim($translatedContent);
                if (strpos($translatedContent, '```json') !== false) {
                    $translatedContent = str_replace(['```json', '```'], '', $translatedContent);
                    $translatedContent = trim($translatedContent);
                }

                $translatedTasks = json_decode($translatedContent, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($translatedTasks)) {
                    $defaultTasks = $translatedTasks;
                }
            } catch (Exception $e) {
                Log::warning('Failed to translate default sprint content: ' . $e->getMessage());
                // Keep the French content as fallback
            }
        }

        $sprintData = [
            'title' => 'Sprint Semaine - ' . $project->name,
            'description' => 'Sprint hebdomadaire focalisé sur la croissance et l\'optimisation des activités',
            'days' => []
        ];

        foreach ($daysOfWeek as $day) {
            $sprintData['days'][$day] = $defaultTasks[$day];
        }

        return $sprintData;
    }

    private function validateAndEnhanceSprintData($sprintData, $project)
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        // Ensure basic structure exists
        if (!isset($sprintData['title'])) {
            $sprintData['title'] = 'Sprint Semaine - ' . $project->name;
        }

        if (!isset($sprintData['description'])) {
            $sprintData['description'] = 'Sprint hebdomadaire pour développer les activités de ' . $project->name;
        }

        if (!isset($sprintData['days'])) {
            $sprintData['days'] = [];
        }

        // Ensure all days have tasks
        foreach ($daysOfWeek as $day) {
            if (!isset($sprintData['days'][$day]) || !is_array($sprintData['days'][$day]) || count($sprintData['days'][$day]) !== 6) {
                // Get default tasks for this day if missing or not exactly 6 tasks
                $defaultSprintData = $this->generateDefaultSprintStructure($project);
                $sprintData['days'][$day] = $defaultSprintData['days'][$day];
            } else {
                // Validate existing tasks and add missing fields
                foreach ($sprintData['days'][$day] as &$task) {
                    if (!isset($task['title']) || empty($task['title'])) {
                        $task['title'] = 'Tâche ' . $day;
                    }
                    if (!isset($task['description']) || empty($task['description'])) {
                        $task['description'] = 'Description de la tâche à définir';
                    }
                    if (!isset($task['type']) || !in_array($task['type'], ['mission', 'vision', 'objective', 'action'])) {
                        $task['type'] = 'action';
                    }
                    if (!isset($task['priority']) || !in_array($task['priority'], ['high', 'medium', 'low', 'normal'])) {
                        $task['priority'] = 'normal';
                    }
                }
            }
        }

        return $sprintData;
    }
}