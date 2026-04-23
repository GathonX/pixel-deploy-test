<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\UserAgent;
use Jenssegers\Agent\Agent;

class UserAgentAdminController extends Controller
{
    public function index(Request $request)
    {
        $query = UserAgent::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('user_type')) {
            $query->where('user_type', $request->user_type);
        }

        if ($request->filled('page_filter')) {
            $query->where('page', 'like', '%' . $request->page_filter . '%');
        }

        $agents = $query->paginate(15);

        // Transformer les données pour correspondre au format attendu par le frontend
        $agents->getCollection()->transform(function ($agent) {
            $parser = new Agent();
            $parser->setUserAgent($agent->agent);

            return [
                'id' => $agent->id,
                'user' => $agent->user ? ['name' => $agent->user->name] : null,
                'agent' => $agent->agent,
                'device' => $agent->device ?? ($parser->browser() . ' / ' . $parser->platform()),
                'action' => $agent->action ?? 'Visite de page',
                'status' => $agent->status ?? 'Succès',
                'page' => $agent->page,
                'language' => $agent->language,
                'timezone' => $agent->timezone,
                'ip_address' => $agent->ip_address,
                'created_at' => $agent->created_at->toDateTimeString(),
            ];
        });

        return response()->json([
            'message' => 'Liste des user-agents récupérée avec succès.',
            'data' => [
                'current_page' => $agents->currentPage(),
                'data' => $agents->items(),
                'last_page' => $agents->lastPage(),
                'per_page' => $agents->perPage(),
                'total' => $agents->total(),
            ],
        ]);
    }

    public function destroy($id)
    {
        $userAgent = UserAgent::findOrFail($id);
        $userAgent->delete();
        return response()->json(['message' => 'User-agent supprimé avec succès']);
    }
}