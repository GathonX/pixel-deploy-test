<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Workspace;
use App\Models\WorkspaceSubscription;
use App\Models\UserSite;
use App\Services\PlanResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminWorkspaceController extends Controller
{
    public function __construct(private PlanResolver $planResolver) {}

    /**
     * Liste tous les workspaces (admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Workspace::with([
            'owner:id,name,email',
            'subscriptions' => fn($q) => $q->whereIn('status', ['trial_active', 'active', 'grace'])->latest('starts_at')->limit(1),
        ])->withCount('sites');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('owner', fn($wq) => $wq->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $workspaces = $query->orderByDesc('created_at')->paginate(20);

        // Enrichir avec plan_key depuis la souscription active
        $workspaces->getCollection()->transform(function ($ws) {
            $sub = $ws->subscriptions->first();
            $ws->plan_key         = $sub?->plan_key;
            $ws->sub_status       = $sub?->status;
            $ws->sub_ends_at      = $sub?->ends_at;
            $ws->published_count  = UserSite::where('workspace_id', $ws->id)->where('status', 'published')->count();
            return $ws;
        });

        return response()->json(['success' => true, 'data' => $workspaces]);
    }

    /**
     * Détail d'un workspace (admin).
     */
    public function show(int $id): JsonResponse
    {
        $workspace = Workspace::with([
            'owner:id,name,email,created_at',
            'members.user:id,name,email',
            'subscriptions' => fn($q) => $q->orderByDesc('starts_at')->limit(5),
            'sites:id,workspace_id,name,status,subdomain,created_at',
        ])->findOrFail($id);

        $sub = $workspace->subscriptions->whereIn('status', ['trial_active', 'active', 'grace'])->first();

        return response()->json([
            'success' => true,
            'data'    => array_merge($workspace->toArray(), [
                'plan_key'        => $sub?->plan_key,
                'sub_status'      => $sub?->status,
                'sub_ends_at'     => $sub?->ends_at,
                'published_count' => UserSite::where('workspace_id', $workspace->id)->where('status', 'published')->count(),
            ]),
        ]);
    }

    /**
     * Statistiques globales des workspaces (admin dashboard).
     */
    public function stats(): JsonResponse
    {
        // Comptages par statut
        $byStatus = Workspace::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $total      = array_sum($byStatus);
        $trialCount = $byStatus['trial_active'] ?? 0;
        $activeCount= $byStatus['active'] ?? 0;
        $graceCount = $byStatus['grace'] ?? 0;
        $suspCount  = $byStatus['suspended'] ?? 0;
        $pendingDel = $byStatus['pending_deletion'] ?? 0;

        // Essais expirant dans les 7 prochains jours
        $trialExpiringSoon = Workspace::where('status', 'trial_active')
            ->whereBetween('trial_ends_at', [now(), now()->addDays(7)])
            ->count();

        // MRR estimé (souscriptions actives × prix mensuel)
        $planPrices = [
            'starter' => 35000,
            'pro'     => 120000,
            'premium' => 200000,
        ];
        $activeSubs = WorkspaceSubscription::whereIn('status', ['active', 'grace'])
            ->select('plan_key', DB::raw('count(*) as total'))
            ->groupBy('plan_key')
            ->pluck('total', 'plan_key')
            ->toArray();

        $mrr = 0;
        foreach ($activeSubs as $plan => $count) {
            $mrr += ($planPrices[$plan] ?? 0) * $count;
        }

        // Répartition par plan (actifs + trials)
        $planBreakdown = WorkspaceSubscription::whereIn('status', ['active', 'trial_active', 'grace'])
            ->select('plan_key', DB::raw('count(*) as total'))
            ->groupBy('plan_key')
            ->pluck('total', 'plan_key')
            ->toArray();

        // Factures à confirmer
        $invoicesPending = BillingInvoice::where('status', 'issued')->count();

        // Nouveaux workspaces par jour (30 derniers jours)
        $newPerDay = Workspace::where('created_at', '>=', now()->subDays(29))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->mapWithKeys(fn($r) => [$r->date => $r->total]);

        // Remplir les 30 derniers jours (y compris les jours sans création)
        $trend = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $trend[] = ['date' => $date, 'count' => $newPerDay[$date] ?? 0];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total'                => $total,
                'trial_active'         => $trialCount,
                'active'               => $activeCount,
                'grace'                => $graceCount,
                'suspended'            => $suspCount,
                'pending_deletion'     => $pendingDel,
                'trial_expiring_soon'  => $trialExpiringSoon,
                'mrr_ariary'           => $mrr,
                'invoices_pending'     => $invoicesPending,
                'plan_breakdown'       => $planBreakdown,
                'active_subs'          => $activeSubs,
                'trend_30d'            => $trend,
            ],
        ]);
    }

    /**
     * Change le statut d'un workspace (admin).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:trial_active,active,grace,suspended,pending_deletion,deleted',
        ]);

        $workspace = Workspace::findOrFail($id);
        $workspace->update(['status' => $validated['status']]);

        return response()->json([
            'success' => true,
            'message' => 'Statut du workspace mis à jour.',
            'data'    => ['status' => $workspace->status],
        ]);
    }
}
