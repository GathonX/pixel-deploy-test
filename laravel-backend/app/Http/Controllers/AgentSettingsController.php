<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\UserAgentPreferences;
use App\Models\IntelligentAgent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class AgentSettingsController extends Controller
{
    protected $user;

    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            $this->user = Auth::user();
            return $next($request);
        });
    }

    /**
     * Obtenir les paramètres actuels de l'agent
     */
    public function getSettings(): JsonResponse
    {
        try {
            $preferences = UserAgentPreferences::where('user_id', $this->user->id)->first();

            if (!$preferences) {
                // Créer des préférences par défaut
                $preferences = UserAgentPreferences::create(
                    UserAgentPreferences::getDefaultPreferences($this->user->id)
                );
            }

            // Obtenir l'agent associé
            $agent = $this->user->intelligentAgent;
            if (!$agent) {
                $agent = $this->createDefaultAgent();
            }

            return response()->json([
                'success' => true,
                'settings' => $preferences->toFrontendArray(),
                'agent' => [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'tier' => $agent->tier,
                    'capabilities' => $agent->capabilities,
                    'settings' => $agent->settings,
                ],
                'retrieved_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Get Agent Settings Error', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de récupérer les paramètres',
                'settings' => null,
            ], 500);
        }
    }

    /**
     * Mettre à jour les paramètres de l'agent
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validator = validator($request->all(), [
            // Personnalité
            'name' => 'sometimes|string|max:100',
            'communication_tone' => [
                'sometimes',
                Rule::in(['formal', 'casual', 'professional', 'friendly'])
            ],
            'preferred_language' => 'sometimes|string|in:fr,en',

            // Comportement
            'proactive_suggestions' => 'sometimes|boolean',
            'auto_learning' => 'sometimes|boolean',
            'confidence_threshold' => 'sometimes|numeric|between:0,1',
            'preferred_domains' => 'sometimes|array',
            'preferred_domains.*' => 'string|in:business,technical,analytics,personalization,support',

            // Notifications
            'email_notifications' => 'sometimes|boolean',
            'push_notifications' => 'sometimes|boolean',
            'sms_notifications' => 'sometimes|boolean',
            'quiet_hours_start' => 'sometimes|integer|between:0,23',
            'quiet_hours_end' => 'sometimes|integer|between:0,23',
            'weekends_enabled' => 'sometimes|boolean',

            // Avancé
            'response_length' => [
                'sometimes',
                Rule::in(['concise', 'detailed', 'adaptive'])
            ],
            'custom_instructions' => 'sometimes|string|max:1000',
            'max_suggestions_per_day' => 'sometimes|integer|between:0,50',
            'business_focus_areas' => 'sometimes|array',
            'business_focus_areas.*' => 'string|in:marketing,finance,operations,strategy,sales,hr,technology,legal,product,customer_service',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Données invalides',
                'details' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $request->validated();

            // Séparer les paramètres agent et préférences utilisateur
            $agentData = [];
            $preferencesData = [];

            // Traiter les données selon leur destination
            if (isset($data['name'])) {
                $agentData['name'] = $data['name'];
            }

            if (isset($data['communication_tone'])) {
                $agentData['settings'] = array_merge(
                    $this->user->intelligentAgent->settings ?? [],
                    ['communication_tone' => $data['communication_tone']]
                );
                $preferencesData['preferred_communication_style'] = $data['communication_tone'];
            }

            if (isset($data['preferred_language'])) {
                $preferencesData['preferred_language'] = $data['preferred_language'];
            }

            if (isset($data['proactive_suggestions'])) {
                $preferencesData['allow_proactive_suggestions'] = $data['proactive_suggestions'];
            }

            if (isset($data['auto_learning'])) {
                $preferencesData['allow_learning_from_interactions'] = $data['auto_learning'];
            }

            if (isset($data['confidence_threshold'])) {
                $agentData['settings'] = array_merge(
                    $this->user->intelligentAgent->settings ?? [],
                    ['confidence_threshold' => $data['confidence_threshold']]
                );
            }

            if (isset($data['email_notifications'])) {
                $preferencesData['email_notifications'] = $data['email_notifications'];
            }

            if (isset($data['push_notifications'])) {
                $preferencesData['push_notifications'] = $data['push_notifications'];
            }

            if (isset($data['sms_notifications'])) {
                $preferencesData['sms_notifications'] = $data['sms_notifications'];
            }

            // Traitement des heures de silence
            $notificationSchedule = [];
            if (isset($data['quiet_hours_start']) || isset($data['quiet_hours_end']) || isset($data['weekends_enabled'])) {
                $currentSchedule = UserAgentPreferences::where('user_id', $this->user->id)
                    ->first()?->notification_schedule ?? [];

                $notificationSchedule = array_merge($currentSchedule, [
                    'start_hour' => $data['quiet_hours_start'] ?? $currentSchedule['start_hour'] ?? 9,
                    'end_hour' => $data['quiet_hours_end'] ?? $currentSchedule['end_hour'] ?? 18,
                    'weekends' => $data['weekends_enabled'] ?? $currentSchedule['weekends'] ?? false,
                    'timezone' => 'Europe/Paris',
                ]);
                $preferencesData['notification_schedule'] = $notificationSchedule;
            }

            if (isset($data['response_length'])) {
                $preferencesData['response_length'] = $data['response_length'];
            }

            if (isset($data['custom_instructions'])) {
                $agentData['settings'] = array_merge(
                    $this->user->intelligentAgent->settings ?? [],
                    ['custom_instructions' => $data['custom_instructions']]
                );
            }

            if (isset($data['max_suggestions_per_day'])) {
                $preferencesData['max_suggestions_per_day'] = $data['max_suggestions_per_day'];
            }

            if (isset($data['business_focus_areas'])) {
                $preferencesData['business_focus_areas'] = $data['business_focus_areas'];
            }

            // Mettre à jour l'agent
            if (!empty($agentData)) {
                $agent = $this->user->intelligentAgent;
                if (!$agent) {
                    $agent = $this->createDefaultAgent();
                }
                $agent->update($agentData);
            }

            // Mettre à jour les préférences
            if (!empty($preferencesData)) {
                UserAgentPreferences::updatePreferences($this->user->id, $preferencesData);
            }

            // Recharger les données mises à jour
            $updatedPreferences = UserAgentPreferences::where('user_id', $this->user->id)->first();
            $updatedAgent = $this->user->intelligentAgent()->fresh();

            Log::info('Agent Settings Updated', [
                'user_id' => $this->user->id,
                'updated_fields' => array_keys(array_merge($agentData, $preferencesData)),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Paramètres mis à jour avec succès',
                'settings' => $updatedPreferences->toFrontendArray(),
                'agent' => [
                    'id' => $updatedAgent->id,
                    'name' => $updatedAgent->name,
                    'tier' => $updatedAgent->tier,
                    'capabilities' => $updatedAgent->capabilities,
                    'settings' => $updatedAgent->settings,
                ],
                'updated_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Update Agent Settings Error', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de mettre à jour les paramètres',
            ], 500);
        }
    }

    /**
     * Réinitialiser les paramètres aux valeurs par défaut
     */
    public function resetSettings(): JsonResponse
    {
        try {
            // Sauvegarder les paramètres actuels dans l'historique
            $currentPreferences = UserAgentPreferences::where('user_id', $this->user->id)->first();

            if ($currentPreferences) {
                $currentPreferences->delete();
            }

            // Créer de nouvelles préférences par défaut
            $defaultPreferences = UserAgentPreferences::create(
                UserAgentPreferences::getDefaultPreferences($this->user->id)
            );

            // Réinitialiser l'agent
            $agent = $this->user->intelligentAgent;
            if ($agent) {
                $agent->update([
                    'name' => 'Assistant PixelRise',
                    'settings' => [
                        'communication_tone' => 'friendly',
                        'confidence_threshold' => 0.7,
                        'auto_learning_enabled' => true,
                        'proactive_suggestions' => false,
                        'language' => 'fr',
                        'timezone' => 'Europe/Paris',
                    ],
                ]);
            } else {
                $agent = $this->createDefaultAgent();
            }

            Log::info('Agent Settings Reset', [
                'user_id' => $this->user->id,
                'timestamp' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Paramètres réinitialisés aux valeurs par défaut',
                'settings' => $defaultPreferences->toFrontendArray(),
                'agent' => [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'tier' => $agent->tier,
                    'capabilities' => $agent->capabilities,
                    'settings' => $agent->settings,
                ],
                'reset_at' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Reset Agent Settings Error', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de réinitialiser les paramètres',
            ], 500);
        }
    }

    /**
     * Exporter les paramètres actuels
     */
    public function exportSettings(): JsonResponse
    {
        try {
            $preferences = UserAgentPreferences::where('user_id', $this->user->id)->first();
            $agent = $this->user->intelligentAgent;

            if (!$preferences || !$agent) {
                return response()->json([
                    'success' => false,
                    'error' => 'Aucun paramètre à exporter',
                ], 404);
            }

            $exportData = [
                'user_id' => $this->user->id,
                'export_version' => '1.0',
                'exported_at' => now()->toISOString(),
                'preferences' => $preferences->toArray(),
                'agent' => $agent->toArray(),
            ];

            return response()->json([
                'success' => true,
                'export_data' => $exportData,
                'filename' => 'agent-settings-' . $this->user->id . '-' . now()->format('Y-m-d-H-i-s') . '.json',
            ]);

        } catch (\Exception $e) {
            Log::error('Export Agent Settings Error', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible d\'exporter les paramètres',
            ], 500);
        }
    }

    /**
     * Obtenir l'historique des modifications
     */
    public function getSettingsHistory(): JsonResponse
    {
        try {
            $preferences = UserAgentPreferences::where('user_id', $this->user->id)->first();

            if (!$preferences) {
                return response()->json([
                    'success' => true,
                    'history' => [],
                    'message' => 'Aucun historique disponible',
                ]);
            }

            $history = [
                [
                    'id' => 'current',
                    'timestamp' => $preferences->preferences_last_updated?->toISOString(),
                    'action' => 'current_settings',
                    'description' => 'Paramètres actuels',
                    'data' => $preferences->toFrontendArray(),
                ]
            ];

            if ($preferences->previous_preferences) {
                $history[] = [
                    'id' => 'previous',
                    'timestamp' => $preferences->created_at?->toISOString(),
                    'action' => 'previous_settings',
                    'description' => 'Paramètres précédents (sauvegarde)',
                    'data' => $preferences->previous_preferences,
                ];
            }

            return response()->json([
                'success' => true,
                'history' => $history,
                'total_entries' => count($history),
            ]);

        } catch (\Exception $e) {
            Log::error('Get Settings History Error', [
                'user_id' => $this->user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Impossible de récupérer l\'historique',
                'history' => [],
            ], 500);
        }
    }

    /**
     * Créer un agent par défaut pour l'utilisateur
     */
    protected function createDefaultAgent(): IntelligentAgent
    {
        return $this->user->intelligentAgent()->create([
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
                'proactive_suggestions' => false,
                'language' => 'fr',
                'timezone' => 'Europe/Paris',
            ],
            'last_interaction_at' => now(),
        ]);
    }
}