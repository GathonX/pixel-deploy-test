<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\UserSite;
use App\Models\WorkspaceUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SiteTaskController extends Controller
{
    /**
     * Vérifie que l'utilisateur a accès au site et retourne le site.
     * Sécurité : le site doit appartenir à l'utilisateur via forUser().
     */
    private function resolveSite(string $siteId): ?UserSite
    {
        return UserSite::forUser(Auth::id())->find($siteId);
    }

    /**
     * Liste toutes les tâches du site.
     * GET /api/site-builder/sites/{siteId}/tasks
     */
    public function index(string $siteId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $tasks = Task::where('site_id', $siteId)
            ->with(['assignedTo:id,name,email'])
            ->orderBy('order')
            ->orderBy('created_at')
            ->get()
            ->map(fn($t) => $this->formatTask($t));

        return response()->json(['success' => true, 'data' => $tasks]);
    }

    /**
     * Crée une nouvelle tâche pour le site.
     * POST /api/site-builder/sites/{siteId}/tasks
     */
    public function store(Request $request, string $siteId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string|max:5000',
            'priority'       => 'nullable|in:high,medium,normal,low',
            'status'         => 'nullable|in:pending,todo,in-progress,completed',
            'scheduled_date' => 'nullable|date',
            'assigned_to_id' => 'nullable|integer|exists:users,id',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
        ]);

        // Vérifier que assigned_to appartient bien au workspace du site
        if (!empty($validated['assigned_to_id'])) {
            $isMember = WorkspaceUser::where('workspace_id', $site->workspace_id)
                ->where('user_id', $validated['assigned_to_id'])
                ->exists();
            if (!$isMember) {
                return response()->json(['success' => false, 'message' => 'Cet utilisateur n\'est pas membre du workspace'], 422);
            }
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store("tasks/{$siteId}", 'public');
        }

        $maxOrder = Task::where('site_id', $siteId)->max('order') ?? 0;

        $task = Task::create([
            'user_id'        => Auth::id(),
            'site_id'        => $siteId,
            'title'          => $validated['title'],
            'description'    => $validated['description'] ?? null,
            'priority'       => $validated['priority'] ?? 'normal',
            'status'         => $validated['status'] ?? 'pending',
            'scheduled_date' => $validated['scheduled_date'] ?? null,
            'assigned_to_id' => $validated['assigned_to_id'] ?? null,
            'image_path'     => $imagePath,
            'order'          => $maxOrder + 1,
        ]);

        $task->load('assignedTo:id,name,email');

        return response()->json(['success' => true, 'data' => $this->formatTask($task)], 201);
    }

    /**
     * Modifie une tâche du site.
     * PUT /api/site-builder/sites/{siteId}/tasks/{taskId}
     */
    public function update(Request $request, string $siteId, int $taskId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $task = Task::where('site_id', $siteId)->find($taskId);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Tâche non trouvée'], 404);
        }

        $validated = $request->validate([
            'title'          => 'sometimes|required|string|max:255',
            'description'    => 'nullable|string|max:5000',
            'priority'       => 'nullable|in:high,medium,normal,low',
            'status'         => 'nullable|in:pending,todo,in-progress,completed',
            'scheduled_date' => 'nullable|date',
            'assigned_to_id' => 'nullable|integer|exists:users,id',
            'image'          => 'nullable|image|mimes:jpeg,png,jpg,webp|max:3072',
            'remove_image'   => 'nullable|boolean',
        ]);

        // Vérifier que assigned_to appartient au workspace
        if (!empty($validated['assigned_to_id'])) {
            $isMember = WorkspaceUser::where('workspace_id', $site->workspace_id)
                ->where('user_id', $validated['assigned_to_id'])
                ->exists();
            if (!$isMember) {
                return response()->json(['success' => false, 'message' => 'Cet utilisateur n\'est pas membre du workspace'], 422);
            }
        }

        // Gestion de l'image
        if (!empty($validated['remove_image'])) {
            if ($task->image_path) Storage::disk('public')->delete($task->image_path);
            $task->image_path = null;
        } elseif ($request->hasFile('image')) {
            if ($task->image_path) Storage::disk('public')->delete($task->image_path);
            $task->image_path = $request->file('image')->store("tasks/{$siteId}", 'public');
        }

        $task->fill(array_filter([
            'title'          => $validated['title'] ?? null,
            'description'    => $validated['description'] ?? null,
            'priority'       => $validated['priority'] ?? null,
            'status'         => $validated['status'] ?? null,
            'scheduled_date' => $validated['scheduled_date'] ?? null,
            'assigned_to_id' => array_key_exists('assigned_to_id', $validated) ? $validated['assigned_to_id'] : null,
        ], fn($v) => $v !== null));

        // Pour les champs explicitement nullifiables
        if (array_key_exists('description', $validated)) $task->description = $validated['description'];
        if (array_key_exists('scheduled_date', $validated)) $task->scheduled_date = $validated['scheduled_date'];
        if (array_key_exists('assigned_to_id', $validated)) $task->assigned_to_id = $validated['assigned_to_id'];

        $task->save();
        $task->load('assignedTo:id,name,email');

        return response()->json(['success' => true, 'data' => $this->formatTask($task)]);
    }

    /**
     * Supprime une tâche du site.
     * DELETE /api/site-builder/sites/{siteId}/tasks/{taskId}
     */
    public function destroy(string $siteId, int $taskId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $task = Task::where('site_id', $siteId)->find($taskId);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Tâche non trouvée'], 404);
        }

        if ($task->image_path) {
            Storage::disk('public')->delete($task->image_path);
        }

        $task->delete();

        return response()->json(['success' => true, 'message' => 'Tâche supprimée']);
    }

    /**
     * Change uniquement le statut d'une tâche (drag & drop Kanban).
     * PATCH /api/site-builder/sites/{siteId}/tasks/{taskId}/status
     */
    public function updateStatus(Request $request, string $siteId, int $taskId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $task = Task::where('site_id', $siteId)->find($taskId);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Tâche non trouvée'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,todo,in-progress,completed',
        ]);

        $task->status = $validated['status'];
        if ($validated['status'] === 'completed') {
            $task->completed_at = now();
        } else {
            $task->completed_at = null;
        }
        $task->save();

        return response()->json(['success' => true, 'data' => $this->formatTask($task)]);
    }

    /**
     * Liste les membres du workspace du site (pour assignation).
     * GET /api/site-builder/sites/{siteId}/tasks/members
     */
    public function members(string $siteId): JsonResponse
    {
        $site = $this->resolveSite($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $members = WorkspaceUser::where('workspace_id', $site->workspace_id)
            ->with('user:id,name,email')
            ->get()
            ->map(fn($wu) => [
                'id'    => $wu->user->id,
                'name'  => $wu->user->name,
                'email' => $wu->user->email,
                'role'  => $wu->role,
            ]);

        return response()->json(['success' => true, 'data' => $members]);
    }

    private function formatTask(Task $task): array
    {
        return [
            'id'             => $task->id,
            'site_id'        => $task->site_id,
            'title'          => $task->title,
            'description'    => $task->description,
            'priority'       => $task->priority ?? 'normal',
            'status'         => $task->status ?? 'pending',
            'scheduled_date' => $task->scheduled_date?->toDateString(),
            'completed_at'   => $task->completed_at?->toISOString(),
            'order'          => $task->order,
            'type'           => $task->type,
            'reservation_id' => $task->reservation_id,
            'image_url'      => $task->image_path ? asset('storage/' . $task->image_path) : null,
            'assigned_to'    => $task->assignedTo ? [
                'id'    => $task->assignedTo->id,
                'name'  => $task->assignedTo->name,
                'email' => $task->assignedTo->email,
            ] : null,
            'created_at'     => $task->created_at->toISOString(),
        ];
    }
}
