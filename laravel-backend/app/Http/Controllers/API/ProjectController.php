<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ProjectController extends Controller
{
    /**
     * Display a listing of the projects.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $projects = Project::where('user_id', Auth::id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'projects' => $projects]);
    }

    /**
     * Store a newly created project in storage.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'target_audience' => 'nullable|string',
            'main_objective' => 'nullable|string',
            'obstacles' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $project = Project::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'description' => $request->description,
            'target_audience' => $request->target_audience,
            'main_objective' => $request->main_objective,
            'obstacles' => $request->obstacles,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Projet créé avec succès.',
            'project' => $project
        ], 201);
    }

    /**
     * Display the specified project.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Projet non trouvé.'], 404);
        }

        if ($project->user_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        return response()->json(['success' => true, 'project' => $project]);
    }

    /**
     * Update the specified project in storage.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, int $id): JsonResponse
    {
        Log::info('🔧 ProjectController::update appelé', [
            'project_id' => $id,
            'user_id' => Auth::id(),
            'request_data' => $request->all()
        ]);

        $project = Project::find($id);

        if (!$project) {
            Log::warning('❌ Projet non trouvé', ['project_id' => $id]);
            return response()->json(['success' => false, 'message' => 'Projet non trouvé.'], 404);
        }

        if ($project->user_id !== Auth::id()) {
            Log::warning('❌ Accès refusé pour le projet', [
                'project_id' => $id,
                'project_user_id' => $project->user_id,
                'current_user_id' => Auth::id()
            ]);
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:255',
            'description' => 'string',
            'target_audience' => 'nullable|string',
            'main_objective' => 'nullable|string',
            'obstacles' => 'nullable|string',
            'notes' => 'nullable|string',
            'recommendations' => 'nullable|string',
            'is_active' => 'boolean',

            // Nouveaux champs business plan
            'sector' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'founded_year' => 'nullable|integer|min:1800|max:' . (date('Y') + 10),
            'legal_form' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'employees' => 'nullable|integer|min:0',
            'mission' => 'nullable|string',
            'vision' => 'nullable|string',
            'values' => 'nullable|array',
            'short_term_goals' => 'nullable|array',
            'long_term_goals' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            Log::error('❌ Erreur de validation:', [
                'errors' => $validator->errors(),
                'request_data' => $request->all()
            ]);
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $validatedData = $validator->validated();
            Log::info('✅ Données validées:', $validatedData);

            $project->update($validatedData);

            Log::info('✅ Projet mis à jour avec succès:', [
                'project_id' => $id,
                'updated_fields' => array_keys($validatedData)
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Projet mis à jour avec succès.',
                'project' => $project->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur lors de la mise à jour du projet:', [
                'project_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified project from storage.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Projet non trouvé.'], 404);
        }

        if ($project->user_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Projet supprimé avec succès.'
        ]);
    }
}
