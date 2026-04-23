<?php

namespace App\Listeners\Agent;

use App\Models\User;
use App\Models\IntelligentAgent;
use App\Services\AgentIntelligent\AgentContextService;
use App\Services\AgentIntelligent\UserBehaviorAnalyzer;
use App\Services\AgentIntelligent\UniversalEventBus;
use Illuminate\Support\Facades\Log;

class UserActionListener
{
    protected UniversalEventBus $eventBus;

    public function __construct()
    {
        $this->eventBus = app(UniversalEventBus::class);
    }

    /**
     * Gérer les actions utilisateur
     */
    public function handle(array $eventData): void
    {
        try {
            $userId = $eventData['user_id'] ?? null;
            $action = $eventData['action'] ?? 'unknown';

            if (!$userId) return;

            $user = User::find($userId);
            if (!$user || !$user->intelligentAgent) return;

            // Analyser l'action dans son contexte
            $this->analyzeUserAction($user, $action, $eventData);

            // Déclencher des réactions contextuelles
            $this->triggerContextualReactions($user, $action, $eventData);

            // Apprentissage comportemental
            $this->updateBehavioralLearning($user, $action, $eventData);

        } catch (\Exception $e) {
            Log::error('Erreur UserActionListener', [
                'error' => $e->getMessage(),
                'event_data' => $eventData,
            ]);
        }
    }

    /**
     * Analyser l'action utilisateur
     */
    protected function analyzeUserAction(User $user, string $action, array $eventData): void
    {
        $contextService = new AgentContextService($user);
        $currentContext = $contextService->getGlobalContext();

        $analysis = [
            'action_type' => $this->categorizeAction($action),
            'context_match' => $this->matchActionToContext($action, $currentContext),
            'user_intent' => $this->predictUserIntent($action, $eventData, $currentContext),
            'expected_next_actions' => $this->predictNextActions($action, $currentContext),
            'anomaly_score' => $this->calculateAnomalyScore($action, $user, $currentContext),
        ];

        // Stocker l'analyse pour l'apprentissage
        $user->intelligentAgent->learningData()->create([
            'data_type' => 'user_action_analysis',
            'data' => json_encode([
                'action' => $action,
                'analysis' => $analysis,
                'timestamp' => now(),
            ]),
        ]);

        Log::info('Action utilisateur analysée', [
            'user_id' => $user->id,
            'action' => $action,
            'intent' => $analysis['user_intent'],
        ]);
    }

    /**
     * Déclencher des réactions contextuelles
     */
    protected function triggerContextualReactions(User $user, string $action, array $eventData): void
    {
        $reactions = $this->determineReactions($action, $eventData, $user);

        foreach ($reactions as $reaction) {
            $this->eventBus->emit($reaction['event'], [
                'user_id' => $user->id,
                'trigger_action' => $action,
                'reaction_type' => $reaction['type'],
                'reaction_data' => $reaction['data'],
                'priority' => $reaction['priority'] ?? 'medium',
            ]);
        }
    }

    /**
     * Mettre à jour l'apprentissage comportemental
     */
    protected function updateBehavioralLearning(User $user, string $action, array $eventData): void
    {
        $behaviorAnalyzer = new UserBehaviorAnalyzer($user);

        // Enregistrer le pattern d'action
        $pattern = [
            'action' => $action,
            'context' => $eventData['page_context'] ?? [],
            'timestamp' => now(),
            'session_id' => $eventData['session_id'] ?? null,
            'sequence_position' => $this->calculateSequencePosition($user, $action),
        ];

        $user->intelligentAgent->learningData()->create([
            'data_type' => 'behavior_pattern',
            'data' => json_encode($pattern),
        ]);
    }

    /**
     * Catégoriser une action
     */
    protected function categorizeAction(string $action): string
    {
        $navigationActions = ['page_view', 'menu_click', 'link_click', 'back_button'];
        $creationActions = ['project_create', 'file_upload', 'form_submit', 'save_action'];
        $analysisActions = ['report_view', 'chart_interaction', 'filter_apply', 'export_data'];
        $communicationActions = ['chat_message', 'comment_add', 'share_action', 'feedback_submit'];

        if (in_array($action, $navigationActions)) return 'navigation';
        if (in_array($action, $creationActions)) return 'creation';
        if (in_array($action, $analysisActions)) return 'analysis';
        if (in_array($action, $communicationActions)) return 'communication';

        return 'other';
    }

    /**
     * Correspondre l'action au contexte
     */
    protected function matchActionToContext(string $action, array $context): float
    {
        $currentPage = $context['page_context']['section'] ?? 'unknown';

        // Matrice de correspondance action-contexte (simplifié)
        $matches = [
            'dashboard' => ['page_view' => 0.9, 'widget_click' => 0.95, 'refresh' => 0.8],
            'projects' => ['project_create' => 0.95, 'project_edit' => 0.9, 'project_view' => 0.85],
            'business_plan' => ['plan_edit' => 0.95, 'section_view' => 0.8, 'export' => 0.7],
            'analytics' => ['chart_view' => 0.9, 'filter_apply' => 0.85, 'export_data' => 0.8],
        ];

        return $matches[$currentPage][$action] ?? 0.5;
    }

    /**
     * Prédire l'intention utilisateur
     */
    protected function predictUserIntent(string $action, array $eventData, array $context): string
    {
        // Algorithme de prédiction d'intention simplifié
        $pageContext = $context['page_context']['section'] ?? 'unknown';

        $intentMap = [
            'dashboard' => [
                'page_view' => 'overview',
                'widget_click' => 'drill_down',
                'refresh' => 'update_check',
            ],
            'projects' => [
                'project_create' => 'new_project',
                'project_edit' => 'update_project',
                'project_view' => 'review_progress',
            ],
            'business_plan' => [
                'plan_edit' => 'improve_plan',
                'section_view' => 'understand_section',
                'export' => 'share_plan',
            ],
        ];

        return $intentMap[$pageContext][$action] ?? 'explore';
    }

    /**
     * Prédire les prochaines actions
     */
    protected function predictNextActions(string $action, array $context): array
    {
        // Séquences d'actions communes
        $sequences = [
            'page_view' => ['menu_click', 'feature_use', 'page_exit'],
            'project_create' => ['project_edit', 'section_add', 'save_action'],
            'form_submit' => ['success_view', 'redirect', 'next_step'],
            'error_encounter' => ['retry', 'help_seek', 'page_exit'],
        ];

        return $sequences[$action] ?? [];
    }

    /**
     * Calculer le score d'anomalie
     */
    protected function calculateAnomalyScore(string $action, User $user, array $context): float
    {
        // Obtenir l'historique des actions de l'utilisateur
        $recentActions = $this->getUserRecentActions($user, 50);

        if (empty($recentActions)) return 0.0;

        // Calculer la fréquence de cette action
        $actionFrequency = count(array_filter($recentActions, fn($a) => $a['action'] === $action));
        $totalActions = count($recentActions);

        $frequency = $actionFrequency / $totalActions;

        // Score d'anomalie inversement proportionnel à la fréquence
        return max(0, 1 - ($frequency * 2));
    }

    /**
     * Déterminer les réactions à déclencher
     */
    protected function determineReactions(string $action, array $eventData, User $user): array
    {
        $reactions = [];
        $tier = $user->intelligentAgent->tier;

        // Réactions de base pour tous les tiers
        if ($action === 'error_encounter') {
            $reactions[] = [
                'event' => 'agent.proactive_help',
                'type' => 'assistance',
                'data' => ['error' => $eventData['error'] ?? 'unknown'],
                'priority' => 'high',
            ];
        }

        if ($action === 'feature_first_use') {
            $reactions[] = [
                'event' => 'agent.feature_guidance',
                'type' => 'guidance',
                'data' => ['feature' => $eventData['feature'] ?? 'unknown'],
                'priority' => 'medium',
            ];
        }

        // Réactions premium
        if ($tier !== 'free') {
            if ($action === 'project_create') {
                $reactions[] = [
                    'event' => 'agent.optimization_suggestions',
                    'type' => 'optimization',
                    'data' => ['project_data' => $eventData['project'] ?? []],
                    'priority' => 'medium',
                ];
            }

            if ($action === 'performance_issue') {
                $reactions[] = [
                    'event' => 'agent.performance_optimization',
                    'type' => 'optimization',
                    'data' => ['performance_data' => $eventData['metrics'] ?? []],
                    'priority' => 'high',
                ];
            }
        }

        // Réactions enterprise
        if ($tier === 'enterprise') {
            if ($action === 'business_decision') {
                $reactions[] = [
                    'event' => 'agent.strategic_analysis',
                    'type' => 'analysis',
                    'data' => ['decision_context' => $eventData['context'] ?? []],
                    'priority' => 'high',
                ];
            }
        }

        return $reactions;
    }

    /**
     * Calculer la position dans la séquence
     */
    protected function calculateSequencePosition(User $user, string $action): int
    {
        $sessionId = session()->getId();

        $sessionActions = $user->intelligentAgent
            ->learningData()
            ->where('data_type', 'behavior_pattern')
            ->where('created_at', '>=', now()->subHours(2))
            ->get()
            ->filter(function($data) use ($sessionId) {
                $pattern = json_decode($data->data, true);
                return ($pattern['session_id'] ?? null) === $sessionId;
            });

        return $sessionActions->count() + 1;
    }

    /**
     * Obtenir les actions récentes de l'utilisateur
     */
    protected function getUserRecentActions(User $user, int $limit = 50): array
    {
        return $user->intelligentAgent
            ->learningData()
            ->where('data_type', 'behavior_pattern')
            ->where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function($data) {
                return json_decode($data->data, true);
            })
            ->toArray();
    }
}

// Listeners spécialisés pour des événements spécifiques

class PageViewListener extends UserActionListener
{
    public function handle(array $eventData): void
    {
        $eventData['action'] = 'page_view';
        parent::handle($eventData);

        // Logique spécifique aux vues de page
        $this->trackNavigationPattern($eventData);
        $this->updatePagePreferences($eventData);
    }

    protected function trackNavigationPattern(array $eventData): void
    {
        // Suivre les patterns de navigation
    }

    protected function updatePagePreferences(array $eventData): void
    {
        // Mettre à jour les préférences de page
    }
}

class FeatureUsageListener extends UserActionListener
{
    public function handle(array $eventData): void
    {
        $eventData['action'] = 'feature_used';
        parent::handle($eventData);

        // Logique spécifique à l'utilisation des fonctionnalités
        $this->trackFeatureAdoption($eventData);
        $this->suggestRelatedFeatures($eventData);
    }

    protected function trackFeatureAdoption(array $eventData): void
    {
        // Suivre l'adoption des fonctionnalités
    }

    protected function suggestRelatedFeatures(array $eventData): void
    {
        // Suggérer des fonctionnalités liées
    }
}