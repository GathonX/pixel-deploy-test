<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\Notification;
use App\Models\User;
use App\Models\Workspace;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class BillingController extends Controller
{
    public function __construct(private BillingService $billing) {}

    /**
     * Liste des factures du workspace connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $invoices = BillingInvoice::where('workspace_id', $workspace->id)
            ->with('site:id,name')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($inv) => [
                'id'                 => $inv->id,
                'invoice_number'     => $inv->invoice_number,
                'scope'              => $inv->subscription_scope,
                'site_name'          => $inv->site?->name,
                'plan_key'           => $inv->plan_key,
                'billing_period'     => $inv->billing_period,
                'amount_ariary'      => $inv->amount_ariary,
                'amount_eur'         => $inv->amount_eur,
                'status'             => $inv->status,
                'payment_reference'  => $inv->payment_reference,
                'payment_method'     => $inv->payment_method,
                'due_at'             => $inv->due_at,
                'paid_at'            => $inv->paid_at,
                'created_at'         => $inv->created_at,
            ]);

        return response()->json(['success' => true, 'data' => $invoices]);
    }

    /**
     * Détail d'une facture.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');
        $invoice   = BillingInvoice::where('workspace_id', $workspace->id)->find($id);

        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Facture non trouvée.'], 404);
        }

        return response()->json(['success' => true, 'data' => $invoice->load('site:id,name')]);
    }

    /**
     * Crée une facture pour la souscription principale du workspace.
     */
    public function createWorkspaceInvoice(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $validated = $request->validate([
            'plan_key'       => 'required|in:starter,pro,premium',
            'billing_period' => 'required|in:monthly,yearly',
        ]);

        $invoice = $this->billing->createWorkspaceInvoice(
            $workspace,
            $validated['plan_key'],
            $validated['billing_period']
        );

        return response()->json([
            'success' => true,
            'message' => 'Facture créée.',
            'data'    => [
                'invoice_number'    => $invoice->invoice_number,
                'amount_ariary'     => $invoice->amount_ariary,
                'amount_eur'        => $invoice->amount_eur,
                'payment_reference' => $invoice->payment_reference,
                'due_at'            => $invoice->due_at,
                'payment_methods'   => BillingInvoice::availablePaymentMethods(),
            ],
        ], 201);
    }

    /**
     * Crée une facture pour un site supplémentaire (flux Premium >5 sites).
     */
    public function createSiteInvoice(Request $request): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');

        $validated = $request->validate([
            'site_id'        => 'required|string|exists:user_sites,id',
            'plan_key'       => 'required|in:starter,pro',
            'billing_period' => 'required|in:monthly,yearly',
        ]);

        $site = $workspace->sites()->find($validated['site_id']);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé dans ce workspace.'], 404);
        }

        $invoice = $this->billing->createSiteInvoice(
            $workspace,
            $site,
            $validated['plan_key'],
            $validated['billing_period']
        );

        return response()->json([
            'success' => true,
            'message' => 'Facture site créée. En attente de paiement.',
            'data'    => [
                'invoice_number'    => $invoice->invoice_number,
                'amount_ariary'     => $invoice->amount_ariary,
                'amount_eur'        => $invoice->amount_eur,
                'payment_reference' => $invoice->payment_reference,
                'due_at'            => $invoice->due_at,
                'payment_methods'   => BillingInvoice::availablePaymentMethods(),
            ],
        ], 201);
    }

    /**
     * Soumet une preuve de paiement (côté client).
     */
    public function submitPaymentProof(Request $request, int $id): JsonResponse
    {
        $workspace = $request->attributes->get('workspace');
        $invoice   = BillingInvoice::where('workspace_id', $workspace->id)
            ->whereIn('status', ['issued', 'overdue'])
            ->find($id);

        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Facture non trouvée ou déjà payée.'], 404);
        }

        $validated = $request->validate([
            'payment_method'   => 'required|in:orange_money,mvola,airtel_money,bank_transfer,taptap_send',
            'payment_proof_url' => 'nullable|url|max:500',
        ]);

        $invoice->update([
            'payment_method'    => $validated['payment_method'],
            'payment_proof_url' => $validated['payment_proof_url'] ?? null,
        ]);

        // Notifier les admins qu'une preuve de paiement est disponible
        $this->notifyAdminsPaymentProofReceived($invoice, $workspace);

        return response()->json([
            'success' => true,
            'message' => 'Preuve de paiement soumise. En attente de confirmation par l\'équipe PixelRise.',
        ]);
    }

    /**
     * Liste toutes les factures (admin uniquement).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = BillingInvoice::with(['workspace:id,name,owner_user_id', 'site:id,name'])
            ->orderByDesc('created_at');

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('payment_reference', 'like', "%{$search}%")
                  ->orWhereHas('workspace', fn($wq) => $wq->where('name', 'like', "%{$search}%"));
            });
        }

        $invoices = $query->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $invoices,
        ]);
    }

    /**
     * Confirme le paiement (admin uniquement).
     */
    public function confirmPayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|in:orange_money,mvola,airtel_money,bank_transfer,taptap_send',
        ]);

        $invoice = BillingInvoice::find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Facture non trouvée.'], 404);
        }

        $invoice = $this->billing->confirmPayment($invoice, Auth::id(), $validated['payment_method']);

        return response()->json([
            'success' => true,
            'message' => 'Paiement confirmé. Plan activé.',
            'data'    => $invoice,
        ]);
    }

    /**
     * Notifie les admins (email + in-app) qu'une preuve de paiement a été soumise.
     */
    private function notifyAdminsPaymentProofReceived(BillingInvoice $invoice, Workspace $workspace): void
    {
        try {
            $admins = User::where('is_admin', true)->get();
            if ($admins->isEmpty()) return;

            $planLabel      = ucfirst($invoice->plan_key ?? 'inconnu');
            $amount         = number_format($invoice->amount_ariary, 0, ',', ' ');
            $methodLabel    = match($invoice->payment_method) {
                'mvola'         => 'MVola',
                'orange_money'  => 'Orange Money',
                'airtel_money'  => 'Airtel Money',
                'bank_transfer' => 'Virement bancaire',
                'taptap_send'   => 'TapTap Send',
                default         => $invoice->payment_method ?? '—',
            };
            $adminUrl = config('app.frontend_url', 'https://pixelrise.mg') . '/admin/billing/invoices';

            foreach ($admins as $admin) {
                // — Email —
                Mail::raw(
                    "Bonjour {$admin->name},\n\n" .
                    "💰 Une preuve de paiement vient d'être soumise et attend votre confirmation.\n\n" .
                    "Workspace : {$workspace->name}\n" .
                    "Facture   : {$invoice->invoice_number}\n" .
                    "Plan      : {$planLabel}\n" .
                    "Montant   : {$amount} Ar\n" .
                    "Méthode   : {$methodLabel}\n\n" .
                    "👉 Confirmer le paiement :\n{$adminUrl}\n\n" .
                    "PixelRise Admin",
                    fn($m) => $m
                        ->to($admin->email, $admin->name)
                        ->subject("💰 Preuve de paiement reçue — {$invoice->invoice_number} ({$workspace->name})")
                );

                // — Notification in-app —
                Notification::create([
                    'user_id'    => $admin->id,
                    'type'       => 'payment_proof_received',
                    'priority'   => 'high',
                    'status'     => 'unread',
                    'title'      => "Preuve de paiement — {$invoice->invoice_number}",
                    'message'    => "{$workspace->name} a soumis un paiement de {$amount} Ar (plan {$planLabel}) via {$methodLabel}. À confirmer.",
                    'data'       => [
                        'invoice_id'     => $invoice->id,
                        'invoice_number' => $invoice->invoice_number,
                        'workspace_id'   => $workspace->id,
                        'workspace_name' => $workspace->name,
                        'plan_key'       => $invoice->plan_key,
                        'amount_ariary'  => $invoice->amount_ariary,
                        'payment_method' => $invoice->payment_method,
                    ],
                    'href'       => '/admin/billing/invoices',
                    'category'   => 'billing',
                    'show_badge' => true,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('BillingController::notifyAdminsPaymentProofReceived error', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }
}
