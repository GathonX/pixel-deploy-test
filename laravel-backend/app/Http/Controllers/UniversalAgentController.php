<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\AgentIntelligent\UniversalAgentService;
use App\Services\AgentIntelligent\AgentContextService;
use App\Models\IntelligentAgent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class UniversalAgentController extends Controller
{
    protected UniversalAgentService $universalAgentService;
    protected AgentContextService $contextService;

    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Interaction universelle avec l'agent — traitement synchrone
     */
    public function interact(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'context' => 'sometimes|array',
        ]);

        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'Non authentifié',
                ], 401);
            }

            $message = $request->input('message');
            $context = $request->input('context', []);

            Log::info('Universal Agent Interaction - Mode Sync', [
                'user_id' => $user->id,
                'message_length' => strlen($message),
            ]);

            // Traitement synchrone direct — pas de queue
            $service  = new UniversalAgentService($user);
            $response = $service->processInteraction($message, $context);

            return response()->json(array_merge(
                ['success' => true, 'async' => false],
                $response
            ));

        } catch (\Exception $e) {
            Log::error('Universal Agent Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors du traitement : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Récupérer le résultat d'une interaction async
     */
    public function poll(string $interactionId): JsonResponse
    {
        try {
            $result = Cache::get("agent_interaction_{$interactionId}");

            if (!$result) {
                return response()->json([
                    'success' => false,
                    'status' => 'not_found',
                    'error' => 'Interaction non trouvée'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'interaction_id' => $interactionId,
                'status' => $result['status'],
                'response' => $result['response'] ?? null,
                'error' => $result['error'] ?? null,
                'completed_at' => $result['completed_at'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Poll Error', [
                'interaction_id' => $interactionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors de la récupération'
            ], 500);
        }
    }

    /**
     * Obtenir des insights contextuels
     */
    public function getContextualInsights(Request $request): JsonResponse
    {
        $request->validate([
            'page' => 'required|string|max:100',
            'context' => 'sometimes|array',
        ]);

        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'error' => 'Non authentifié',
                    'insights' => [],
                ], 401);
            }

            try {
                $this->contextService = new AgentContextService($user);
            } catch (\Exception $serviceException) {
                Log::error('AgentContextService instantiation failed', [
                    'user_id' => $user->id,
                    'error' => $serviceException->getMessage(),
                ]);
                
                return response()->json([
                    'success' => true,
                    'insights' => $this->getDefaultInsights(),
                    'context' => [],
                    'generated_at' => now()->toISOString(),
                    'fallback' => true,
                ]);
            }

            $page = $request->input('page');
            $context = $request->input('context', []);

            // Obtenir le contexte de page
            try {
                $pageContext = $this->contextService->getPageContext($page, $context);
            } catch (\Exception $contextException) {
                Log::warning('Page context retrieval failed', [
                    'user_id' => $user->id,
                    'page' => $page,
                    'error' => $contextException->getMessage(),
                ]);
                $pageContext = [];
            }

            // Générer des insights basés sur le contexte
            $insights = $this->generateContextualInsights($pageContext, $page);

            return response()->json([
                'success' => true,
                'insights' => $insights,
                'context' => $pageContext,
                'generated_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Contextual Insights Error', [
                'user_id' => Auth::id(),
                'page' => $request->input('page'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => true,
                'insights' => $this->getDefaultInsights(),
                'context' => [],
                'generated_at' => now()->toISOString(),
                'fallback' => true,
            ], 200);
        }
    }

    /**
     * Obtenir des recommandations par domaine
     */
    public function getDomainRecommendations(Request $request): JsonResponse
    {
        $request->validate([
            'domain' => 'required|string|in:business,technical,analytics,personalization,support,general',
            'context' => 'sometimes|array',
        ]);

        try {
            $user = Auth::user();
            $this->contextService = new AgentContextService($user);
            $this->universalAgentService = new UniversalAgentService($user);

            $domain = $request->input('domain');
            $context = $request->input('context', []);

            // Obtenir le contexte global
            $globalContext = $this->contextService->getGlobalContext();

            // Générer des recommandations spécialisées
            $recommendations = $this->generateDomainRecommendations($domain, $globalContext, $context);

            return response()->json([
                'success' => true,
                'domain' => $domain,
                'recommendations' => $recommendations,
                'context_used' => array_keys($globalContext),
                'generated_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Domain Recommendations Error', [
                'user_id' => Auth::id(),
                'domain' => $request->input('domain'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de générer les recommandations',
                'recommendations' => [],
            ]);
        }
    }

    /**
     * Obtenir le contexte global de l'utilisateur
     */
    public function getGlobalContext(): JsonResponse
    {
        try {
            $user = Auth::user();
            $this->contextService = new AgentContextService($user);

            $context = $this->contextService->getGlobalContext();

            return response()->json([
                'success' => true,
                'context' => $context,
                'retrieved_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Global Context Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de récupérer le contexte',
                'context' => [],
            ]);
        }
    }

    /**
     * Mettre à jour le contexte utilisateur
     */
    public function updateContext(Request $request): JsonResponse
    {
        $request->validate([
            'section' => 'required|string|max:100',
            'data' => 'required|array',
        ]);

        try {
            $user = Auth::user();
            $this->contextService = new AgentContextService($user);

            $section = $request->input('section');
            $data = $request->input('data');

            $this->contextService->updateContext($section, $data);

            return response()->json([
                'success' => true,
                'message' => 'Contexte mis à jour avec succès',
                'section' => $section,
                'updated_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Context Update Error', [
                'user_id' => Auth::id(),
                'section' => $request->input('section'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de mettre à jour le contexte',
            ]);
        }
    }

    /**
     * Analyser l'activité utilisateur pour l'agent
     */
    public function analyzeUserActivity(Request $request): JsonResponse
    {
        $request->validate([
            'activity_data' => 'required|array',
            'timeframe' => 'sometimes|string|in:hour,day,week,month',
        ]);

        try {
            $user = Auth::user();
            $agent = $user->intelligentAgent;

            if (!$agent) {
                return response()->json([
                    'success' => false,
                    'error' => 'Aucun agent configuré',
                ]);
            }

            $activityData = $request->input('activity_data');
            $timeframe = $request->input('timeframe', 'day');

            // Analyser l'activité et générer des insights
            $analysis = $this->analyzeActivity($activityData, $timeframe);

            // Enregistrer pour l'apprentissage
            $agent->learningData()->create([
                'data_type' => 'activity_analysis',
                'data' => json_encode([
                    'analysis' => $analysis,
                    'timeframe' => $timeframe,
                    'analyzed_at' => now(),
                ]),
            ]);

            return response()->json([
                'success' => true,
                'analysis' => $analysis,
                'timeframe' => $timeframe,
                'analyzed_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('User Activity Analysis Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible d\'analyser l\'activité',
                'analysis' => [],
            ]);
        }
    }

    /**
     * Obtenir le statut de l'agent intelligent
     */
    public function status(): JsonResponse
    {
        try {
            $user = Auth::user();
            $agent = $user->intelligentAgent;

            if (!$agent) {
                // Créer un agent par défaut pour l'utilisateur
                $agent = $user->intelligentAgent()->create([
                    'name' => 'Assistant PixelRise',
                    'tier' => 'FREE',
                    'is_active' => true,
                    'capabilities' => [
                        'business' => true,
                        'technical' => true,
                        'analytics' => true,
                        'personalization' => false, // Désactivé en FREE
                        'support' => true,
                    ],
                    'settings' => [
                        'communication_tone' => 'friendly',
                        'confidence_threshold' => 0.7,
                        'auto_learning_enabled' => true,
                        'proactive_suggestions' => true,
                        'language' => 'fr',
                        'timezone' => 'Europe/Paris',
                    ],
                    'last_interaction_at' => now(),
                ]);

                Log::info('Agent créé automatiquement', [
                    'user_id' => $user->id,
                    'agent_id' => $agent->id,
                ]);
            }

            return response()->json([
                'success' => true,
                'status' => 'active',
                'agent_id' => $agent->id,
                'name' => $agent->name,
                'tier' => $agent->tier,
                'capabilities' => $agent->capabilities,
                'is_active' => $agent->is_active,
                'last_interaction' => $agent->last_interaction_at?->toISOString(),
                'created_at' => $agent->created_at->toISOString(),
                'stats' => [
                    'total_interactions' => $agent->interactions()->count(),
                    'learning_data_points' => $agent->learningData()->count(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Agent Status Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'status' => 'error',
                'error' => 'Impossible de récupérer le statut',
            ], 500);
        }
    }

    /**
     * Obtenir les capacités disponibles de l'agent
     */
    public function getAgentCapabilities(): JsonResponse
    {
        try {
            $user = Auth::user();
            $agent = $user->intelligentAgent;

            if (!$agent) {
                return response()->json([
                    'success' => false,
                    'error' => 'Aucun agent configuré',
                    'capabilities' => [],
                ]);
            }

            $capabilities = $agent->capabilities;
            $tier = $agent->tier;

            // Enrichir avec les détails des domaines
            $domainDetails = [
                'business' => [
                    'label' => 'Conseils Business',
                    'description' => 'Stratégie, marketing, finance et business plan',
                    'icon' => 'trending-up',
                    'available' => $capabilities['business'] ?? false,
                ],
                'technical' => [
                    'label' => 'Support Technique',
                    'description' => 'Aide sur l\'utilisation de l\'application',
                    'icon' => 'settings',
                    'available' => $capabilities['technical'] ?? false,
                ],
                'analytics' => [
                    'label' => 'Analyse de Données',
                    'description' => 'Métriques, tendances et insights',
                    'icon' => 'bar-chart',
                    'available' => $capabilities['analytics'] ?? false,
                ],
                'personalization' => [
                    'label' => 'Personnalisation',
                    'description' => 'Recommandations adaptées à votre profil',
                    'icon' => 'star',
                    'available' => $capabilities['personalization'] ?? false,
                ],
                'support' => [
                    'label' => 'Support Client',
                    'description' => 'Résolution de problèmes et assistance',
                    'icon' => 'help-circle',
                    'available' => $capabilities['support'] ?? false,
                ],
            ];

            return response()->json([
                'success' => true,
                'tier' => $tier,
                'capabilities' => $capabilities,
                'domain_details' => $domainDetails,
                'total_domains' => count(array_filter($capabilities)),
                'retrieved_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Agent Capabilities Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de récupérer les capacités',
                'capabilities' => [],
            ]);
        }
    }

    /**
     * Générer des insights contextuels
     */
    protected function generateContextualInsights(array $pageContext, string $page): array
    {
        $insights = [];

        // Insights basés sur la page
        switch ($page) {
            case 'dashboard':
                $insights = $this->generateDashboardInsights($pageContext);
                break;
            case 'business-plan':
                $insights = $this->generateBusinessPlanInsights($pageContext);
                break;
            case 'projects':
                $insights = $this->generateProjectsInsights($pageContext);
                break;
            case 'analytics':
                $insights = $this->generateAnalyticsInsights($pageContext);
                break;
            default:
                $insights = $this->generateGeneralInsights($pageContext);
        }

        return array_slice($insights, 0, 5); // Limiter à 5 insights max
    }

    /**
     * Générer des recommandations par domaine
     */
    protected function generateDomainRecommendations(string $domain, array $globalContext, array $context): array
    {
        $recommendations = [];

        switch ($domain) {
            case 'business':
                $recommendations = $this->generateBusinessRecommendations($globalContext, $context);
                break;
            case 'technical':
                $recommendations = $this->generateTechnicalRecommendations($globalContext, $context);
                break;
            case 'analytics':
                $recommendations = $this->generateAnalyticsRecommendations($globalContext, $context);
                break;
            case 'personalization':
                $recommendations = $this->generatePersonalizationRecommendations($globalContext, $context);
                break;
            case 'support':
                $recommendations = $this->generateSupportRecommendations($globalContext, $context);
                break;
        }

        return array_slice($recommendations, 0, 10); // Limiter à 10 recommandations max
    }

    // Méthodes placeholder pour la génération d'insights et recommandations
    protected function generateDashboardInsights(array $context): array
    {
        return [
            [
                'id' => 'dashboard_' . uniqid(),
                'type' => 'recommendation',
                'title' => 'Optimisez votre tableau de bord',
                'description' => 'Basé sur votre utilisation, je recommande de réorganiser vos widgets pour un meilleur workflow.',
                'confidence' => 0.85,
                'priority' => 'medium',
                'category' => 'UX',
                'actionable' => true,
                'timestamp' => now()->toISOString(),
            ]
        ];
    }

    protected function generateBusinessPlanInsights(array $context): array { return []; }
    protected function generateProjectsInsights(array $context): array { return []; }
    protected function generateAnalyticsInsights(array $context): array { return []; }
    protected function generateGeneralInsights(array $context): array { return []; }
    protected function generateBusinessRecommendations(array $globalContext, array $context): array { return []; }
    protected function generateTechnicalRecommendations(array $globalContext, array $context): array { return []; }
    protected function generateAnalyticsRecommendations(array $globalContext, array $context): array { return []; }
    protected function generatePersonalizationRecommendations(array $globalContext, array $context): array { return []; }
    protected function generateSupportRecommendations(array $globalContext, array $context): array { return []; }

    protected function analyzeActivity(array $activityData, string $timeframe): array
    {
        return [
            'total_actions' => count($activityData),
            'timeframe' => $timeframe,
            'patterns' => [],
            'recommendations' => [],
        ];
    }

    /**
     * Obtenir des insights par défaut en cas d'erreur
     */
    protected function getDefaultInsights(): array
    {
        return [
            [
                'id' => 'default_' . uniqid(),
                'type' => 'welcome',
                'title' => 'Bienvenue sur PixelRise',
                'description' => 'Explorez les fonctionnalités disponibles pour développer votre projet.',
                'confidence' => 1.0,
                'priority' => 'high',
                'category' => 'General',
                'actionable' => false,
                'timestamp' => now()->toISOString(),
            ],
            [
                'id' => 'features_' . uniqid(),
                'type' => 'tip',
                'title' => 'Fonctionnalités disponibles',
                'description' => 'Consultez vos sprints, projets et outils de création de contenu.',
                'confidence' => 1.0,
                'priority' => 'medium',
                'category' => 'Navigation',
                'actionable' => true,
                'timestamp' => now()->toISOString(),
            ]
        ];
    }

    /**
     * Réponse par défaut pour les interactions
     */
    protected function getDefaultInteractionResponse(): array
    {
        return [
            'success' => true,
            'agent_id' => 'fallback',
            'response_type' => 'text',
            'content' => 'Bonjour ! Je suis votre assistant PixelRise. Comment puis-je vous aider aujourd\'hui ?',
            'confidence' => 0.8,
            'domain' => 'general',
            'suggestions' => [
                'Aidez-moi avec mes projets',
                'Conseils pour mon business plan', 
                'Créer du contenu pour mon blog',
                'Organiser mes tâches'
            ],
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Réponse de fallback basée sur le message
     */
    protected function getFallbackInteractionResponse(string $message, array $context): array
    {
        $responses = [
            'projet' => 'Je vois que vous voulez parler de projet. Consultez la section Projets pour gérer vos initiatives.',
            'sprint' => 'Pour les sprints et tâches, rendez-vous dans la section Sprint Planning.',
            'blog' => 'Pour créer du contenu blog, utilisez notre outil de création de contenu.',
            'business' => 'Pour votre business plan, consultez notre module Business Plan.',
        ];

        $lowerMessage = strtolower($message);
        $content = 'Merci pour votre message. Je suis temporairement en mode simplifié.';
        
        foreach ($responses as $keyword => $response) {
            if (strpos($lowerMessage, $keyword) !== false) {
                $content = $response;
                break;
            }
        }

        return [
            'success' => true,
            'agent_id' => 'fallback',
            'response_type' => 'text',
            'content' => $content,
            'confidence' => 0.6,
            'domain' => 'general',
            'suggestions' => [
                'Voir mes projets',
                'Consulter mes sprints',
                'Créer du contenu'
            ],
            'fallback_mode' => true,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * ✅ Réponse intelligente mais simple (sans boucles)
     */
    protected function getSmartInteractionResponse(string $message, array $context, $user): array
    {
        $lowerMessage = strtolower($message);
        
        // Détection d'intention simple
        $responses = [
            'bonjour' => "Bonjour {$user->name} ! Je suis votre assistant PixelRise. Comment puis-je vous aider avec vos projets aujourd'hui ?",
            'salut' => "Salut {$user->name} ! Que voulez-vous accomplir aujourd'hui ?",
            'aide' => "Je peux vous aider avec vos sprints, projets, création de contenu et business plan. Que voulez-vous faire ?",
            'sprint' => "Pour vos sprints, vous pouvez voir vos tâches de la semaine, les organiser et suivre votre progression.",
            'projet' => "Dans la section Projets, vous pouvez créer et gérer vos différentes initiatives business.",
            'blog' => "Utilisez notre outil de création de contenu pour générer des articles de blog engageants.",
            'business plan' => "Le module Business Plan vous aide à structurer votre stratégie d'entreprise.",
            'comment' => "Je vous guide dans l'utilisation de PixelRise. Explorez les sections Sprint, Projets et Création de contenu.",
            'utiliser' => "PixelRise vous aide à organiser vos projets, planifier vos sprints et créer du contenu. Quelle fonctionnalité vous intéresse ?",
            'fonctionnalité' => "Les principales fonctionnalités sont : Sprint Planning, Gestion de Projets, Création de Contenu, et Business Plan."
        ];

        $content = "Je suis votre assistant PixelRise. Explorez vos sprints, projets et outils de création de contenu pour développer votre activité.";
        $suggestions = [
            'Voir mes sprints',
            'Gérer mes projets',
            'Créer du contenu',
            'Développer mon business plan'
        ];

        // Recherche de mots-clés
        foreach ($responses as $keyword => $response) {
            if (strpos($lowerMessage, $keyword) !== false) {
                $content = $response;
                break;
            }
        }

        return [
            'success' => true,
            'agent_id' => 'smart_simple',
            'response_type' => 'text',
            'content' => $content,
            'confidence' => 0.9,
            'domain' => 'general',
            'suggestions' => $suggestions,
            'user_message' => $message,
            'simple_mode' => true,
            'timestamp' => now()->toISOString(),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  🤖  ALERTES PROACTIVES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne les alertes proactives générées par ProactiveAgentScanCommand.
     * Le frontend les consomme au chargement et toutes les 5 minutes.
     */
    public function getProactiveAlerts(): JsonResponse
    {
        try {
            $user   = Auth::user();
            $alerts = Cache::get("agent_proactive_alerts_{$user->id}", []);

            return response()->json([
                'success' => true,
                'alerts'  => $alerts,
                'count'   => count($alerts),
                'scanned_at' => Cache::has("agent_proactive_alerts_{$user->id}")
                    ? now()->toISOString()
                    : null,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'alerts' => [], 'error' => $e->getMessage()]);
        }
    }

    /**
     * Exécute une action suggérée par l'agent (confirmer/annuler/check-in/check-out).
     * Délègue au BookingReservationController via le service.
     */
    public function executeAction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action'         => 'required|in:confirm,cancel,checkin,checkout',
            'reservation_id' => 'required|integer',
        ]);

        try {
            $user = Auth::user();

            $reservation = \App\Models\BookingReservation::findOrFail($data['reservation_id']);

            // Vérifie que la résa appartient à un site de l'utilisateur
            $workspaceIds = \App\Models\Workspace::where('owner_user_id', $user->id)->pluck('id');
            $siteIds = \App\Models\UserSite::whereIn('workspace_id', $workspaceIds)->pluck('id');
            if (!$siteIds->contains($reservation->site_id)) {
                return response()->json(['success' => false, 'message' => 'Non autorisé'], 403);
            }

            $statusMap = [
                'confirm'  => 'confirmed',
                'cancel'   => 'cancelled',
                'checkin'  => 'checked_in',
                'checkout' => 'checked_out',
            ];
            $labelMap = [
                'confirm'  => 'Confirmé par l\'assistant',
                'cancel'   => 'Annulé par l\'assistant',
                'checkin'  => 'Check-in effectué via assistant',
                'checkout' => 'Check-out effectué via assistant',
            ];

            $newStatus = $statusMap[$data['action']];
            $label     = $labelMap[$data['action']];

            $reservation->addHistory($label, $user->name ?? 'assistant');
            $reservation->status = $newStatus;
            $reservation->save();

            // Invalide le cache du contexte agent pour cet utilisateur
            Cache::forget("agent_context_{$user->id}");
            Cache::forget("agent_proactive_alerts_{$user->id}");

            Log::info("[AgentAction] {$label} — résa #{$reservation->id} par user #{$user->id}");

            return response()->json([
                'success' => true,
                'message' => $label,
                'reservation_id' => $reservation->id,
                'new_status' => $newStatus,
            ]);
        } catch (\Exception $e) {
            Log::error('[AgentAction] Error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}