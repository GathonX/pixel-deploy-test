<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\OpenAI\OpenAIService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class OpenAIController extends Controller
{
    protected $openAIService;

    public function __construct(OpenAIService $openAIService)
    {
        $this->openAIService = $openAIService;
    }

    /**
     * Generate a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateBusinessPlan(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'business_description' => 'required|string|min:10',
            'project_id' => 'nullable|exists:projects,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }
        $options = $request->only(['industry', 'target_market', 'competition', 'funding_needs']);
        $options = array_filter($options); // Remove null values

        $result = $this->openAIService->generateBusinessPlan(
            $request->input('business_description'),
            $options
        );

        // Si la génération a réussi et qu'un ID de projet est fourni, sauvegarder le plan d'affaires
        if ($result['success'] && $request->has('project_id')) {
            $projectId = $request->input('project_id');

            // Vérifier que le projet appartient à l'utilisateur actuel
            $project = \App\Models\Project::where('id', $projectId)
                ->where('user_id', auth()->id())
                ->first();

            if ($project) {
                $result['saved_to_project'] = false;
            }
        }

        return response()->json($result);
    }

    /**
     * Continue a conversation about a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function continueConversation(Request $request): JsonResponse
    {
        $request->validate([
            'conversation' => 'required|array',
            'message' => 'required|string',
        ]);

        $result = $this->openAIService->continueBusinessPlanConversation(
            $request->input('conversation'),
            $request->input('message')
        );

        return response()->json($result);
    }

    /**
     * Analyze a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function analyzeBusinessPlan(Request $request): JsonResponse
    {
        $request->validate([
            'business_plan' => 'required|string|min:100',
        ]);

        $result = $this->openAIService->analyzeBusinessPlan(
            $request->input('business_plan')
        );

        return response()->json($result);
    }

    /**
     * Generate financial projections
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateFinancialProjections(Request $request): JsonResponse
    {
        $request->validate([
            'business_description' => 'required|string|min:10',
            'initial_investment' => 'nullable|string',
            'monthly_fixed_costs' => 'nullable|string',
            'expected_revenue_year_one' => 'nullable|string',
            'growth_rate' => 'nullable|string',
        ]);

        $initialData = $request->only([
            'initial_investment',
            'monthly_fixed_costs',
            'expected_revenue_year_one',
            'growth_rate'
        ]);
        $initialData = array_filter($initialData); // Remove null values

        $result = $this->openAIService->generateFinancialProjections(
            $request->input('business_description'),
            $initialData
        );

        return response()->json($result);
    }

    /**
     * Generate SWOT analysis from a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateSwotAnalysis(Request $request): JsonResponse
    {
        $request->validate([
            'business_plan' => 'required|string|min:100',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $result = $this->openAIService->generateSwotAnalysis(
            $request->input('business_plan')
        );

        // Si la génération a réussi et qu'un ID de projet est fourni, sauvegarder l'analyse SWOT
        if ($result['success'] && $request->has('project_id')) {
            $projectId = $request->input('project_id');

            // Vérifier que le projet appartient à l'utilisateur actuel
            $project = \App\Models\Project::where('id', $projectId)
                ->where('user_id', auth()->id())
                ->first();

            if ($project) {
                // Supprimer l'ancienne analyse SWOT si elle existe
                \App\Models\SwotAnalysis::where('project_id', $projectId)->delete();

                // Créer une nouvelle analyse SWOT
                \App\Models\SwotAnalysis::create([
                    'project_id' => $projectId,
                    'content' => $result['swot_analysis'],
                    'recommendations' => null, // Pourrait être généré séparément
                ]);

                $result['saved_to_project'] = true;
            }
        }

        return response()->json($result);
    }

    /**
     * Generate Blue Ocean Strategy analysis from a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateBlueOceanStrategy(Request $request): JsonResponse
    {
        $request->validate([
            'business_plan' => 'required|string|min:100',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $result = $this->openAIService->generateBlueOceanStrategy(
            $request->input('business_plan')
        );

        // Si la génération a réussi et qu'un ID de projet est fourni, sauvegarder la stratégie Blue Ocean
        if ($result['success'] && $request->has('project_id')) {
            $projectId = $request->input('project_id');

            // Vérifier que le projet appartient à l'utilisateur actuel
            $project = \App\Models\Project::where('id', $projectId)
                ->where('user_id', auth()->id())
                ->first();

            if ($project) {
                // Supprimer l'ancienne stratégie Blue Ocean si elle existe
                \App\Models\BlueOceanStrategy::where('project_id', $projectId)->delete();

                // Créer une nouvelle stratégie Blue Ocean
                \App\Models\BlueOceanStrategy::create([
                    'project_id' => $projectId,
                    'content' => $result['blue_ocean_strategy'],
                    'recommendations' => null, // Pourrait être généré séparément
                ]);

                $result['saved_to_project'] = true;
            }
        }

        return response()->json($result);
    }

    /**
     * Generate Marketing Plan from a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateMarketingPlan(Request $request): JsonResponse
    {
        $request->validate([
            'business_plan' => 'required|string|min:100',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $result = $this->openAIService->generateMarketingPlan(
            $request->input('business_plan')
        );

        // Si la génération a réussi et qu'un ID de projet est fourni, sauvegarder le plan marketing
        if ($result['success'] && $request->has('project_id')) {
            $projectId = $request->input('project_id');

            // Vérifier que le projet appartient à l'utilisateur actuel
            $project = \App\Models\Project::where('id', $projectId)
                ->where('user_id', auth()->id())
                ->first();

            if ($project) {
                // Supprimer l'ancien plan marketing s'il existe
                \App\Models\MarketingPlan::where('project_id', $projectId)->delete();

                // Créer un nouveau plan marketing
                \App\Models\MarketingPlan::create([
                    'project_id' => $projectId,
                    'content' => $result['marketing_plan'],
                    'recommendations' => null, // Pourrait être généré séparément
                ]);

                $result['saved_to_project'] = true;
            }
        }

        return response()->json($result);
    }

    /**
     * Generate Financial Plan from a business plan
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function generateFinancialPlan(Request $request): JsonResponse
    {
        $request->validate([
            'business_plan' => 'required|string|min:100',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $result = $this->openAIService->generateFinancialPlan(
            $request->input('business_plan')
        );

        // Si la génération a réussi et qu'un ID de projet est fourni, sauvegarder le plan financier
        if ($result['success'] && $request->has('project_id')) {
            $projectId = $request->input('project_id');

            // Vérifier que le projet appartient à l'utilisateur actuel
            $project = \App\Models\Project::where('id', $projectId)
                ->where('user_id', auth()->id())
                ->first();

            if ($project) {
                // Supprimer l'ancien plan financier s'il existe
                \App\Models\FinancialPlan::where('project_id', $projectId)->delete();

                // Créer un nouveau plan financier
                \App\Models\FinancialPlan::create([
                    'project_id' => $projectId,
                    'content' => $result['financial_plan'],
                    'recommendations' => null, // Pourrait être généré séparément
                ]);

                $result['saved_to_project'] = true;
            }
        }

        return response()->json($result);
    }

    /**
     * Regenerate all business plan analyses for a project
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function regenerateBusinessAnalysis(Request $request): JsonResponse
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
        ]);

        $projectId = $request->input('project_id');

        // Vérifier que le projet appartient à l'utilisateur actuel
        $project = \App\Models\Project::where('id', $projectId)
            ->where('user_id', auth()->id())
            ->first();

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or access denied'
            ], 404);
        }

        // Récupérer la description du projet
        $businessDescription = $project->description;

        if (empty($businessDescription)) {
            return response()->json([
                'success' => false,
                'message' => 'No business description available for analysis'
            ], 400);
        }

        $results = [
            'success' => true,
            'message' => 'Analysis regeneration started',
            'components' => []
        ];

        // 1. Régénérer l'analyse SWOT
        try {
            $swotResult = $this->openAIService->generateSwotAnalysis($businessDescription);

            if ($swotResult['success']) {
                // Supprimer l'ancienne analyse SWOT
                \App\Models\SwotAnalysis::where('project_id', $projectId)->delete();

                // Créer une nouvelle analyse SWOT
                \App\Models\SwotAnalysis::create([
                    'project_id' => $projectId,
                    'content' => $swotResult['swot_analysis'],
                    'recommendations' => null
                ]);

                $results['components'][] = 'swot_analysis';
            }
        } catch (\Exception $e) {
            \Log::error('Failed to regenerate SWOT analysis: ' . $e->getMessage());
        }

        // 2. Régénérer la stratégie océan bleu
        try {
            $blueOceanResult = $this->openAIService->generateBlueOceanStrategy($businessDescription);

            if ($blueOceanResult['success']) {
                // Supprimer l'ancienne stratégie
                \App\Models\BlueOceanStrategy::where('project_id', $projectId)->delete();

                // Créer une nouvelle stratégie
                \App\Models\BlueOceanStrategy::create([
                    'project_id' => $projectId,
                    'content' => $blueOceanResult['blue_ocean_strategy'],
                    'recommendations' => null
                ]);

                $results['components'][] = 'blue_ocean_strategy';
            }
        } catch (\Exception $e) {
            \Log::error('Failed to regenerate Blue Ocean strategy: ' . $e->getMessage());
        }

        // 3. Régénérer le plan marketing
        try {
            $marketingResult = $this->openAIService->generateMarketingPlan($businessDescription);

            if ($marketingResult['success']) {
                // Supprimer l'ancien plan marketing
                \App\Models\MarketingPlan::where('project_id', $projectId)->delete();

                // Créer un nouveau plan marketing
                \App\Models\MarketingPlan::create([
                    'project_id' => $projectId,
                    'content' => $marketingResult['marketing_plan'],
                    'recommendations' => null
                ]);

                $results['components'][] = 'marketing_plan';
            }
        } catch (\Exception $e) {
            \Log::error('Failed to regenerate Marketing Plan: ' . $e->getMessage());
        }

        // 4. Régénérer le plan financier
        try {
            $financialResult = $this->openAIService->generateFinancialPlan($businessDescription);

            if ($financialResult['success']) {
                // Supprimer l'ancien plan financier
                \App\Models\FinancialPlan::where('project_id', $projectId)->delete();

                // Créer un nouveau plan financier
                \App\Models\FinancialPlan::create([
                    'project_id' => $projectId,
                    'content' => $financialResult['financial_plan'],
                    'recommendations' => null
                ]);

                $results['components'][] = 'financial_plan';
            }
        } catch (\Exception $e) {
            \Log::error('Failed to regenerate Financial Plan: ' . $e->getMessage());
        }

        if (count($results['components']) === 0) {
            $results['success'] = false;
            $results['message'] = 'Failed to regenerate any analysis components';
            return response()->json($results, 500);
        }

        return response()->json($results);
    }


}