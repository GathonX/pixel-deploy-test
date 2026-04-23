<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\UserAgentPreferences;
use App\Models\IntelligentAgent;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TestAgentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Test endpoint pour diagnostiquer les problèmes d'agent
     */
    public function diagnose(): JsonResponse
    {
        try {
            $user = Auth::user();

            $diagnosis = [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'timestamp' => now()->toISOString(),
            ];

            // Vérifier l'agent existant
            $agent = $user->intelligentAgent;
            if ($agent) {
                $diagnosis['agent'] = [
                    'exists' => true,
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'tier' => $agent->tier,
                    'is_active' => $agent->is_active,
                    'created_at' => $agent->created_at->toISOString(),
                    'capabilities' => $agent->capabilities,
                    'settings' => $agent->settings,
                ];
            } else {
                $diagnosis['agent'] = [
                    'exists' => false,
                    'can_create' => true,
                ];
            }

            // Vérifier les préférences
            $preferences = UserAgentPreferences::where('user_id', $user->id)->first();
            if ($preferences) {
                $diagnosis['preferences'] = [
                    'exists' => true,
                    'id' => $preferences->id,
                    'created_at' => $preferences->created_at->toISOString(),
                    'last_updated' => $preferences->preferences_last_updated?->toISOString(),
                    'communication_style' => $preferences->preferred_communication_style,
                    'notifications' => [
                        'email' => $preferences->email_notifications,
                        'push' => $preferences->push_notifications,
                    ],
                ];
            } else {
                $diagnosis['preferences'] = [
                    'exists' => false,
                    'can_create' => true,
                ];
            }

            // Test de création automatique
            if (!$agent) {
                $diagnosis['auto_creation_test'] = 'attempting';
                try {
                    $agent = $user->intelligentAgent()->create([
                        'name' => 'Assistant PixelRise (Test)',
                        'tier' => 'FREE',
                        'is_active' => true,
                        'capabilities' => [
                            'business' => true,
                            'technical' => true,
                            'analytics' => true,
                            'personalization' => false,
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
                    $diagnosis['auto_creation_test'] = 'success';
                    $diagnosis['created_agent_id'] = $agent->id;
                } catch (\Exception $e) {
                    $diagnosis['auto_creation_test'] = 'failed';
                    $diagnosis['creation_error'] = $e->getMessage();
                }
            }

            if (!$preferences) {
                $diagnosis['auto_preferences_test'] = 'attempting';
                try {
                    $preferences = UserAgentPreferences::create(
                        UserAgentPreferences::getDefaultPreferences($user->id)
                    );
                    $diagnosis['auto_preferences_test'] = 'success';
                    $diagnosis['created_preferences_id'] = $preferences->id;
                } catch (\Exception $e) {
                    $diagnosis['auto_preferences_test'] = 'failed';
                    $diagnosis['preferences_error'] = $e->getMessage();
                }
            }

            return response()->json([
                'success' => true,
                'diagnosis' => $diagnosis,
            ]);

        } catch (\Exception $e) {
            Log::error('Agent Diagnosis Error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Erreur lors du diagnostic',
                'debug' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Force la création d'un agent pour l'utilisateur
     */
    public function createAgent(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Supprimer l'agent existant s'il y en a un
            if ($user->intelligentAgent) {
                $user->intelligentAgent->delete();
            }

            // Créer un nouvel agent
            $agent = $user->intelligentAgent()->create([
                'name' => "Assistant de {$user->name}",
                'tier' => 'FREE',
                'is_active' => true,
                'capabilities' => [
                    'business' => true,
                    'technical' => true,
                    'analytics' => true,
                    'personalization' => false,
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

            return response()->json([
                'success' => true,
                'message' => 'Agent créé avec succès',
                'agent' => [
                    'id' => $agent->id,
                    'name' => $agent->name,
                    'tier' => $agent->tier,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Impossible de créer l\'agent',
                'debug' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Force la création de préférences pour l'utilisateur
     */
    public function createPreferences(): JsonResponse
    {
        try {
            $user = Auth::user();

            // Supprimer les préférences existantes
            UserAgentPreferences::where('user_id', $user->id)->delete();

            // Créer de nouvelles préférences
            $preferences = UserAgentPreferences::create(
                UserAgentPreferences::getDefaultPreferences($user->id)
            );

            return response()->json([
                'success' => true,
                'message' => 'Préférences créées avec succès',
                'preferences' => $preferences->toFrontendArray(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Impossible de créer les préférences',
                'debug' => $e->getMessage(),
            ], 500);
        }
    }
}