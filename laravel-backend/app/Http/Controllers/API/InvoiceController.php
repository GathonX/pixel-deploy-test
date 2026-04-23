<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\FeatureActivationRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Ticket;
use App\Models\Notification;

class InvoiceController extends Controller
{
    /**
     * Générer une facture pour une demande d'activation de fonctionnalité
     */
    public function generateInvoiceForActivationRequest(int $activationRequestId)
    {
        try {
            $activationRequest = FeatureActivationRequest::findOrFail($activationRequestId);
            
            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $activationRequest->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à générer cette facture'
                ], 403);
            }

            // Créer la facture
            $invoice = Invoice::create([
                'user_id' => $user->id,
                'feature_id' => $activationRequest->feature_id,
                'feature_activation_request_id' => $activationRequestId,
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'amount' => $activationRequest->amount_claimed,
                'currency' => 'EUR', // À ajuster selon votre configuration
                'billing_period' => $activationRequest->billing_period ?? 'monthly',
                'due_date' => now()->addDays(30),
                'status' => 'pending',
                'metadata' => [
                    'activation_request' => $activationRequest->toArray()
                ]
            ]);

            // Générer le PDF
            $pdfPath = $this->generateInvoicePDF($invoice);

            $invoice->updateFileField('pdf_path', $pdfPath);

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'pdf_url' => Storage::url($pdfPath)
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur génération facture', [
                'activation_request_id' => $activationRequestId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la facture'
            ], 500);
        }
    }

    /**
     * Télécharger le PDF de la facture
     */
    public function downloadInvoicePDF(int $invoiceId)
    {
        try {
            Log::channel('daily')->info('Tentative de téléchargement de facture', [
                'invoice_id' => $invoiceId,
                'user_id' => auth()->id()
            ]);

            $invoice = Invoice::findOrFail($invoiceId);
            
            Log::channel('daily')->info('Facture trouvée', [
                'invoice_details' => $invoice->toArray()
            ]);

            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $invoice->user_id) {
                Log::channel('daily')->warning('Utilisateur non autorisé à télécharger la facture', [
                    'current_user_id' => $user->id,
                    'invoice_user_id' => $invoice->user_id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à télécharger cette facture'
                ], 403);
            }

            // 🔧 TEMPORAIRE : Régénérer le PDF à chaque téléchargement pour tester le nouveau template
            
            // Supprimer l'ancien PDF s'il existe
            if ($invoice->pdf_path && Storage::exists($invoice->pdf_path)) {
                Storage::delete($invoice->pdf_path);
            }
            
            // Régénérer le PDF avec le nouveau template
            $this->generateInvoicePDF($invoice);
            
            // Vérifier que le nouveau PDF existe
            if (!$invoice->pdf_path || !Storage::exists($invoice->pdf_path)) {
                Log::channel('daily')->error('Échec de génération du PDF', [
                    'invoice_id' => $invoiceId,
                    'pdf_path' => $invoice->pdf_path
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de la génération de la facture'
                ], 500);
            }

            // Retourner le téléchargement
            return response()->download(
                Storage::path($invoice->pdf_path), 
                "Facture-{$invoice->invoice_number}.pdf"
            );

        } catch (\Exception $e) {
            // Log to PHP error log for debugging
            error_log('INVOICE DOWNLOAD ERROR: ' . $e->getMessage());
            error_log('File: ' . $e->getFile() . ':' . $e->getLine());
            error_log('Trace: ' . $e->getTraceAsString());

            Log::channel('daily')->error('Erreur fatale lors du téléchargement de facture', [
                'invoice_id' => $invoiceId,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du téléchargement de la facture',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soumettre la facture à l'admin
     */
    public function submitInvoiceToAdmin(int $invoiceId)
    {
        try {
            $invoice = Invoice::findOrFail($invoiceId);
            
            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $invoice->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à soumettre cette facture'
                ], 403);
            }

            // Créer un ticket pour l'admin
            $ticket = Ticket::create([
                'user_id' => $user->id,
                'title' => "Soumission de facture #{$invoice->invoice_number}",
                'description' => "Facture #{$invoice->invoice_number} soumise pour vérification\n\n" . 
                    "Montant : {$invoice->amount} {$invoice->currency}\n" .
                    "Période de facturation : {$invoice->billing_period}",
                'category' => 'invoice',
                'status' => 'open'
            ]);

            // Notification aux admins
            $this->notifyAdminsAboutInvoice($invoice, $ticket);

            return response()->json([
                'success' => true,
                'message' => 'Facture soumise avec succès',
                'ticket_id' => $ticket->id
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur soumission facture', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission de la facture'
            ], 500);
        }
    }

    /**
     * Générer une facture directement pour une fonctionnalité (nouvel achat)
     */
    public function generateInvoiceForFeature(int $featureId)
    {
        Log::channel('daily')->info('DEBUT génération facture pour fonctionnalité', [
            'feature_id' => $featureId,
            'user_id' => auth()->id(),
            'timestamp' => now()->toISOString()
        ]);

        try {
            $user = auth()->user();
            
            // Vérifier que la fonctionnalité existe
            $feature = \App\Models\Feature::findOrFail($featureId);
            
            Log::channel('daily')->info('Fonctionnalité trouvée', [
                'feature_name' => $feature->name,
                'feature_key' => $feature->key
            ]);

            $paymentReference = Invoice::generatePaymentReference();

            Log::channel('daily')->info('Référence de paiement générée', [
                'payment_reference' => $paymentReference
            ]);

            // Créer la facture avec prix mensuel par défaut
            $monthlyPrice = $feature->pricing['monthly']['price'] ?? $feature->price ?? 0;
            
            $invoice = Invoice::create([
                'user_id' => $user->id,
                'feature_id' => $featureId,
                'feature_activation_request_id' => null, // Pas encore de demande d'activation
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'payment_reference' => $paymentReference,
                'amount' => $monthlyPrice,
                'currency' => 'EUR',
                'billing_period' => 'monthly', // Par défaut mensuel
                'due_date' => now()->addDays(30),
                'status' => 'pending',
                'payment_instructions' => json_encode([
                    'status' => 'NON PAYÉE',
                    'due_date' => now()->addDays(30)->format('d/m/Y'),
                    'payment_reference' => $paymentReference,
                    'payment_methods' => Invoice::getAvailablePaymentMethods(),
                    'next_step_url' => config('app.frontend_url') . "/features/purchase/{$featureId}"
                ]),
                'metadata' => [
                    'feature' => $feature->toArray()
                ]
            ]);

            Log::channel('daily')->info('Facture créée', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $monthlyPrice
            ]);

            // Générer le PDF
            $this->generateInvoicePDF($invoice);

            Log::channel('daily')->info('PDF de facture généré', [
                'pdf_path' => $invoice->pdf_path
            ]);

            // Charger la fonctionnalité et utiliser la même structure que getInvoiceDetails
            $invoice->load(['user', 'feature']);
            
            // Utiliser getFullDetailsAttribute() pour avoir la même structure
            $fullDetails = $invoice->getFullDetailsAttribute();
            
            // Ajouter les informations de pricing à la fonctionnalité
            if (isset($fullDetails['feature'])) {
                $fullDetails['feature']['pricing'] = [
                    'monthly' => [
                        'price' => floatval($feature->price),
                        'period' => 'monthly',
                        'display' => number_format($feature->price, 2) . '€/mois'
                    ],
                    'yearly' => [
                        'price' => floatval($feature->price) * 12 * 0.8, // 20% de réduction
                        'period' => 'yearly',
                        'original_price' => floatval($feature->price) * 12,
                        'discount_percentage' => 20,
                        'savings' => floatval($feature->price) * 12 * 0.2,
                        'display' => number_format(floatval($feature->price) * 12 * 0.8, 2) . '€/an',
                        'monthly_equivalent' => floatval($feature->price) * 0.8
                    ]
                ];
            }

            // Générer le résumé détaillé
            $detailedSummary = $invoice->generateDetailedSummary();
            $isOverdue = $invoice->isOverdue();

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $fullDetails,
                    'summary' => $detailedSummary,
                    'is_overdue' => $isOverdue,
                    'pdf_url' => $invoice->pdf_path ? Storage::url($invoice->pdf_path) : null
                ]
            ]);

        } catch (\Exception $e) {
            Log::channel('daily')->error('Erreur génération facture pour fonctionnalité', [
                'feature_id' => $featureId,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la facture',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer une facture pour une demande d'activation de fonctionnalité avec instructions de paiement
     */
    public function generateInvoiceWithPaymentInstructions(int $activationRequestId)
    {
        Log::channel('daily')->info('DEBUT génération facture', [
            'activation_request_id' => $activationRequestId,
            'user_id' => auth()->id(),
            'timestamp' => now()->toISOString()
        ]);

        try {
            $activationRequest = FeatureActivationRequest::findOrFail($activationRequestId);
            
            Log::channel('daily')->info('Demande activation trouvée', [
                'activation_request_details' => $activationRequest->toArray()
            ]);

            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $activationRequest->user_id) {
                Log::channel('daily')->warning('Utilisateur non autorisé à générer la facture', [
                    'current_user_id' => $user->id,
                    'activation_request_user_id' => $activationRequest->user_id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à générer cette facture'
                ], 403);
            }

            $paymentReference = Invoice::generatePaymentReference();

            Log::channel('daily')->info('Référence de paiement générée', [
                'payment_reference' => $paymentReference
            ]);

            // Créer la facture
            $invoice = Invoice::create([
                'user_id' => $user->id,
                'feature_id' => $activationRequest->feature_id,
                'feature_activation_request_id' => $activationRequestId,
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'payment_reference' => $paymentReference,
                'amount' => $activationRequest->amount_claimed,
                'currency' => 'EUR', // À ajuster selon votre configuration
                'billing_period' => $activationRequest->billing_period ?? 'monthly',
                'due_date' => now()->addDays(30),
                'status' => 'pending',
                'payment_instructions' => json_encode([
                    'status' => 'NON PAYÉE',
                    'due_date' => now()->addDays(30)->format('d/m/Y'),
                    'payment_reference' => $paymentReference,
                    'payment_methods' => Invoice::getAvailablePaymentMethods(),
                    'next_step_url' => config('app.frontend_url') . "/features/purchase/{$activationRequest->feature_id}"
                ]),
                'metadata' => [
                    'activation_request' => $activationRequest->toArray()
                ]
            ]);

            Log::channel('daily')->info('Facture créée', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number
            ]);

            // Générer le PDF
            $pdfPath = $this->generateInvoicePDF($invoice);

            $invoice->updateFileField('pdf_path', $pdfPath);

            Log::channel('daily')->info('PDF de facture généré', [
                'pdf_path' => $pdfPath
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'pdf_url' => Storage::url($pdfPath),
                    'payment_instructions' => json_decode($invoice->payment_instructions, true)
                ]
            ]);

        } catch (\Exception $e) {
            Log::channel('daily')->error('Erreur génération facture avec instructions', [
                'activation_request_id' => $activationRequestId,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la facture',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Soumettre les détails de paiement
     */
    public function submitPaymentDetails(Request $request, int $invoiceId)
    {
        $request->validate([
            'payment_method' => 'required|in:' . implode(',', array_keys(Invoice::getAvailablePaymentMethods())),
            'transaction_reference' => 'required|string|max:255',
            'payment_proof' => 'nullable|file|max:10240' // Preuve de paiement optionnelle
        ]);

        try {
            $invoice = Invoice::findOrFail($invoiceId);
            
            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $invoice->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à soumettre ces détails'
                ], 403);
            }

            // Stocker la preuve de paiement si fournie
            $paymentProofPath = null;
            if ($request->hasFile('payment_proof')) {
                $paymentProofPath = $request->file('payment_proof')->store('payment_proofs', 'public');
            }

            // Mettre à jour la facture
            $invoice->update([
                'payment_method' => $request->payment_method,
                'status' => 'pending_verification',
                'metadata' => array_merge(
                    $invoice->metadata ?? [],
                    [
                        'transaction_reference' => $request->transaction_reference,
                        'payment_proof_path' => $paymentProofPath
                    ]
                )
            ]);

            // Créer un ticket pour l'admin
            $ticket = Ticket::create([
                'user_id' => $user->id,
                'title' => "Paiement de facture #{$invoice->invoice_number}",
                'description' => "Détails de paiement soumis pour la facture #{$invoice->invoice_number}\n\n" .
                    "Méthode de paiement : {$request->payment_method}\n" .
                    "Référence de transaction : {$request->transaction_reference}",
                'category' => 'payment_verification',
                'status' => 'open'
            ]);

            // Notifier les admins
            $this->notifyAdminsAboutPayment($invoice, $ticket);

            return response()->json([
                'success' => true,
                'message' => 'Détails de paiement soumis avec succès',
                'ticket_id' => $ticket->id
            ]);

        } catch (\Exception $e) {
            Log::error('Erreur soumission détails de paiement', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la soumission des détails de paiement'
            ], 500);
        }
    }

    /**
     * Obtenir les détails d'une facture
     */
    public function getInvoiceDetails(int $invoiceId)
    {
        try {
            Log::channel('daily')->info('Récupération des détails de la facture', [
                'invoice_id' => $invoiceId,
                'user_id' => auth()->id()
            ]);

            // Log supplémentaire pour le débogage
            Log::channel('daily')->debug('Détails de la requête', [
                'method' => request()->method(),
                'url' => request()->fullUrl(),
                'headers' => request()->headers->all(),
                'query_params' => request()->query(),
                'route_params' => request()->route()->parameters()
            ]);

            $invoice = Invoice::with(['user', 'feature'])->find($invoiceId);
            
            if (!$invoice) {
                Log::channel('daily')->info('Facture non trouvée', [
                    'invoice_id' => $invoiceId
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Facture non trouvée',
                    'error_details' => 'Cette facture n\'existe pas'
                ], 404);
            }
            
            // Log supplémentaire pour les détails de la facture
            Log::channel('daily')->debug('Détails de la facture trouvée', [
                'invoice_details' => $invoice->toArray(),
                'payment_instructions_raw' => $invoice->payment_instructions
            ]);

            // Vérifier que l'utilisateur est autorisé
            $user = auth()->user();
            if ($user->id !== $invoice->user_id) {
                Log::channel('daily')->warning('Utilisateur non autorisé à voir les détails de la facture', [
                    'current_user_id' => $user->id,
                    'invoice_user_id' => $invoice->user_id
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à voir cette facture'
                ], 403);
            }

            // Récupérer les détails complets et le résumé
            $fullDetails = $invoice->getFullDetailsAttribute();
            $detailedSummary = $invoice->generateDetailedSummary();
            $isOverdue = $invoice->isOverdue();

            // Log supplémentaire pour les instructions de paiement
            Log::channel('daily')->debug('Instructions de paiement décodées', [
                'payment_instructions_decoded' => $fullDetails['payment_instructions'],
                'detailed_summary' => $detailedSummary,
                'is_overdue' => $isOverdue
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $fullDetails,
                    'summary' => $detailedSummary,
                    'is_overdue' => $isOverdue
                ]
            ]);

        } catch (\Exception $e) {
            Log::channel('daily')->error('Erreur lors de la récupération des détails de la facture', [
                'invoice_id' => $invoiceId,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Impossible de récupérer les détails de la facture',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer une facture avec une période de facturation spécifique
     */
    public function generateInvoiceWithBillingPeriod(Request $request, int $activationRequestId)
    {
        try {
            Log::channel('daily')->info('Génération de facture avec période de facturation', [
                'activation_request_id' => $activationRequestId,
                'billing_period' => $request->input('billing_period', 'monthly'),
                'user_id' => auth()->id()
            ]);

            // Valider la période de facturation
            $billingPeriod = $request->input('billing_period', 'monthly');
            if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Période de facturation invalide'
                ], 400);
            }

            // Générer la facture avec la période spécifiée
            $invoice = Invoice::generateInvoiceWithBillingPeriod(
                $activationRequestId, 
                $billingPeriod
            );

            Log::channel('daily')->info('Facture générée avec succès', [
                'invoice_id' => $invoice->id,
                'billing_period' => $invoice->billing_period
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'billing_period' => $invoice->billing_period
                ]
            ]);

        } catch (\Exception $e) {
            Log::channel('daily')->error('Erreur lors de la génération de la facture', [
                'activation_request_id' => $activationRequestId,
                'billing_period' => $billingPeriod ?? 'non spécifié',
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération de la facture',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour la période de facturation d'une facture existante
     */
    public function updateInvoiceBillingPeriod(Request $request, int $invoiceId)
    {
        try {
            Log::channel('daily')->info('Mise à jour de la période de facturation', [
                'invoice_id' => $invoiceId,
                'billing_period' => $request->input('billing_period'),
                'user_id' => auth()->id()
            ]);

            // Valider la période de facturation
            $billingPeriod = $request->input('billing_period');
            if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Période de facturation invalide'
                ], 400);
            }

            // Récupérer la facture
            $invoice = Invoice::findOrFail($invoiceId);

            // Vérifier que l'utilisateur est autorisé
            if (auth()->id() !== $invoice->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à modifier cette facture'
                ], 403);
            }

            // Mettre à jour la période de facturation
            $updated = $invoice->updateBillingPeriod($billingPeriod);

            if (!$updated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de mettre à jour la période de facturation'
                ], 500);
            }

            // Régénérer le PDF avec le nouveau montant
            $this->generateInvoicePDF($invoice->fresh());

            Log::channel('daily')->info('Période de facturation mise à jour et PDF régénéré', [
                'invoice_id' => $invoice->id,
                'new_billing_period' => $invoice->billing_period,
                'new_amount' => $invoice->amount
            ]);

            // Recharger la facture pour avoir les dernières données
            $invoice->refresh();

            return response()->json([
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'billing_period' => $invoice->billing_period,
                    'amount' => $invoice->amount
                ]
            ]);

        } catch (\Exception $e) {
            Log::channel('daily')->error('Erreur lors de la mise à jour de la période de facturation', [
                'invoice_id' => $invoiceId,
                'billing_period' => $billingPeriod ?? 'non spécifié',
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la période de facturation',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Notifier les admins de la soumission de facture
     */
    private function notifyAdminsAboutInvoice(Invoice $invoice, Ticket $ticket)
    {
        $admins = User::where('is_admin', true)->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'invoice_submission',
                'title' => "Nouvelle facture soumise #{$invoice->invoice_number}",
                'message' => "Une nouvelle facture a été soumise par {$invoice->user->name}",
                'data' => [
                    'invoice_id' => $invoice->id,
                    'ticket_id' => $ticket->id,
                    'amount' => $invoice->amount,
                    'currency' => $invoice->currency
                ],
                'href' => "/admin/invoices/{$invoice->id}",
                'category' => 'invoice'
            ]);
        }
    }

    /**
     * Notifier les admins du paiement
     */
    private function notifyAdminsAboutPayment(Invoice $invoice, Ticket $ticket)
    {
        $admins = User::where('is_admin', true)->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'payment_verification',
                'title' => "Nouvelle soumission de paiement - Facture #{$invoice->invoice_number}",
                'message' => "Un utilisateur a soumis des détails de paiement pour la facture #{$invoice->invoice_number}",
                'data' => [
                    'invoice_id' => $invoice->id,
                    'ticket_id' => $ticket->id,
                    'amount' => $invoice->amount,
                    'payment_method' => $invoice->payment_method
                ],
                'href' => "/admin/invoices/{$invoice->id}",
                'category' => 'payment'
            ]);
        }
    }

    /**
     * Générer le PDF de la facture avec le nouveau template compact
     */
    private function generateInvoicePDF(Invoice $invoice): void
    {
        try {
            error_log('[generateInvoicePDF] Starting PDF generation for invoice ' . $invoice->id);

            $user = $invoice->user;
            $feature = $invoice->feature;

            // Préparer les données
        $data = [
            'invoice' => $invoice,
            'company' => [
                'name' => config('app.company_name', 'Pixel Rise'),
                'address' => config('app.company_address', 'Campt vert, hell ville'),
                'city' => config('app.company_city', 'Nosy Be'),
                'postal_code' => config('app.company_postal_code', '207'),
                'country' => config('app.company_country', 'MG'),
                'email' => config('app.company_email', 'Marketing@pixel-rise.com'),
                'rcs' => config('app.company_rcs', 'RCS Nosy Be 2025 A 00042'),
                'nif' => config('app.company_nif', '4003806633'),
                'stat' => config('app.company_stat', 'STAT: 62011712024010911'),
                'website' => 'https://pixelrise.ai',
            ],
            'customer' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'invoiceDetails' => [
                'number' => $invoice->invoice_number,
                'date' => $invoice->created_at->format('d/m/Y'),
                'due_date' => $invoice->due_date ? $invoice->due_date->format('d/m/Y') : null,
            ],
            'amounts' => [
                'total' => $invoice->amount,
                'currency' => $invoice->currency ?: 'EUR',
            ],
            'payment' => [
                'reference' => $invoice->payment_reference,
                'method' => $invoice->payment_method,
                'paid_at' => $invoice->payment_date ? $invoice->payment_date->format('d/m/Y') : null,
            ],
            'items' => [[
                'description' => $feature->name ?? 'Service PixelRise',
                'quantity' => 1,
                'unit_price' => $invoice->amount,
                'total_price' => $invoice->amount,
            ]],
        ];
        
        // Générer le HTML
        $html = $this->generateInvoiceHTML($data);
        
        // Générer le PDF
        $pdf = Pdf::loadHTML($html);
        $pdf->setPaper('A4', 'portrait');
        $pdfContent = $pdf->output();
        
        // Sauvegarder
        $filename = "invoice-{$invoice->invoice_number}.pdf";
        $invoiceYear = $invoice->created_at->year;
        $path = "invoices/{$invoiceYear}/{$filename}";
        
        $directory = dirname($path);
        if (!Storage::exists($directory)) {
            Storage::makeDirectory($directory);
        }
        
            error_log('[generateInvoicePDF] Saving PDF to: ' . $path);
            $saved = Storage::put($path, $pdfContent);
            error_log('[generateInvoicePDF] Storage::put result: ' . ($saved ? 'SUCCESS' : 'FAILED'));

            // Mettre à jour la facture avec la méthode spéciale pour les champs de fichiers protégés
            error_log('[generateInvoicePDF] Updating pdf_path in database');
            $updated = $invoice->updateFileField('pdf_path', $path);
            error_log('[generateInvoicePDF] updateFileField result: ' . ($updated ? 'SUCCESS' : 'FAILED'));

        } catch (\Exception $e) {
            error_log('[generateInvoicePDF] ERROR: ' . $e->getMessage());
            error_log('[generateInvoicePDF] File: ' . $e->getFile() . ':' . $e->getLine());
            throw $e;
        }
    }

    /**
     * Générer le HTML de la facture (template exactement comme Facture-téléchargé.pdf)
     */
    private function generateInvoiceHTML(array $data): string
    {
        $invoice = $data['invoice'];
        $company = $data['company'];
        $customer = $data['customer'];
        $invoiceDetails = $data['invoiceDetails'];
        $amounts = $data['amounts'];
        $payment = $data['payment'];
        $items = $data['items'];
        
        // Calculer la période de service (1 an)
        $startDate = $invoice->created_at->format('d/m/Y');
        $endDate = $invoice->created_at->addYear()->format('d/m/Y');
        
        $html = "<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Facture {$invoiceDetails['number']}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            font-size: 12px;
            line-height: 1.4;
        }
        .status-badge {
            text-align: right;
            margin-bottom: 10px;
        }
        .status-badge span {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            background-color: #fee2e2;
            color: #dc2626;
            border: 2px solid #dc2626;
        }
        .header-section {
            display: table;
            width: 100%;
            margin-bottom: 15px;
        }
        .company-info {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        .company-logo {
            width: 60px;
            height: auto;
            margin-bottom: 5px;
        }
        .company-name {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #2563eb;
        }
        .company-address {
            font-size: 9px;
            color: #666;
            line-height: 1.3;
        }
        .invoice-header {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            text-align: right;
        }
        .invoice-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .invoice-dates {
            font-size: 9px;
            margin-bottom: 10px;
        }
        .billed-to {
            background-color: #f9fafb;
            padding: 8px;
            margin-bottom: 10px;
            border-left: 3px solid #2563eb;
            font-size: 10px;
        }
        .billed-to-title {
            font-weight: bold;
            margin-bottom: 3px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        .items-table th {
            background-color: #f3f4f6;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #d1d5db;
            font-size: 10px;
        }
        .items-table td {
            padding: 6px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 10px;
        }
        .text-right {
            text-align: right;
        }
        .totals-section {
            margin-top: 10px;
            text-align: right;
        }
        .total-row {
            padding: 2px 0;
            font-size: 10px;
        }
        .total-label {
            display: inline-block;
            width: 120px;
            font-weight: bold;
        }
        .total-amount {
            display: inline-block;
            width: 100px;
            text-align: right;
        }
        .grand-total {
            font-size: 12px;
            font-weight: bold;
            border-top: 2px solid #333;
            padding-top: 5px;
            margin-top: 5px;
        }
        .transactions-section {
            margin-top: 15px;
        }
        .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 5px;
        }
        .transactions-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .transactions-table th {
            background-color: #f3f4f6;
            padding: 5px;
            text-align: left;
            font-size: 9px;
            border-bottom: 2px solid #d1d5db;
        }
        .transactions-table td {
            padding: 5px;
            font-size: 9px;
            border-bottom: 1px solid #e5e7eb;
            text-align: center;
            font-style: italic;
            color: #999;
        }
        .balance-row {
            text-align: right;
            font-size: 12px;
            font-weight: bold;
            margin-top: 5px;
        }
        .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 8px;
            color: #666;
        }
    </style>
</head>
<body>
    <!-- Badge statut -->
    <div class='status-badge'>
        <span>" . ($invoice->is_paid ? 'PAYÉE' : 'NON PAYÉE') . "</span>
    </div>

    <!-- En-tête : Infos entreprise + Facture sur la même ligne -->
    <div class='header-section'>
        <!-- Colonne gauche : Entreprise -->
        <div class='company-info'>
            <img src='" . public_path('images/pixel-logo.png') . "' alt='Logo PixelRise' class='company-logo'>
            <div class='company-name'>{$company['name']}</div>
            <div class='company-address'>
                {$company['address']}<br>
                {$company['city']}, {$company['postal_code']}<br>
                {$company['country']}<br>
                <strong>RCS:</strong> {$company['rcs']}<br>
                <strong>NIF:</strong> {$company['nif']}<br>
                {$company['stat']}
            </div>
        </div>
        
        <!-- Colonne droite : Facture -->
        <div class='invoice-header'>
            <div class='invoice-title'>Facture proforma #{$invoiceDetails['number']}</div>
            <div class='invoice-dates'>
                <strong>Date de facturation:</strong> {$invoiceDetails['date']}<br>
                <strong>Date d'échéance:</strong> " . ($invoiceDetails['due_date'] ?: $invoiceDetails['date']) . "
            </div>
        </div>
    </div>

    <!-- Facturé à -->
    <div class='billed-to'>
        <div class='billed-to-title'>Facturé à</div>
        <strong>{$customer['name']}</strong><br>
        {$customer['email']}
    </div>

    <!-- Articles -->
    <table class='items-table'>
        <thead>
            <tr>
                <th>Descriptif</th>
                <th class='text-right' style='width: 150px;'>Total</th>
            </tr>
        </thead>
        <tbody>";
        
        foreach ($items as $item) {
            $description = htmlspecialchars($item['description']);
            if ($invoice->billing_period) {
                $period = $invoice->billing_period === 'monthly' ? 'Mensuel' : 'Annuel';
                $description .= " {$period} ({$startDate} - {$endDate})";
            }
            
            $html .= "
            <tr>
                <td>{$description}</td>
                <td class='text-right'>" . number_format($item['total_price'], 2, ',', ' ') . " {$amounts['currency']}</td>
            </tr>";
        }
        
        $html .= "
        </tbody>
    </table>

    <!-- Totaux -->
    <div class='totals-section'>
        <div class='total-row'>
            <span class='total-label'>Sous-total</span>
            <span class='total-amount'>" . number_format($amounts['total'], 2, ',', ' ') . " {$amounts['currency']}</span>
        </div>
        <div class='total-row'>
            <span class='total-label'>Crédit</span>
            <span class='total-amount'>0,00 {$amounts['currency']}</span>
        </div>
        <div class='total-row grand-total'>
            <span class='total-label'>Total</span>
            <span class='total-amount'>" . number_format($amounts['total'], 2, ',', ' ') . " {$amounts['currency']}</span>
        </div>
    </div>

    <!-- Transactions -->
    <div class='transactions-section'>
        <div class='section-title'>Transactions</div>
        <table class='transactions-table'>
            <thead>
                <tr>
                    <th>Date de la transaction</th>
                    <th>Passerelle</th>
                    <th>Transaction #</th>
                    <th>Montant</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan='4'>Aucune transaction trouvée</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Solde -->
    <div class='balance-row'>
        <span class='total-label'>Solde</span>
        <span class='total-amount'>" . number_format($amounts['total'], 2, ',', ' ') . " {$amounts['currency']}</span>
    </div>

    <!-- Lien de soumission (en bas de page) -->
    <div style='background-color: #dbeafe; padding: 8px; margin: 15px 0 10px 0; border: 1px solid #3b82f6; border-radius: 4px;'>
        <div style='font-weight: bold; font-size: 9px; margin-bottom: 3px; color: #1e40af; text-align: center;'>
            📤 Soumettre votre preuve de paiement
        </div>
        <div style='font-size: 7px; color: #0c5460; margin-bottom: 5px; text-align: center; line-height: 1.3;'>
            ⚠️ <strong>IMPORTANT :</strong> Joignez cette facture + le reçu de l'opérateur (Orange Money, Mvola, etc.)
        </div>
        <div style='text-align: center; margin: 5px 0;'>
            <a href='" . config('app.frontend_url', 'http://localhost:8080') . "/features/invoice/{$invoice->id}?invoice_number={$invoiceDetails['number']}' 
               target='_self'
               style='display: inline-block; background-color: #3b82f6; color: white; padding: 5px 12px; text-decoration: none; border-radius: 3px; font-weight: bold; font-size: 9px;'>
                🔗 Cliquez ici pour envoyer la preuve
            </a>
        </div>
        <div style='font-size: 6px; color: #1e40af; margin-top: 3px; text-align: center;'>
            Ou copiez : " . config('app.frontend_url', 'http://localhost:8080') . "/features/invoice/{$invoice->id}?invoice_number={$invoiceDetails['number']}
        </div>
        <div style='font-size: 6px; color: #0c5460; margin-top: 4px; padding-top: 4px; border-top: 1px solid #bfdbfe; text-align: center; line-height: 1.2;'>
            <strong>Étapes :</strong> 1) Téléchargez cette facture 2) Effectuez le paiement 3) Conservez le reçu de l'opérateur 4) Cliquez sur le lien ci-dessus pour soumettre les 2 documents
        </div>
    </div>

    <!-- Footer -->
    <div class='footer'>
        <p>PDF généré le " . now()->format('d/m/Y') . "</p>
        <p>Powered by {$company['name']}</p>
    </div>
</body>
</html>";
        
        return $html;
    }
}
