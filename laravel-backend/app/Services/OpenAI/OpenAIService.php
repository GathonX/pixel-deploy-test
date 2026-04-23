<?php

namespace App\Services\OpenAI;

use OpenAI;
use Illuminate\Support\Facades\Log;
use Exception;

class OpenAIService
{

    /**
     * 📊 Constantes de configuration
     */
    private const LOG_PREFIX = '🤖 [OpenAIService]';
    private const DEFAULT_MODEL = 'gpt-3.5-turbo';
    private const DEFAULT_MAX_TOKENS = 800;
    private const DEFAULT_TEMPERATURE = 0.7;

    private $client;
    private $userLanguage;

    public function __construct()
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            throw new Exception('OpenAI API key is not set in the configuration.');
        }

        // Configure client with timeout
        $this->client = OpenAI::factory()
            ->withApiKey($apiKey)
            ->withHttpClient(new \GuzzleHttp\Client([
                'timeout' => 120,  // 2 minutes timeout for HTTP requests
                'connect_timeout' => 30,  // 30 seconds connection timeout
                'read_timeout' => 120,    // 2 minutes read timeout
            ]))
            ->make();

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
            $user = auth()->user();
            if ($user && isset($user->language)) {
                return $this->mapLanguageToFullName($user->language);
            }
        } catch (Exception $e) {
            Log::info('Could not get user language: ' . $e->getMessage());
        }

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


    public function generateBusinessPlan(string $businessDescription, array $options = [])
    {
        $businessDescription = substr($businessDescription, 0, 4000);
        $prompt = $this->buildBusinessPlanPrompt($businessDescription, $options);

        // Use user's preferred language instead of detecting from text
        $language = $this->userLanguage;

        // Configuration commune
        $messages = [
            ['role' => 'system', 'content' => 'Vous êtes un consultant business expérimenté spécialisé dans la création de business plans détaillés. Vos réponses doivent être structurées, professionnelles et complètes. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS, peu importe la langue de la demande.'],
            ['role' => 'user', 'content' => $prompt]
        ];
        $params = [
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 3000,
        ];

        // 🔁 Essai avec GPT-4 puis fallback automatique vers GPT-3.5
        try {
            $params['model'] = 'gpt-4';
            $response = $this->client->chat()->create($params);
        } catch (Exception $e) {
            Log::warning('[generateBusinessPlan] GPT-4 failed: ' . $e->getMessage());

            // Si erreur quota ou modèle indisponible, on tente gpt-3.5-turbo
            if (str_contains($e->getMessage(), 'quota') || str_contains($e->getMessage(), 'model')) {
                try {
                    $params['model'] = 'gpt-3.5-turbo';
                    $response = $this->client->chat()->create($params);
                } catch (Exception $e2) {
                    Log::error('[generateBusinessPlan] GPT-3.5 fallback failed: ' . $e2->getMessage());
                    return [
                        'success' => false,
                        'error' => 'AI generation failed with both GPT-4 and GPT-3.5',
                        'details' => $e2->getMessage()
                    ];
                }
            } else {
                return [
                    'success' => false,
                    'error' => 'AI generation failed',
                    'details' => $e->getMessage()
                ];
            }
        }

        // Récupération du contenu généré par l'API
        $generatedContent = $response->choices[0]->message->content;

        // Structuration du business plan
        $structuredBusinessPlan = $this->formatBusinessPlan($generatedContent);

        return [
            'success' => true,
            'business_plan' => $structuredBusinessPlan,
        ];
    }



    private function formatBusinessPlan(string $content): array
    {
        // Liste des sections attendues
        $sections = [
            'Executive Summary',
            'Company Overview',
            'Market Analysis',
            'Products and Services',
            'Business Model',
            'Marketing and Sales Strategy',
            'Operational Plan',
            'Financial Analysis',
            'Risks and Mitigation Strategies',
            'Appendices',
        ];

        // Pré-traiter le contenu pour faciliter l'extraction des sections
        $content = preg_replace('/^\d+\.\s+/m', '', $content); // Supprimer les numéros de section

        $formattedPlan = '';
        $htmlPlan = '<div class="business-plan">';

        // Traiter chaque section en une seule boucle pour générer à la fois le texte et le HTML
        foreach ($sections as $section) {
            // Pattern pour extraire le contenu de la section jusqu'à la prochaine section ou la fin
            $pattern = "/$section(.*?)(?=\n(?:" . implode('|', array_map('preg_quote', $sections)) . ")|\z)/s";

            if (preg_match($pattern, $content, $matches)) {
                $sectionContent = trim($matches[1]);

                // Ajouter la section au format texte
                $formattedPlan .= "\n$section\n$sectionContent\n";

                // Ajouter la section au format HTML
                $paragraphs = preg_split('/\n\s*\n/', $sectionContent);

                $htmlPlan .= sprintf(
                    '<section class="plan-section">
                        <h2 class="section-title">%s</h2>',
                    htmlspecialchars($section)
                );

                foreach ($paragraphs as $paragraph) {
                    // Limiter la taille des paragraphes pour éviter les débordements
                    $paragraph = trim($paragraph);
                    if (empty($paragraph))
                        continue;

                    // Check if paragraph looks like a subsection
                    if (preg_match('/^[\d\-•]\s+(.+)/', $paragraph, $subMatches)) {
                        $htmlPlan .= sprintf(
                            '<h3 class="subsection-title">%s</h3>',
                            htmlspecialchars(trim($subMatches[1]))
                        );
                    } else {
                        $htmlPlan .= sprintf(
                            '<p class="section-content">%s</p>',
                            htmlspecialchars($paragraph)
                        );
                    }
                }

                $htmlPlan .= '</section>';
            } else {
                // Si une section est manquante, demander une régénération
                $regeneratedContent = $this->regenerateSection($section);

                // Ajouter la section régénérée au format texte
                $formattedPlan .= "\n$section\n$regeneratedContent\n";

                // Ajouter la section régénérée au format HTML
                $paragraphs = preg_split('/\n\s*\n/', $regeneratedContent);

                $htmlPlan .= sprintf(
                    '<section class="plan-section">
                        <h2 class="section-title">%s</h2>',
                    htmlspecialchars($section)
                );

                foreach ($paragraphs as $paragraph) {
                    $paragraph = trim($paragraph);
                    if (empty($paragraph))
                        continue;

                    // Check if paragraph looks like a subsection
                    if (preg_match('/^[\d\-•]\s+(.+)/', $paragraph, $subMatches)) {
                        $htmlPlan .= sprintf(
                            '<h3 class="subsection-title">%s</h3>',
                            htmlspecialchars(trim($subMatches[1]))
                        );
                    } else {
                        $htmlPlan .= sprintf(
                            '<p class="section-content">%s</p>',
                            htmlspecialchars($paragraph)
                        );
                    }
                }

                $htmlPlan .= '</section>';
            }
        }

        $htmlPlan .= '</div>';

        return [
            'text' => trim($formattedPlan),
            'html' => $htmlPlan
        ];
    }

    /**
     * Continue a conversation about a business plan
     *
     * @param array $conversation Previous conversation history
     * @param string $userMessage The new user message
     * @return array The AI response
     */
    public function continueBusinessPlanConversation(array $conversation, string $userMessage)
    {
        $messages = [
            ['role' => 'system', 'content' => 'Vous êtes un consultant business expérimenté spécialisé dans la création de business plans détaillés. Vos réponses doivent être structurées, professionnelles et complètes. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS.']
        ];

        // Add conversation history
        foreach ($conversation as $message) {
            $messages[] = $message;
        }

        // Add the new user message
        $messages[] = ['role' => 'user', 'content' => $userMessage];

        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => $messages,
                'temperature' => 0.7,
                'max_tokens' => 2000,
            ]);

            return [
                'success' => true,
                'response' => $response->choices[0]->message->content,
                'conversation' => array_merge($conversation, [
                    ['role' => 'user', 'content' => $userMessage],
                    ['role' => 'assistant', 'content' => $response->choices[0]->message->content]
                ])
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to generate response. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Analyze a draft business plan and provide improvements
     *
     * @param string $businessPlan The draft business plan
     * @return array Analysis and suggestions for improvement
     */
    public function analyzeBusinessPlan(string $businessPlan)
    {
        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'system', 'content' => 'Vous êtes un analyste business expérimenté spécialisé dans l\'analyse de business plans. Identifiez les forces, faiblesses, opportunités et menaces. Fournissez un feedback constructif pour l\'amélioration. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS.'],
                    ['role' => 'user', 'content' => "Veuillez analyser ce business plan et fournir un feedback détaillé :\n\n$businessPlan"]
                ],
                'temperature' => 0.7,
                'max_tokens' => 3000,
            ]);

            return [
                'success' => true,
                'analysis' => $response->choices[0]->message->content,
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to analyze business plan. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate financial projections for a business plan
     *
     * @param string $businessDescription Description of the business
     * @param array $initialData Initial financial data
     * @return array Generated financial projections
     */
    public function generateFinancialProjections(string $businessDescription, array $initialData = [])
    {
        $prompt = "Générez des projections financières détaillées sur 3 ans pour l'entreprise suivante (en français) :\n\n";
        $prompt .= "Business Description: $businessDescription\n\n";

        if (!empty($initialData)) {
            $prompt .= "Initial Financial Data:\n";
            foreach ($initialData as $key => $value) {
                $prompt .= "- $key: $value\n";
            }
        }

        $prompt .= "\nInclude revenue projections, startup costs, operating expenses, and profitability analysis. Format the numbers in a readable format.";

        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    ['role' => 'system', 'content' => 'Vous êtes un analyste financier spécialisé dans la création de projections financières pour les nouvelles entreprises. Fournissez des projections financières réalistes et détaillées basées sur la description de l\'entreprise. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'temperature' => 0.7,
                'max_tokens' => 3000,
            ]);

            return [
                'success' => true,
                'financial_projections' => $response->choices[0]->message->content,
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to generate financial projections. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Build a prompt for business plan generation
     *
     * @param string $businessDescription The description of the business
     * @param array $options Additional options
     * @return string The constructed prompt
     */
    private function buildBusinessPlanPrompt(string $businessDescription, array $options): string
    {
        $prompt = "Créez un business plan complet et structuré basé sur la description d'entreprise suivante. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS :\n\n";
        $prompt .= $businessDescription . "\n\n";

        if (!empty($options)) {
            $prompt .= "Additional options or details:\n";
            foreach ($options as $key => $value) {
                $prompt .= "- $key: $value\n";
            }
        }

        $prompt .= "\nEnsure the business plan includes the following sections with detailed content for each:\n";
        $prompt .= "1. Executive Summary: Provide a concise overview of the business, its mission, target market, and financial goals.\n";
        $prompt .= "2. Company Overview: Include the company name, location, legal structure, mission, vision, values, and founding story.\n";
        $prompt .= "3. Market Analysis: Analyze the target market, industry trends, competition, and positioning strategy.\n";
        $prompt .= "4. Products and Services: Describe the products/services offered, pricing strategy, and unique selling points.\n";
        $prompt .= "5. Business Model: Explain how the company generates revenue, including pricing models and cost structure.\n";
        $prompt .= "6. Marketing and Sales Strategy: Outline promotional activities, sales channels, and customer acquisition strategies.\n";
        $prompt .= "7. Operational Plan: Detail the internal organization, key processes, suppliers, and operational workflow.\n";
        $prompt .= "8. Financial Analysis: Provide financial projections (revenue, expenses, profitability) and funding requirements.\n";
        $prompt .= "9. Risks and Mitigation Strategies: Identify potential risks and propose solutions to address them.\n";
        $prompt .= "10. Appendices: Include supporting documents such as founder CVs, market research data, and financial tables.\n";

        $prompt .= "\nThe tone should be professional, and the content should be detailed but concise. Avoid including a final conclusion section.";

        return $prompt;
    }

    /**
     * Regénère une section manquante du business plan
     *
     * @param string $section La section à régénérer
     * @return string Le contenu généré pour la section
     */
    private function regenerateSection(string $section): string
    {
        // Cache statique pour éviter de régénérer plusieurs fois la même section
        static $cachedSections = [];

        // Si la section est déjà en cache, la retourner directement
        if (isset($cachedSections[$section])) {
            return $cachedSections[$section];
        }

        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-3.5-turbo', // Modèle plus léger pour cette tâche
                'messages' => [
                    ['role' => 'system', 'content' => 'Vous êtes un consultant business expérimenté. Générez du contenu concis pour la section suivante d\'un business plan. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS.'],
                    ['role' => 'user', 'content' => "Générez un contenu bref pour la section '$section' d'un business plan."],
                ],
                'temperature' => 0.7,
                'max_tokens' => 500,
            ]);

            $content = trim($response->choices[0]->message->content);

            // Stocker dans le cache
            $cachedSections[$section] = $content;

            return $content;
        } catch (Exception $e) {
            Log::error('Failed to regenerate section: ' . $e->getMessage());
            return "No content available for this section.";
        }
    }

    public static function getLanguage(string $businessDescription): string
    {
        // Extraction d'un échantillon du texte pour la détection de langue
        $sample = substr($businessDescription, 0, 500); // Limiter à 500 caractères

        try {
            $client = OpenAI::client(config('services.openai.api_key'));
            $response = $client->chat()->create([
                'model' => 'gpt-3.5-turbo', // Modèle plus léger pour la détection de langue
                'messages' => [
                    ['role' => 'system', 'content' => 'Vous êtes un expert en langues. Déterminez la langue du texte suivant et répondez uniquement avec le nom de la langue en français (ex: "Français", "Anglais", "Espagnol").'],
                    ['role' => 'user', 'content' => $sample]
                ],
                'max_tokens' => 10, // Limiter la taille de la réponse
                'temperature' => 0.2, // Réponse plus déterministe
            ]);

            $language = trim($response->choices[0]->message->content);
            // Valider que la réponse est une langue
            if (empty($language) || strlen($language) > 20) {
                return 'English'; // Par défaut en anglais si la détection échoue
            }

            return $language;
        } catch (Exception $e) {
            Log::error('Language detection failed: ' . $e->getMessage());
            return 'English'; // Par défaut en anglais en cas d'erreur
        }
    }

    // open AI websearch by transforming the folowing CURL request to PHP
    /*
    curl "https://api.openai.com/v1/responses" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
        "model": "gpt-4.1",
        "tools": [{"type": "web_search_preview"}],
        "input": "what was a positive news story from today?"
    }'
    */
    public function websearch(string $query): string
    {
        try {
            $response = $this->client->chat()->create([
                'model' => 'gpt-4o',
                'messages' => [
                    ['role' => 'user', 'content' => $query]
                ],
                'tools' => [
                    [
                        'type' => 'function',
                        'function' => [
                            'name' => 'web_search',
                            'description' => 'Search the web for relevant information'
                        ]
                    ]
                ],
                'tool_choice' => [
                    'type' => 'function',
                    'function' => [
                        'name' => 'web_search'
                    ]
                ]
            ]);

            if (isset($response->choices[0]->message->content) && $response->choices[0]->message->content !== null) {
                return $response->choices[0]->message->content;
            }

            // Check for tool calls in the response
            if (isset($response->choices[0]->message->tool_calls) && !empty($response->choices[0]->message->tool_calls)) {
                $toolCalls = $response->choices[0]->message->tool_calls;
                $toolCallsJson = json_encode($toolCalls);

                // Use tool call results to make a second request for information
                $secondResponse = $this->client->chat()->create([
                    'model' => 'gpt-4o',
                    'messages' => [
                        ['role' => 'user', 'content' => $query],
                        [
                            'role' => 'assistant',
                            'content' => null,
                            'tool_calls' => $toolCalls
                        ],
                        [
                            'role' => 'tool',
                            'tool_call_id' => $toolCalls[0]->id,
                            'content' => 'Search results for: ' . $query
                        ]
                    ]
                ]);

                if (isset($secondResponse->choices[0]->message->content)) {
                    return $secondResponse->choices[0]->message->content;
                }

                return "Tool results found but could not process: " . $toolCallsJson;
            }

            // Fallback if no content is found
            return "No search results available for: " . $query;
        } catch (Exception $e) {
            Log::error('OpenAI Web Search API Error: ' . $e->getMessage());

            return 'Error performing web search: ' . $e->getMessage();
        }
    }

    /**
     * Generate SWOT analysis from a business plan
     *
     * @param string $businessPlan The business plan to analyze
     * @return array SWOT analysis in structured format
     */
    public function generateSwotAnalysis(string $businessPlan)
    {
        try {
            Log::channel('queue')->info("Open AI Start");
            // Use user's preferred language instead of detecting from text
            $language = $this->userLanguage;

            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Vous êtes un analyste business spécialisé dans l\'analyse SWOT. Extrayez une analyse SWOT complète du business plan fourni. Votre réponse doit être en FRANÇAIS et DOIT retourner UNIQUEMENT un objet JSON valide avec la structure exacte suivante : {"Strengths": [tableau de forces], "Weaknesses": [tableau de faiblesses], "Opportunities": [tableau d\'opportunités], "Threats": [tableau de menaces]}. Chaque tableau doit contenir 4-6 points pertinents. NE PAS inclure de texte en dehors de la structure JSON.'
                    ],
                    [
                        'role' => 'user',
                        'content' => "Analysez ce business plan et fournissez une analyse SWOT formatée en JSON (en français) :\n\n$businessPlan"
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 2000,
            ]);

            $content = $response->choices[0]->message->content;

            // Clean and parse the JSON content
            $content = $this->cleanJsonResponse($content);
            $swotAnalysis = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('Failed to parse SWOT analysis JSON response: ' . json_last_error_msg());
                // Fallback structure
                $swotAnalysis = [
                    'Strengths' => ['Auto-generated strength'],
                    'Weaknesses' => ['Auto-generated weakness'],
                    'Opportunities' => ['Auto-generated opportunity'],
                    'Threats' => ['Auto-generated threat']
                ];
            }

            return [
                'success' => true,
                'swot_analysis' => $swotAnalysis
            ];
        } catch (Exception $e) {
            Log::channel('queue')->info("Open AI error ::" . $e->getMessage());
            Log::error('OpenAI API Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return [
                'success' => false,
                'error' => 'Failed to generate SWOT analysis. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate Blue Ocean Strategy analysis from a business plan
     *
     * @param string $businessPlan The business plan to analyze
     * @return array Blue Ocean Strategy analysis in structured format
     */
    public function generateBlueOceanStrategy(string $businessPlan)
    {
        try {
            // Use user's preferred language instead of detecting from text
            $language = $this->userLanguage;

            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Vous êtes un expert en stratégie business spécialisé dans l\'analyse de la Stratégie Océan Bleu. Extrayez une analyse complète de la Stratégie Océan Bleu du business plan fourni. Votre réponse doit être en FRANÇAIS et DOIT retourner UNIQUEMENT un objet JSON valide avec la structure exacte suivante :
                        {
                            "Eliminate": [array of factors to eliminate],
                            "Reduce": [array of factors to reduce],
                            "Raise": [array of factors to raise],
                            "Create": [array of factors to create],
                            "ValueInnovation": {
                                "Differentiation": [array of differentiation factors],
                                "LowCost": [array of low cost strategies]
                            },
                            "TargetMarket": {
                                "NonCustomers": [array of non-customer segments to target]
                            }
                        }
                        Each array should contain 3-5 relevant points. DO NOT include any text outside the JSON structure.'
                    ],
                    [
                        'role' => 'user',
                        'content' => "Analysez ce business plan et fournissez une analyse de Stratégie Océan Bleu formatée en JSON (en français) :\n\n$businessPlan"
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 2000,
            ]);

            $content = $response->choices[0]->message->content;

            // Clean and parse the JSON content
            $content = $this->cleanJsonResponse($content);
            $blueOceanStrategy = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('Failed to parse Blue Ocean Strategy JSON response: ' . json_last_error_msg());
                // Fallback structure
                $blueOceanStrategy = [
                    'Eliminate' => ['Auto-generated elimination factor'],
                    'Reduce' => ['Auto-generated reduction factor'],
                    'Raise' => ['Auto-generated raise factor'],
                    'Create' => ['Auto-generated creation factor'],
                    'ValueInnovation' => [
                        'Differentiation' => ['Auto-generated differentiation'],
                        'LowCost' => ['Auto-generated low cost strategy']
                    ],
                    'TargetMarket' => [
                        'NonCustomers' => ['Auto-generated non-customer segment']
                    ]
                ];
            }

            return [
                'success' => true,
                'blue_ocean_strategy' => $blueOceanStrategy
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return [
                'success' => false,
                'error' => 'Failed to generate Blue Ocean Strategy analysis. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate Marketing Plan from a business plan
     *
     * @param string $businessPlan The business plan to analyze
     * @return array Marketing Plan in structured format
     */
    public function generateMarketingPlan(string $businessPlan)
    {
        try {
            // Limit business plan size to prevent memory issues
            $businessPlan = substr($businessPlan, 0, 4000);

            // Use user's preferred language
            $language = $this->userLanguage;

            // Configuration commune
            $messages = [
                [
                    'role' => 'system',
                    'content' => "Vous êtes un expert en marketing. Créez un plan marketing concis en FRANÇAIS. Retournez UNIQUEMENT un objet JSON valide avec cette structure exacte, rien d'autre."
                ],
                [
                    'role' => 'user',
                    'content' => "Créez un plan marketing en français avec cette structure :
{
    \"ExecutiveSummary\": \"string (max 300 chars)\",
    \"BusinessObjectives\": [\"string (max 3 objectives)\"],
    \"TargetMarket\": {
        \"Segments\": [\"string (max 4 segments)\"],
        \"Channels\": [\"string (max 4 channels)\"]
    },
    \"Strategy\": {
        \"USP\": \"string (max 150 chars)\",
        \"Positioning\": \"string (max 150 chars)\",
        \"Pricing\": \"string (max 150 chars)\"
    },
    \"Actions\": [
        {
            \"type\": \"string\",
            \"description\": \"string (max 200 chars)\",
            \"timeline\": \"string\"
        }
    ]
}

Business plan to analyze:
{$businessPlan}"
                ]
            ];

            $params = [
                'messages' => $messages,
                'temperature' => 0.7,
                'max_tokens' => 1000
                // 🔧 CORRECTION : response_format retiré car non supporté par toutes les versions GPT-4
            ];

            // 🔁 Essai avec GPT-4 puis fallback automatique vers GPT-3.5
            try {
                $params['model'] = 'gpt-4';
                $response = $this->client->chat()->create($params);
            } catch (Exception $e) {
                Log::warning('[generateMarketingPlan] GPT-4 failed: ' . $e->getMessage());

                // Si erreur quota ou modèle indisponible, on tente gpt-3.5-turbo
                if (str_contains($e->getMessage(), 'quota') || str_contains($e->getMessage(), 'model')) {
                    try {
                        $params['model'] = 'gpt-3.5-turbo';
                        $response = $this->client->chat()->create($params);
                    } catch (Exception $e2) {
                        Log::error('[generateMarketingPlan] GPT-3.5 fallback failed: ' . $e2->getMessage());
                        return [
                            'success' => false,
                            'error' => 'AI generation failed with both GPT-4 and GPT-3.5',
                            'details' => $e2->getMessage()
                        ];
                    }
                } else {
                    return [
                        'success' => false,
                        'error' => 'AI generation failed',
                        'details' => $e->getMessage()
                    ];
                }
            }

            $content = $response->choices[0]->message->content;

            // Clean and parse the JSON content
            $content = $this->cleanJsonResponse($content);
            $marketingPlan = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('Failed to parse Marketing Plan JSON response: ' . json_last_error_msg());
                // Fallback structure with minimal content
                $marketingPlan = [
                    'ExecutiveSummary' => 'Plan marketing généré automatiquement',
                    'BusinessObjectives' => ['Augmenter la présence sur le marché'],
                    'TargetMarket' => [
                        'Segments' => ['Audience générale'],
                        'Channels' => ['En ligne', 'Direct']
                    ],
                    'Strategy' => [
                        'USP' => 'Proposition de valeur unique',
                        'Positioning' => 'Positionnement sur le marché',
                        'Pricing' => 'Prix compétitifs'
                    ],
                    'Actions' => [
                        [
                            'type' => 'Marketing Digital',
                            'description' => 'Mettre en place une stratégie sur les réseaux sociaux',
                            'timeline' => 'T1'
                        ]
                    ]
                ];
            }

            // Validate and clean the marketing plan structure
            $marketingPlan = $this->validateMarketingPlanStructure($marketingPlan);

            return [
                'success' => true,
                'marketing_plan' => $marketingPlan
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return [
                'success' => false,
                'error' => 'Failed to generate Marketing Plan. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Validate and clean marketing plan structure
     *
     * @param array $marketingPlan
     * @return array
     */
    private function validateMarketingPlanStructure(array $marketingPlan): array
    {
        // Ensure all required sections exist
        $defaultPlan = [
            'ExecutiveSummary' => '',
            'BusinessObjectives' => [],
            'TargetMarket' => [
                'Segments' => [],
                'Channels' => []
            ],
            'Strategy' => [
                'USP' => '',
                'Positioning' => '',
                'Pricing' => ''
            ],
            'Actions' => []
        ];

        // Merge with defaults and clean
        $cleanPlan = array_merge($defaultPlan, $marketingPlan);

        // Limit text lengths
        $cleanPlan['ExecutiveSummary'] = substr($cleanPlan['ExecutiveSummary'] ?? '', 0, 300);

        // Limit arrays
        $cleanPlan['BusinessObjectives'] = array_slice($cleanPlan['BusinessObjectives'] ?? [], 0, 3);
        $cleanPlan['TargetMarket']['Segments'] = array_slice($cleanPlan['TargetMarket']['Segments'] ?? [], 0, 4);
        $cleanPlan['TargetMarket']['Channels'] = array_slice($cleanPlan['TargetMarket']['Channels'] ?? [], 0, 4);

        // Clean strategy
        foreach (['USP', 'Positioning', 'Pricing'] as $key) {
            $cleanPlan['Strategy'][$key] = substr($cleanPlan['Strategy'][$key] ?? '', 0, 150);
        }

        // Clean actions
        $cleanPlan['Actions'] = array_map(function ($action) {
            return [
                'type' => substr($action['type'] ?? '', 0, 50),
                'description' => substr($action['description'] ?? '', 0, 200),
                'timeline' => substr($action['timeline'] ?? '', 0, 20)
            ];
        }, array_slice($cleanPlan['Actions'] ?? [], 0, 5));

        return $cleanPlan;
    }

    /**
     * Generate Financial Plan from a business plan
     *
     * @param string $businessPlan The business plan to analyze
     * @return array Financial Plan in structured format
     */
    public function generateFinancialPlan(string $businessPlan)
    {
        try {
            // Use user's preferred language instead of detecting from text
            $language = $this->userLanguage;

            $response = $this->client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Vous êtes un expert financier spécialisé dans la création de plans financiers complets pour les entreprises. Extrayez les informations du business plan fourni et créez un plan financier détaillé. Votre réponse doit être en FRANÇAIS et DOIT retourner UNIQUEMENT un objet JSON valide. NE PAS inclure de texte en dehors de la structure JSON.'
                    ],
                    [
                        'role' => 'user',
                        'content' => "Analysez ce business plan et créez un plan financier complet avec cette structure JSON exacte (en français) :
                        {
                            \"ExecutiveSummary\": \"Résumé des objectifs financiers et stratégies clés\",
                            \"RevenueProjections\": {
                                \"Year1\": {
                                    \"Q1\": \"XXXXX €\",
                                    \"Q2\": \"XXXXX €\",
                                    \"Q3\": \"XXXXX €\",
                                    \"Q4\": \"XXXXX €\",
                                    \"Total\": \"XXXXX €\"
                                },
                                \"Year2\": {
                                    \"Total\": \"XXXXX €\",
                                    \"GrowthRate\": \"X%\"
                                }
                            },
                            \"CostStructure\": {
                                \"FixedCosts\": [\"Loyer\", \"Salaires\", \"Abonnements\"],
                                \"VariableCosts\": [\"Matériaux\", \"Production\", \"Commission ventes\"],
                                \"TotalOperatingCosts\": \"XXXXX €\"
                            },
                            \"ProfitAndLoss\": {
                                \"GrossRevenue\": \"XXXXX €\",
                                \"COGS\": \"XXXXX €\",
                                \"GrossMargin\": \"X%\",
                                \"OperatingExpenses\": \"XXXXX €\",
                                \"EBITDA\": \"XXXXX €\",
                                \"NetProfit\": \"XXXXX €\"
                            },
                            \"CashFlow\": {
                                \"OperatingActivities\": \"XXXXX €\",
                                \"InvestingActivities\": \"XXXXX €\",
                                \"FinancingActivities\": \"XXXXX €\",
                                \"NetCashFlow\": \"XXXXX €\"
                            },
                            \"BreakEvenAnalysis\": {
                                \"UnitsToBreakEven\": \"XXXX\",
                                \"RevenueToBreakEven\": \"XXXXX €\",
                                \"TimeToBreakEven\": \"X mois/ans\"
                            },
                            \"FundingRequirements\": {
                                \"InitialInvestment\": \"XXXXX €\",
                                \"FundingSources\": [
                                    {
                                        \"Type\": \"Equity\",
                                        \"Amount\": \"XXXXX €\",
                                        \"Investor\": \"Nom investisseur\"
                                    },
                                    {
                                        \"Type\": \"Loan\",
                                        \"Amount\": \"XXXXX €\",
                                        \"InterestRate\": \"X%\"
                                    }
                                ],
                                \"UseOfFunds\": [\"R&D\", \"Marketing\", \"Infrastructure\"]
                            },
                            \"FinancialRatios\": {
                                \"Liquidity\": {
                                    \"CurrentRatio\": \"X.X\",
                                    \"QuickRatio\": \"X.X\"
                                },
                                \"Profitability\": {
                                    \"ROI\": \"X%\",
                                    \"ROE\": \"X%\"
                                },
                                \"Leverage\": {
                                    \"DebtToEquity\": \"X.X\"
                                }
                            },
                            \"Assumptions\": [
                                \"Taux de croissance du marché : X%\",
                                \"Inflation estimée : X%\",
                                \"Taux de défaut paiement : X%\"
                            ]
                        }

                        Business plan to analyze:
                        $businessPlan"
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 3000,
            ]);

            $content = $response->choices[0]->message->content;

            // Clean and parse the JSON content
            $content = $this->cleanJsonResponse($content);
            $financialPlan = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('Failed to parse Financial Plan JSON response: ' . json_last_error_msg());
                // Fallback structure
                $financialPlan = [
                    'ExecutiveSummary' => 'Auto-generated financial plan summary',
                    'RevenueProjections' => [
                        'Year1' => [
                            'Q1' => '10000 €',
                            'Q2' => '12000 €',
                            'Q3' => '15000 €',
                            'Q4' => '18000 €',
                            'Total' => '55000 €'
                        ],
                        'Year2' => [
                            'Total' => '80000 €',
                            'GrowthRate' => '45%'
                        ]
                    ],
                    // Basic structure with minimal content
                    'CostStructure' => [
                        'FixedCosts' => ['Loyer', 'Salaires', 'Abonnements'],
                        'VariableCosts' => ['Matériaux', 'Production', 'Commission ventes'],
                        'TotalOperatingCosts' => '35000 €'
                    ]
                ];
            }

            return [
                'success' => true,
                'financial_plan' => $financialPlan
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return [
                'success' => false,
                'error' => 'Failed to generate Financial Plan. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Clean and extract JSON from a text response that might contain additional content
     *
     * @param string $content
     * @return string
     */
    private function cleanJsonResponse(string $content): string
    {
        // Remove potential markdown code block markers
        $content = preg_replace('/```(?:json)?\s*|\s*```$/im', '', $content);

        // Try to extract JSON if the content still contains non-JSON text
        if (!$this->isValidJson($content)) {
            // Look for JSON between curly braces
            if (preg_match('/({.*})/s', $content, $matches)) {
                $potentialJson = $matches[1];
                if ($this->isValidJson($potentialJson)) {
                    return $potentialJson;
                }
            }

            // If we still don't have valid JSON, try to clean up common issues
            $content = preg_replace('/\s+/', ' ', $content); // Normalize whitespace
            $content = preg_replace('/,\s*}/', '}', $content); // Remove trailing commas
            $content = preg_replace('/,\s*]/', ']', $content); // Remove trailing commas in arrays
        }

        return $content;
    }

    /**
     * Check if a string is valid JSON
     *
     * @param string $string
     * @return bool
     */
    private function isValidJson(string $string): bool
    {
        json_decode($string);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Extract JSON from text that might contain additional content
     *
     * @param string $text
     * @return string
     */
    private function extractJsonFromText(string $text): string
    {
        // Try to find JSON content between curly braces
        if (preg_match('/({.*})/s', $text, $matches)) {
            $potentialJson = $matches[1];
            if ($this->isValidJson($potentialJson)) {
                return $potentialJson;
            }
        }

        // Fallback: basic structure for SWOT if no valid JSON is found
        return '{"Strengths":[],"Weaknesses":[],"Opportunities":[],"Threats":[]}';
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
            $project = \App\Models\Project::find($projectId);
            if (!$project) {
                return [
                    'success' => false,
                    'error' => 'Project not found'
                ];
            }

            // Retrieve business data
            $businessPlan = null;
            $marketingPlan = \App\Models\MarketingPlan::where('project_id', $projectId)->first();
            $swotAnalysis = \App\Models\SwotAnalysis::where('project_id', $projectId)->first();
            $blueOceanStrategy = \App\Models\BlueOceanStrategy::where('project_id', $projectId)->first();

            // Build the context for OpenAI
            $context = $this->buildSprintContext($project, $businessPlan, $marketingPlan, $swotAnalysis, $blueOceanStrategy);

            // Call OpenAI API to generate sprint content
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => "Vous êtes un planificateur de sprint IA spécialisé dans la génération de tâches hebdomadaires pour les entreprises. Votre tâche est de créer un plan de sprint hebdomadaire structuré avec des tâches quotidiennes. Pour chaque jour de la semaine (lundi à dimanche), générez AU MOINS 6 tâches. Formatez la sortie en JSON. Incluez un titre et une description de sprint qui résument l'objectif de la semaine. Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS."
                    ],
                    [
                        'role' => 'user',
                        'content' => "Générez un plan de sprint hebdomadaire en français pour l'entreprise suivante : \n\n" . $context
                    ]
                ],
                'temperature' => 0.7
                // 🔧 CORRECTION : response_format retiré car non supporté par toutes les versions GPT-4
            ]);

            // Get the content from response
            $content = $response->choices[0]->message->content;

            // Parse the JSON response
            $sprintData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // Handle invalid JSON
                return [
                    'success' => false,
                    'error' => 'Failed to parse sprint data',
                    'details' => json_last_error_msg()
                ];
            }

            return [
                'success' => true,
                'sprint' => $sprintData
            ];
        } catch (Exception $e) {
            Log::error('OpenAI API Error when generating sprint: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to generate sprint plan. Please try again later.',
                'details' => $e->getMessage()
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
            $sprint = \App\Models\Sprint::with('tasks')->find($sprintId);
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
            $marketingPlan = \App\Models\MarketingPlan::where('project_id', $project->id)->first();

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
                $context .= "Business plan summary: " . substr($businessPlan->text_content, 0, 1000) . "\n\n";
            }

            if ($marketingPlan) {
                $context .= "Marketing plan summary: " . substr($marketingPlan->content, 0, 1000) . "\n\n";
            }

            $context .= "Existing tasks for this day:\n";
            foreach ($existingTasks as $task) {
                $context .= "- {$task['title']}: {$task['description']}\n";
            }

            $context .= "\nPlease generate {$count} new tasks for {$dayOfWeek} that are different from the existing tasks.";

            // Call OpenAI API
            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => "Vous êtes un planificateur de tâches IA. Générez des tâches business quotidiennes qui sont spécifiques, actionnables et pertinentes pour le contexte business. Formatez votre réponse en JSON avec un tableau de tâches. Chaque tâche doit avoir un titre, une description, un type (mission, vision, objective, ou action), et une priorité (high, medium, low, ou normal). Vous DEVEZ répondre UNIQUEMENT en FRANÇAIS."
                    ],
                    [
                        'role' => 'user',
                        'content' => $context
                    ]
                ],
                'temperature' => 0.7
                // 🔧 CORRECTION : response_format retiré car non supporté par toutes les versions GPT-4
            ]);

            // Parse the response
            $content = $response->choices[0]->message->content;
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
     * @param \App\Models\Project $project
     * @param null $businessPlan
     * @param \App\Models\MarketingPlan|null $marketingPlan
     * @param \App\Models\SwotAnalysis|null $swotAnalysis
     * @param \App\Models\BlueOceanStrategy|null $blueOceanStrategy
     * @return string
     */
    private function buildSprintContext($project, $businessPlan, $marketingPlan, $swotAnalysis, $blueOceanStrategy)
    {
        $context = "Project: {$project->name}\n";
        if ($project->description) {
            $context .= "Description: {$project->description}\n\n";
        }

        if ($businessPlan) {
            $context .= "Business Plan Summary:\n" . substr($businessPlan->text_content, 0, 1000) . "\n\n";
        }

        if ($marketingPlan) {
            $context .= "Marketing Plan Summary:\n" . substr($marketingPlan->content, 0, 1000) . "\n\n";
        }

        if ($swotAnalysis) {
            $swotContent = json_decode($swotAnalysis->content, true);
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
            $blueOceanContent = json_decode($blueOceanStrategy->content, true);
            $context .= "Blue Ocean Strategy:\n";

            if (isset($blueOceanContent['facteursCles']) && is_array($blueOceanContent['facteursCles'])) {
                $context .= "Key Factors: " . implode(", ", array_slice($blueOceanContent['facteursCles'], 0, 3)) . "\n";
            }

            $context .= "\n";
        }

        $context .= "Requirements:\n";
        $context .= "1. Generate a weekly sprint with a clear title and description\n";
        $context .= "2. For each day (Monday through Sunday), create AT LEAST 6 tasks\n";
        $context .= "3. Each task should have a title, description, type (mission, vision, objective, or action), and priority (high, medium, low, or normal)\n";
        $context .= "4. Tasks must be specific, actionable, and directly related to the business context\n";
        $context .= "5. Include a good mix of strategic and tactical tasks\n";
        $context .= "6. Format the output as structured JSON\n";

        return $context;
    }



    /**
     * 🔧 Wrapper statique pour appels ChatCompletion directs
     *
     * Méthode utilitaire pour les autres services qui ont besoin
     * d'accéder directement à l'API OpenAI.
     *
     * @param array $messages Messages au format ChatML
     * @param string $model Modèle OpenAI à utiliser
     * @param int $maxTokens Limite de tokens
     * @param float $temperature Créativité (0.0 à 1.0)
     * @return array Réponse brute de l'API
     * @throws Exception Si l'appel API échoue
     *
     * @example
     * $response = OpenAIService::generateChatCompletion([
     *     ['role' => 'user', 'content' => 'Hello']
     * ], 'gpt-3.5-turbo', 100, 0.7);
     */
    public static function generateChatCompletion(
        array $messages,
        string $model = self::DEFAULT_MODEL,
        int $maxTokens = self::DEFAULT_MAX_TOKENS,
        float $temperature = self::DEFAULT_TEMPERATURE
    ): array {
        try {
            $client = OpenAI::client(config('services.openai.api_key'));
            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $messages,
                'max_tokens' => $maxTokens,
                'temperature' => $temperature,
            ]);

            return (array) $response->toArray();
        } catch (Exception $e) {
            Log::error(self::LOG_PREFIX . " Erreur generateChatCompletion", [
                'error' => $e->getMessage(),
                'model' => $model
            ]);

            return [
                'error' => $e->getMessage(),
            ];
        }
    }



    public static function preonboardingResume($preOnboardingData)
    {
        // Detect language from the data
        $dataText = is_array($preOnboardingData) ? json_encode($preOnboardingData) : $preOnboardingData;
        $detectedLanguage = self::getLanguage($dataText);

        $prompt = "Génère un résumé du business plan à partir des données suivantes : " . json_encode($preOnboardingData);
        $response = self::generateChatCompletion([
            [
                'role' => 'system',
                'content' => 'Tu es un assistant specialise en analyse de données. Tu dois analyser les données suivantes et retourner un résumé sous forme de JSON avec les champs suivants : name, description, target_audience, main_objective, obstacles, language. Le champ language doit être le nom du langue utilisée dans les données que tu vas detecter. Please respond in ' . $detectedLanguage . '.
            Retourne uniquement le JSON comme suit, sans aucun autre texte :
            {
                "name": "...",
                "description": "...",
                "target_audience": "...",
                "main_objective": "...",
                "obstacles": "..."
            }'
            ],
            ['role' => 'user', 'content' => $prompt],
        ]);

        // Vérifier si la réponse contient une erreur
        if (isset($response['error'])) {
            return [
                'success' => false,
                'error' => 'OpenAI API error',
                'details' => $response['error']
            ];
        }

        // Accéder aux données comme un array, pas comme un objet
        if (!isset($response['choices'][0]['message']['content'])) {
            return [
                'success' => false,
                'error' => 'Invalid response format',
                'details' => 'No content found in response'
            ];
        }

        $content = $response['choices'][0]['message']['content'];
        $parsedResponse = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => 'Failed to parse response',
                'details' => json_last_error_msg()
            ];
        }

        return [
            'success' => true,
            'data' => $parsedResponse
        ];
    }

    /**
     * Create an instance with a specific language
     *
     * @param string $language
     * @return OpenAIService
     */
    public static function withLanguage(string $language): self
    {
        $instance = new self();
        $instance->userLanguage = $instance->mapLanguageToFullName($language);
        return $instance;
    }

    /**
     * Generate a comprehensive professional PDF content using AI
     *
     * @param array $projectData All business data for the project
     * @return array Generated HTML content for PDF
     */
    public function generateProfessionalPDF(array $projectData): array
    {
        try {
            // Build comprehensive context from all available data
            $context = $this->buildPDFContext($projectData);

            $prompt = "Tu es un expert en rédaction de business plans professionnels. À partir des données fournies, génère un document HTML complet et professionnel pour un business plan PDF.

EXIGENCES OBLIGATOIRES :
- Le document doit faire AU MINIMUM 3 pages complètes
- Utilise un style HTML professionnel avec CSS intégré
- Ajoute des tableaux HTML pour les données financières et analyses
- Structure le document avec des sections claires et hiérarchisées
- Inclus des éléments visuels en HTML/CSS (boîtes, encadrés, couleurs)
- Le contenu doit être ENTIÈREMENT en " . $this->userLanguage . "
- Génère du contenu substantiel et détaillé pour chaque section

STRUCTURE REQUISE :
1. Page de couverture avec titre et informations du projet
2. Résumé exécutif (1/2 page)
3. Analyse détaillée du business plan (1+ page)
4. Analyse SWOT avec tableau HTML structuré
5. Stratégie Océan Bleu avec innovations
6. Plan Marketing détaillé avec segmentation
7. Plan Financier avec tableaux de projections
8. Recommandations et conclusion

STYLE CSS À INTÉGRER :
- Couleurs professionnelles (bleu corporate #2c5aa0, gris #666)
- Typographie claire et hiérarchisée
- Tableaux avec bordures et alternance de couleurs
- Boîtes de mise en évidence avec gradient
- Marges et espacements optimisés pour impression

DONNÉES À UTILISER :
" . $context . "

Génère UNIQUEMENT le code HTML complet avec CSS intégré. Ne retourne AUCUN texte explicatif, juste le HTML prêt pour génération PDF.";

            $response = $this->client->chat()->create([
                'model' => 'gpt-4',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Tu es un expert en génération de documents professionnels. Tu génères uniquement du code HTML avec CSS intégré, optimisé pour la conversion en PDF. Tes documents sont toujours complets, détaillés et professionnels. Tu dois répondre en ' . $this->userLanguage . '.'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'temperature' => 0.7,
                'max_tokens' => 4000,
            ]);

            $htmlContent = $response->choices[0]->message->content;

            // Clean up the HTML if needed
            $htmlContent = $this->cleanHTMLResponse($htmlContent);

            return [
                'success' => true,
                'html_content' => $htmlContent
            ];

        } catch (Exception $e) {
            Log::error('OpenAI PDF Generation Error: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => 'Failed to generate PDF content. Please try again later.',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Build comprehensive context for PDF generation
     *
     * @param array $projectData
     * @return string
     */
    private function buildPDFContext(array $projectData): string
    {
        $context = "";

        // Project information
        if (isset($projectData['project'])) {
            $project = $projectData['project'];
            $context .= "PROJET :\n";
            $context .= "Nom : " . ($project['name'] ?? 'N/A') . "\n";
            $context .= "Description : " . ($project['description'] ?? 'N/A') . "\n\n";
        }

        // Business Plan
        if (isset($projectData['businessPlan']) && $projectData['businessPlan']) {
            $context .= "BUSINESS PLAN :\n";
            if (isset($projectData['businessPlan']['text_content'])) {
                $context .= "Contenu : " . substr($projectData['businessPlan']['text_content'], 0, 2000) . "\n";
            }
            if (isset($projectData['businessPlan']['html_content'])) {
                $context .= "Contenu HTML : " . substr(strip_tags($projectData['businessPlan']['html_content']), 0, 1000) . "\n";
            }
            if (isset($projectData['businessPlan']['recommendations'])) {
                $context .= "Recommandations : " . $projectData['businessPlan']['recommendations'] . "\n";
            }
            $context .= "\n";
        }

        // SWOT Analysis
        if (isset($projectData['swotAnalysis']) && $projectData['swotAnalysis']) {
            // Check if content is already an array or needs to be decoded
            $swotContent = $projectData['swotAnalysis']['content'];
            if (is_string($swotContent)) {
                $swot = json_decode($swotContent, true);
            } else {
                $swot = $swotContent; // Already an array
            }

            if ($swot && is_array($swot)) {
                $context .= "ANALYSE SWOT :\n";
                if (isset($swot['forces']) && is_array($swot['forces'])) {
                    $context .= "Forces : " . implode(", ", array_slice($swot['forces'], 0, 5)) . "\n";
                }
                if (isset($swot['faiblesses']) && is_array($swot['faiblesses'])) {
                    $context .= "Faiblesses : " . implode(", ", array_slice($swot['faiblesses'], 0, 5)) . "\n";
                }
                if (isset($swot['opportunites']) && is_array($swot['opportunites'])) {
                    $context .= "Opportunités : " . implode(", ", array_slice($swot['opportunites'], 0, 5)) . "\n";
                }
                if (isset($swot['menaces']) && is_array($swot['menaces'])) {
                    $context .= "Menaces : " . implode(", ", array_slice($swot['menaces'], 0, 5)) . "\n";
                }
                $context .= "\n";
            }
        }

        // Blue Ocean Strategy
        if (isset($projectData['blueOceanStrategy']) && $projectData['blueOceanStrategy']) {
            // Check if content is already an array or needs to be decoded
            $blueOceanContent = $projectData['blueOceanStrategy']['content'];
            if (is_string($blueOceanContent)) {
                $blueOcean = json_decode($blueOceanContent, true);
            } else {
                $blueOcean = $blueOceanContent; // Already an array
            }

            if ($blueOcean && is_array($blueOcean)) {
                $context .= "STRATÉGIE OCÉAN BLEU :\n";
                if (isset($blueOcean['facteursCles']) && is_array($blueOcean['facteursCles'])) {
                    $context .= "Facteurs clés : " . implode(", ", array_slice($blueOcean['facteursCles'], 0, 5)) . "\n";
                }
                if (isset($blueOcean['innovationsMarche']) && is_array($blueOcean['innovationsMarche'])) {
                    $context .= "Innovations : " . implode(", ", array_slice($blueOcean['innovationsMarche'], 0, 5)) . "\n";
                }
                $context .= "\n";
            }
        }

        // Marketing Plan
        if (isset($projectData['marketingPlan']) && $projectData['marketingPlan']) {
            // Check if content is already an array or needs to be decoded
            $marketingContent = $projectData['marketingPlan']['content'];
            if (is_string($marketingContent)) {
                $marketing = json_decode($marketingContent, true);
            } else {
                $marketing = $marketingContent; // Already an array
            }

            if ($marketing && is_array($marketing)) {
                $context .= "PLAN MARKETING :\n";
                if (isset($marketing['ExecutiveSummary'])) {
                    $context .= "Résumé : " . substr($marketing['ExecutiveSummary'], 0, 300) . "\n";
                }
                if (isset($marketing['TargetMarket'])) {
                    $context .= "Marché cible : " . (is_array($marketing['TargetMarket']) ? json_encode($marketing['TargetMarket']) : $marketing['TargetMarket']) . "\n";
                }
                if (isset($marketing['BusinessObjectives']) && is_array($marketing['BusinessObjectives'])) {
                    $context .= "Objectifs : " . implode(", ", array_slice($marketing['BusinessObjectives'], 0, 3)) . "\n";
                }
                $context .= "\n";
            }
        }

        // Financial Plan
        if (isset($projectData['financialPlan']) && $projectData['financialPlan']) {
            // Check if content is already an array or needs to be decoded
            $financialContent = $projectData['financialPlan']['content'];
            if (is_string($financialContent)) {
                $financial = json_decode($financialContent, true);
            } else {
                $financial = $financialContent; // Already an array
            }

            if ($financial && is_array($financial)) {
                $context .= "PLAN FINANCIER :\n";
                if (isset($financial['ExecutiveSummary'])) {
                    $context .= "Résumé financier : " . substr($financial['ExecutiveSummary'], 0, 300) . "\n";
                }
                if (isset($financial['RevenueProjections'])) {
                    $context .= "Projections de revenus : " . (is_array($financial['RevenueProjections']) ? json_encode($financial['RevenueProjections']) : $financial['RevenueProjections']) . "\n";
                }
                if (isset($financial['FundingRequirements'])) {
                    $context .= "Besoins de financement : " . (is_array($financial['FundingRequirements']) ? json_encode($financial['FundingRequirements']) : $financial['FundingRequirements']) . "\n";
                }
                $context .= "\n";
            }
        }

        return $context;
    }

    /**
     * Clean HTML response from AI
     *
     * @param string $html
     * @return string
     */
    private function cleanHTMLResponse(string $html): string
    {
        // Remove markdown code block markers if present
        $html = preg_replace('/```(?:html)?\s*|\s*```$/im', '', $html);

        // Ensure we have a complete HTML document
        if (!str_contains($html, '<!DOCTYPE') && !str_contains($html, '<html')) {
            $html = "<!DOCTYPE html>\n<html>\n<head><meta charset='UTF-8'></head>\n<body>\n" . $html . "\n</body>\n</html>";
        }

        return trim($html);
    }



    /**
     * ✅ Extraire le domaine principal d'un texte
     */
    private function extractDomainFromText(string $text): string
    {
        $text = strtolower($text);

        $domains = [
            'tech' => ['tech', 'technologie', 'développement', 'web', 'app', 'digital', 'innovation', 'informatique'],
            'business' => ['business', 'entreprise', 'startup', 'marketing', 'vente', 'commerce'],
            'finance' => ['finance', 'comptabilité', 'budget', 'investissement', 'économie', 'argent'],
            'santé' => ['santé', 'médical', 'thérapie', 'bien-être', 'nutrition', 'fitness'],
            'éducation' => ['éducation', 'formation', 'enseignement', 'apprentissage', 'cours'],
            'créatif' => ['design', 'créatif', 'art', 'graphique', 'visuel', 'artistique'],
        ];

        foreach ($domains as $domain => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    return $domain;
                }
            }
        }

        return 'général';
    }

    /**
     * ✅ Extraire des mots-clés d'un texte
     */
    private function extractKeywordsFromText(string $text): array
    {
        $text = strtolower($text);
        $text = preg_replace('/[^\w\sàâäéèêëïîôùûüÿñç]/u', ' ', $text);

        $stopWords = [
            'le',
            'la',
            'les',
            'un',
            'une',
            'des',
            'du',
            'de',
            'et',
            'ou',
            'mais',
            'donc',
            'or',
            'ni',
            'car',
            'que',
            'qui',
            'quoi',
            'dont',
            'où',
            'est',
            'sont',
            'être',
            'avoir',
            'fait',
            'faire',
            'pour',
            'dans',
            'sur',
            'avec',
            'sans',
            'par',
            'entre',
            'vers',
            'chez',
        ];

        $words = preg_split('/\s+/', $text);
        $keywords = [];

        foreach ($words as $word) {
            $word = trim($word);
            if (strlen($word) > 3 && !in_array($word, $stopWords)) {
                $keywords[] = $word;
            }
        }

        return array_unique($keywords);
    }

    /**
     * 🤖 Générer du contenu enrichi pour l'assistant IA
     *
     * Cette méthode prend un document analysé et génère un contenu optimisé
     * spécialement pour enrichir la base de connaissances de l'assistant.
     *
     * Le contenu généré n'est ni un simple résumé ni le document original,
     * mais une version enrichie et structurée pour l'assistant.
     *
     * @param string $originalText Texte original extrait du document
     * @param array $documentAnalysis Analyse complète du document
     * @param array $documentMetadata Métadonnées du document (nom, type, etc.)
     * @return array Contenu enrichi pour l'assistant
     */
    public function generateEnrichedAssistantContent(string $originalText, array $documentAnalysis, array $documentMetadata = []): array
    {
        try {
            Log::info(self::LOG_PREFIX . ' Génération contenu enrichi assistant', [
                'document_name' => $documentMetadata['filename'] ?? 'Unknown',
                'original_length' => strlen($originalText),
                'has_analysis' => !empty($documentAnalysis)
            ]);

            // Construire le contexte pour l'IA
            $context = $this->buildAssistantContentContext($originalText, $documentAnalysis, $documentMetadata);

            $prompt = "Tu es un expert en synthèse de connaissances business. À partir des informations suivantes, génère un contenu enrichi et structuré spécialement optimisé pour enrichir la base de connaissances d'un assistant IA entrepreneurial.

OBJECTIF : Créer un contenu qui permettra à l'assistant de donner des conseils pertinents et personnalisés basés sur cette analyse.

EXIGENCES :
- Synthétiser les informations clés sans perdre les détails importants
- Structurer le contenu pour faciliter la recherche et l'utilisation par l'IA
- Ajouter du contexte business et des connections avec d'autres concepts
- Optimiser pour l'aide à la décision entrepreneuriale
- Inclure des mots-clés et concepts-clés pour la recherche sémantique
- Langue : " . $this->userLanguage . "

FORMAT DE SORTIE : JSON avec cette structure exacte :
{
    \"title\": \"Titre descriptif du document\",
    \"business_context\": \"Contexte business général (2-3 phrases)\",
    \"key_insights\": [\"Liste des insights principaux (4-6 points)\"],
    \"actionable_recommendations\": [\"Recommandations concrètes et applicables (3-5 points)\"],
    \"business_concepts\": [\"Concepts business identifiés dans le document\"],
    \"keywords\": [\"Mots-clés pour recherche sémantique\"],
    \"strategic_implications\": \"Implications stratégiques principales\",
    \"decision_support\": {
        \"strengths_identified\": [\"Forces identifiées\"],
        \"risks_highlighted\": [\"Risques mis en évidence\"],
        \"opportunities\": [\"Opportunités détectées\"]
    },
    \"assistant_guidance\": \"Instructions pour l'assistant sur comment utiliser ces informations pour conseiller l'utilisateur\"
}

DONNÉES À ANALYSER :
" . $context;

            // Configuration pour le modèle
            $messages = [
                [
                    'role' => 'system',
                    'content' => 'Tu es un expert en analyse business et en création de bases de connaissances pour assistants IA. Tu génères du contenu structuré et enrichi optimisé pour l\'aide à la décision entrepreneuriale. Réponds uniquement en JSON valide sans texte additionnel.'
                ],
                [
                    'role' => 'user',
                    'content' => $prompt
                ]
            ];

            $params = [
                'messages' => $messages,
                'temperature' => 0.6, // Équilibre entre créativité et précision
                'max_tokens' => 2000
                // 🔧 CORRECTION : response_format retiré car non supporté par toutes les versions GPT-4
            ];

            // Essai avec GPT-4 puis fallback vers GPT-3.5
            try {
                $params['model'] = 'gpt-4';
                $response = $this->client->chat()->create($params);
            } catch (Exception $e) {
                Log::warning(self::LOG_PREFIX . ' GPT-4 failed for assistant content: ' . $e->getMessage());

                if (str_contains($e->getMessage(), 'quota') || str_contains($e->getMessage(), 'model')) {
                    try {
                        $params['model'] = 'gpt-3.5-turbo';
                        $response = $this->client->chat()->create($params);
                    } catch (Exception $e2) {
                        Log::error(self::LOG_PREFIX . ' GPT-3.5 fallback failed: ' . $e2->getMessage());
                        return [
                            'success' => false,
                            'error' => 'AI generation failed with both GPT-4 and GPT-3.5',
                            'details' => $e2->getMessage()
                        ];
                    }
                } else {
                    return [
                        'success' => false,
                        'error' => 'AI generation failed',
                        'details' => $e->getMessage()
                    ];
                }
            }

            $content = $response->choices[0]->message->content;

            // Parser et valider le JSON
            $enrichedContent = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning(self::LOG_PREFIX . ' Invalid JSON response for assistant content: ' . json_last_error_msg());

                // Contenu de fallback structuré
                $enrichedContent = $this->generateFallbackAssistantContent($originalText, $documentAnalysis, $documentMetadata);
            }

            // Validation et nettoyage du contenu
            $enrichedContent = $this->validateAndCleanAssistantContent($enrichedContent);

            Log::info(self::LOG_PREFIX . ' Contenu enrichi assistant généré avec succès', [
                'content_size' => strlen(json_encode($enrichedContent)),
                'key_insights_count' => count($enrichedContent['key_insights'] ?? []),
                'recommendations_count' => count($enrichedContent['actionable_recommendations'] ?? [])
            ]);

            return [
                'success' => true,
                'enriched_content' => $enrichedContent,
                'content_size' => strlen(json_encode($enrichedContent)),
                'generation_metadata' => [
                    'model_used' => $params['model'],
                    'generated_at' => now()->toISOString(),
                    'source_document' => $documentMetadata['filename'] ?? 'Unknown'
                ]
            ];

        } catch (Exception $e) {
            Log::error(self::LOG_PREFIX . ' Erreur génération contenu assistant', [
                'error' => $e->getMessage(),
                'document' => $documentMetadata['filename'] ?? 'Unknown'
            ]);

            return [
                'success' => false,
                'error' => 'Failed to generate enriched assistant content',
                'details' => $e->getMessage()
            ];
        }
    }

    /**
     * Construire le contexte pour la génération de contenu assistant
     */
    private function buildAssistantContentContext(string $originalText, array $documentAnalysis, array $documentMetadata): string
    {
        $context = "";

        // Métadonnées du document
        if (!empty($documentMetadata)) {
            $context .= "DOCUMENT :\n";
            $context .= "- Nom : " . ($documentMetadata['filename'] ?? 'Non spécifié') . "\n";
            $context .= "- Type : " . ($documentMetadata['file_type'] ?? 'Non spécifié') . "\n";
            $context .= "- Taille : " . ($documentMetadata['size_formatted'] ?? 'Non spécifiée') . "\n\n";
        }

        // Analyse existante
        if (!empty($documentAnalysis)) {
            $context .= "ANALYSE EXISTANTE :\n";

            if (isset($documentAnalysis['analysis_summary'])) {
                $context .= "Résumé : " . substr($documentAnalysis['analysis_summary'], 0, 1000) . "\n\n";
            }

            if (isset($documentAnalysis['key_insights']) && is_array($documentAnalysis['key_insights'])) {
                $context .= "Insights clés : " . implode(', ', array_slice($documentAnalysis['key_insights'], 0, 5)) . "\n\n";
            }

            if (isset($documentAnalysis['business_recommendations']) && is_array($documentAnalysis['business_recommendations'])) {
                $context .= "Recommandations : " . implode(', ', array_slice($documentAnalysis['business_recommendations'], 0, 5)) . "\n\n";
            }

            if (isset($documentAnalysis['confidence_score'])) {
                $context .= "Score de confiance : " . $documentAnalysis['confidence_score'] . "%\n\n";
            }
        }

        // Extrait du texte original (limité)
        $textPreview = substr($originalText, 0, 2000);
        $context .= "EXTRAIT DU CONTENU ORIGINAL :\n" . $textPreview;

        if (strlen($originalText) > 2000) {
            $context .= "\n\n[... Contenu tronqué, document complet disponible pour analyse approfondie ...]";
        }

        return $context;
    }

    /**
     * Générer un contenu assistant de fallback en cas d'échec IA
     */
    private function generateFallbackAssistantContent(string $originalText, array $documentAnalysis, array $documentMetadata): array
    {
        return [
            'title' => $documentMetadata['filename'] ?? 'Document Business',
            'business_context' => 'Document analysé contenant des informations business importantes pour l\'aide à la décision entrepreneuriale.',
            'key_insights' => $documentAnalysis['key_insights'] ?? ['Analyse du document disponible'],
            'actionable_recommendations' => $documentAnalysis['business_recommendations'] ?? ['Recommandations basées sur l\'analyse'],
            'business_concepts' => $this->extractKeywordsFromText($originalText),
            'keywords' => array_slice($this->extractKeywordsFromText($originalText), 0, 10),
            'strategic_implications' => 'Implications stratégiques identifiées lors de l\'analyse du document.',
            'decision_support' => [
                'strengths_identified' => ['Points forts identifiés dans le document'],
                'risks_highlighted' => ['Risques potentiels à considérer'],
                'opportunities' => ['Opportunités détectées']
            ],
            'assistant_guidance' => 'Utiliser ces informations pour fournir des conseils personnalisés et contextualisés à l\'utilisateur.'
        ];
    }

    /**
     * Valider et nettoyer le contenu assistant généré
     */
    private function validateAndCleanAssistantContent(array $content): array
    {
        $defaultStructure = [
            'title' => '',
            'business_context' => '',
            'key_insights' => [],
            'actionable_recommendations' => [],
            'business_concepts' => [],
            'keywords' => [],
            'strategic_implications' => '',
            'decision_support' => [
                'strengths_identified' => [],
                'risks_highlighted' => [],
                'opportunities' => []
            ],
            'assistant_guidance' => ''
        ];

        // Fusionner avec la structure par défaut
        $cleanContent = array_merge($defaultStructure, $content);

        // Nettoyer et limiter les tableaux
        $cleanContent['key_insights'] = array_slice(array_filter($cleanContent['key_insights']), 0, 6);
        $cleanContent['actionable_recommendations'] = array_slice(array_filter($cleanContent['actionable_recommendations']), 0, 5);
        $cleanContent['business_concepts'] = array_slice(array_filter($cleanContent['business_concepts']), 0, 10);
        $cleanContent['keywords'] = array_slice(array_filter($cleanContent['keywords']), 0, 15);

        // Limiter la longueur des textes
        $cleanContent['title'] = substr($cleanContent['title'], 0, 200);
        $cleanContent['business_context'] = substr($cleanContent['business_context'], 0, 500);
        $cleanContent['strategic_implications'] = substr($cleanContent['strategic_implications'], 0, 500);
        $cleanContent['assistant_guidance'] = substr($cleanContent['assistant_guidance'], 0, 500);

        // Valider la structure decision_support
        if (!is_array($cleanContent['decision_support'])) {
            $cleanContent['decision_support'] = $defaultStructure['decision_support'];
        } else {
            $cleanContent['decision_support']['strengths_identified'] = array_slice(
                array_filter($cleanContent['decision_support']['strengths_identified'] ?? []),
                0,
                5
            );
            $cleanContent['decision_support']['risks_highlighted'] = array_slice(
                array_filter($cleanContent['decision_support']['risks_highlighted'] ?? []),
                0,
                5
            );
            $cleanContent['decision_support']['opportunities'] = array_slice(
                array_filter($cleanContent['decision_support']['opportunities'] ?? []),
                0,
                5
            );
        }

        return $cleanContent;
    }

    // ✅ FIN DES AMÉLIORATIONS - LE RESTE DE VOTRE SERVICE RESTE INTACT

    /**
     * Améliore et structure les données d'un projet en utilisant l'IA
     *
     * @param array $projectData
     * @return array
     */
    public function enhanceProjectDescription(array $projectData)
    {
        try {
            Log::info(self::LOG_PREFIX . ' Début de l\'amélioration des données du projet');

            $prompt = $this->buildProjectEnhancementPrompt($projectData);

            $messages = [
                [
                    'role' => 'system',
                    'content' => 'Vous êtes un consultant expert en création d\'entreprise. Votre rôle est d\'analyser et d\'améliorer les descriptions de projets entrepreneuriaux pour les rendre plus précises, professionnelles et exploitables. Répondez UNIQUEMENT en JSON valide avec la structure demandée. IMPORTANT : Répondez TOUJOURS en français, même si les données d\'entrée sont dans une autre langue.'
                ],
                ['role' => 'user', 'content' => $prompt]
            ];

            $response = $this->client->chat()->create([
                'model' => self::DEFAULT_MODEL,
                'messages' => $messages,
                'temperature' => 0.3, // Plus bas pour des réponses plus cohérentes
                'max_tokens' => 1500,
            ]);

            $content = trim($response->choices[0]->message->content);
            Log::info(self::LOG_PREFIX . ' Réponse brute de l\'IA reçue');

            // Nettoyer et parser le JSON
            $content = $this->cleanJsonResponse($content);
            $enhancedData = json_decode($content, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error(self::LOG_PREFIX . ' Erreur de parsing JSON: ' . json_last_error_msg());
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response from AI',
                    'raw_response' => $content
                ];
            }

            // Valider la structure de la réponse
            if (!$this->validateEnhancedProjectData($enhancedData)) {
                Log::error(self::LOG_PREFIX . ' Structure de données invalide');
                return [
                    'success' => false,
                    'error' => 'Invalid data structure from AI',
                    'raw_response' => $content
                ];
            }

            Log::info(self::LOG_PREFIX . ' Amélioration des données du projet terminée avec succès');

            return [
                'success' => true,
                'enhanced_data' => $enhancedData,
                'original_data' => $projectData
            ];

        } catch (\Exception $e) {
            Log::error(self::LOG_PREFIX . ' Erreur lors de l\'amélioration du projet: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'enhanced_data' => null
            ];
        }
    }

    /**
     * Construit le prompt pour l'amélioration des données du projet
     *
     * @param array $projectData
     * @return string
     */
    private function buildProjectEnhancementPrompt(array $projectData): string
    {
        $prompt = "Analysez et améliorez les informations suivantes d'un projet entrepreneurial :\n\n";

        $prompt .= "DONNÉES ORIGINALES :\n";
        $prompt .= "• Nom du projet et  : " . ($projectData['project_name'] ?? 'Non défini') . "\n";
        $prompt .= "• Description : " . ($projectData['business_description'] ?? 'Non définie') . "\n";
        $prompt .= "• Public cible : " . ($projectData['target_audience'] ?? 'Non défini') . "\n";
        $prompt .= "• Objectif principal : " . ($projectData['main_objective'] ?? 'Non défini') . "\n";
        $prompt .= "• Obstacles identifiés : " . ($projectData['obstacles'] ?? 'Non définis') . "\n\n";

        $prompt .= "CONSIGNES :\n";
        $prompt .= "1. Améliorez la description en la rendant plus professionnelle et détaillée\n";
        $prompt .= "2. Précisez le public cible avec plus de détails démographiques/psychographiques\n";
        $prompt .= "3. Reformulez l'objectif principal de manière SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel)\n";
        $prompt .= "4. Analysez les obstacles et proposez des pistes de solution\n";
        $prompt .= "5. Ajoutez des insights stratégiques et des recommandations\n\n";

        $prompt .= "RÉPONDEZ UNIQUEMENT avec un JSON valide suivant cette structure exacte :\n";
        $prompt .= "{\n";
        $prompt .= '  "project_name": "Nom exact du projet",' . "\n";
        $prompt .= '  "enhanced_description": "Description professionnelle et détaillée (200-400 mots)",' . "\n";
        $prompt .= '  "refined_target_audience": "Public cible précis avec segments détaillés",' . "\n";
        $prompt .= '  "refined_main_objective": "Objectif reformulé selon méthode SMART",' . "\n";
        $prompt .= '  "analyzed_obstacles": "Obstacles reformulés avec analyse approfondie",' . "\n";
        $prompt .= '  "ai_insights": "3-5 insights stratégiques clés pour ce projet",' . "\n";
        $prompt .= '  "ai_recommendations": "5-7 recommandations d\'actions prioritaires"' . "\n";
        $prompt .= "}\n\n";

        $prompt .= "Assurez-vous que le JSON soit parfaitement formaté et valide. N'ajoutez AUCUN texte avant ou après le JSON.";

        return $prompt;
    }



    /**
     * Valide la structure des données améliorées
     *
     * @param array|null $data
     * @return bool
     */
    private function validateEnhancedProjectData($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        $requiredFields = [
            'project_name',
            'enhanced_description',
            'refined_target_audience',
            'refined_main_objective',
            'analyzed_obstacles',
            'ai_insights',
            'ai_recommendations'
        ];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || !is_string($data[$field]) || empty(trim($data[$field]))) {
                Log::warning(self::LOG_PREFIX . " Champ manquant ou vide: {$field}");
                return false;
            }
        }

        return true;
    }






}
