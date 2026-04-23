<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Renvoie la croissance mensuelle des utilisateurs.
     */


public function userGrowth(): JsonResponse
{
    $growth = DB::table('users')
        ->selectRaw("DATE_FORMAT(created_at, '%b') as month, COUNT(*) as users")
        ->groupBy('month')
        ->orderByRaw("MIN(created_at)")
        ->get();

    return response()->json($growth);
}

    /**
     * Retourne les projets récents avec leurs clients.
     */
    public function recentProjects(): JsonResponse
    {
        try {
            $projects = DB::table('projects')
                ->join('users', 'projects.user_id', '=', 'users.id')
                ->select(
                    'projects.id',
                    'projects.name as project_name',
                    'projects.status',
                    'projects.created_at',
                    'users.name as client_name'
                )
                ->orderBy('projects.created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($project) {
                    return [
                        'id' => $project->id,
                        'project_name' => $project->project_name,
                        'client_name' => $project->client_name,
                        'created_at' => \Carbon\Carbon::parse($project->created_at)->format('d/m/Y'),
                        'status' => $project->status ?? 'active'
                    ];
                });

            return response()->json($projects);
        } catch (\Exception $e) {
            Log::error('Erreur récupération projets récents:', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

    /**
     * Retourne les tickets récents avec leurs utilisateurs.
     */
    public function recentTickets(): JsonResponse
    {
        try {
            $tickets = DB::table('tickets')
                ->join('users', 'tickets.user_id', '=', 'users.id')
                ->select(
                    'tickets.id',
                    'tickets.subject',
                    'tickets.priority',
                    'tickets.status',
                    'tickets.created_at',
                    'users.name as user_name'
                )
                ->orderBy('tickets.created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($ticket) {
                    return [
                        'id' => $ticket->id,
                        'subject' => $ticket->subject,
                        'user_name' => $ticket->user_name,
                        'created_at' => \Carbon\Carbon::parse($ticket->created_at)->format('d/m/Y'),
                        'priority' => $ticket->priority ?? 'normal',
                        'status' => $ticket->status ?? 'open'
                    ];
                });

            return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Erreur récupération tickets récents:', ['error' => $e->getMessage()]);
            return response()->json([]);
        }
    }

}
