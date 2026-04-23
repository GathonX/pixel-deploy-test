<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\User;
use App\Models\UserSite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * GET /site-builder/sites/{siteId}/tasks
     */
    public function index(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $tasks = Task::where('site_id', $siteId)
            ->with('assignedTo:id,name,email')
            ->orderBy('order')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($t) => $this->transform($t));

        $stats = [
            'total'     => $tasks->count(),
            'pending'   => $tasks->where('status', 'pending')->count(),
            'in_progress' => $tasks->where('status', 'in-progress')->count(),
            'completed' => $tasks->where('status', 'completed')->count(),
            'urgent'    => $tasks->where('priority', 'high')->where('status', '!=', 'completed')->count(),
        ];

        return response()->json(['success' => true, 'data' => $tasks, 'stats' => $stats]);
    }

    /**
     * POST /site-builder/sites/{siteId}/tasks
     */
    public function store(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $validated = $request->validate([
            'title'          => 'required|string|max:255',
            'description'    => 'nullable|string',
            'type'           => 'nullable|in:mission,vision,objective,action',
            'priority'       => 'nullable|in:high,medium,low,normal',
            'status'         => 'nullable|in:pending,in-progress,completed',
            'scheduled_date' => 'nullable|date',
            'assigned_to_id' => 'nullable|integer|exists:users,id',
        ]);

        $task = Task::create(array_merge($validated, [
            'site_id'   => $siteId,
            'user_id'   => $request->user()->id,
            'sprint_id' => null,
            'type'      => $validated['type'] ?? 'action',
            'priority'  => $validated['priority'] ?? 'normal',
            'status'    => $validated['status'] ?? 'pending',
            'order'     => Task::where('site_id', $siteId)->max('order') + 1,
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Tâche créée.',
            'data'    => $this->transform($task->load('assignedTo:id,name,email')),
        ], 201);
    }

    /**
     * PUT /site-builder/sites/{siteId}/tasks/{id}
     */
    public function update(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $task = Task::where('site_id', $siteId)->find($id);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Tâche introuvable.'], 404);
        }

        $validated = $request->validate([
            'title'          => 'sometimes|required|string|max:255',
            'description'    => 'nullable|string',
            'type'           => 'nullable|in:mission,vision,objective,action',
            'priority'       => 'nullable|in:high,medium,low,normal',
            'status'         => 'nullable|in:pending,in-progress,completed',
            'scheduled_date' => 'nullable|date',
            'assigned_to_id' => 'nullable|integer|exists:users,id',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        } elseif (isset($validated['status'])) {
            $validated['completed_at'] = null;
        }

        $task->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tâche mise à jour.',
            'data'    => $this->transform($task->fresh()->load('assignedTo:id,name,email')),
        ]);
    }

    /**
     * DELETE /site-builder/sites/{siteId}/tasks/{id}
     */
    public function destroy(Request $request, string $siteId, int $id): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $task = Task::where('site_id', $siteId)->find($id);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Tâche introuvable.'], 404);
        }

        $task->delete();

        return response()->json(['success' => true, 'message' => 'Tâche supprimée.']);
    }

    /**
     * POST /site-builder/sites/{siteId}/tasks/reorder
     * Body: { ids: [1, 3, 2, ...] }
     */
    public function reorder(Request $request, string $siteId): JsonResponse
    {
        $site = $this->getSiteOrFail($siteId, $request);
        if ($site instanceof JsonResponse) return $site;

        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        foreach ($request->ids as $order => $taskId) {
            Task::where('id', $taskId)->where('site_id', $siteId)->update(['order' => $order]);
        }

        return response()->json(['success' => true, 'message' => 'Ordre mis à jour.']);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function getSiteOrFail(string $siteId, Request $request): UserSite|JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $site = UserSite::where('id', $siteId)
            ->where('workspace_id', $workspace->id)
            ->first();

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site introuvable.'], 404);
        }

        return $site;
    }

    private function transform(Task $t): array
    {
        return [
            'id'             => $t->id,
            'site_id'        => $t->site_id,
            'title'          => $t->title,
            'description'    => $t->description,
            'type'           => $t->type,
            'priority'       => $t->priority,
            'status'         => $t->status,
            'scheduled_date' => $t->scheduled_date?->format('Y-m-d'),
            'completed_at'   => $t->completed_at?->toISOString(),
            'order'          => $t->order,
            'assigned_to'    => $t->assignedTo ? [
                'id'    => $t->assignedTo->id,
                'name'  => $t->assignedTo->name,
                'email' => $t->assignedTo->email,
            ] : null,
            'created_at'     => $t->created_at?->toISOString(),
        ];
    }
}
