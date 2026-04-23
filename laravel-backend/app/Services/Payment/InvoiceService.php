<?php
// laravel-backend/app/Services/Payment/InvoiceService.php
// ✅ SERVICE : Gestion centralisée des factures
// ✅ COMPATIBLE : Avec votre système de facturation frontend

namespace App\Services\Payment;

use App\Models\PaymentInvoice;
use App\Models\PaymentTransaction;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class InvoiceService
{
    /**
     * ✅ MÉTHODES - GÉNÉRATION DE FACTURES
     */

    /**
     * Générer une facture à partir d'une transaction
     */
    public function generateInvoiceFromTransaction(PaymentTransaction $transaction): PaymentInvoice
    {
        if (!$transaction->isCompleted()) {
            throw new Exception('Impossible de générer une facture pour une transaction non complétée');
        }

        try {
            // Créer la facture
            $invoice = PaymentInvoice::createFromTransaction($transaction);

            // Générer le PDF
            $this->generatePDF($invoice);

            Log::info('Invoice generated from transaction', [
                'invoice_id' => $invoice->id,
                'transaction_id' => $transaction->id,
                'user_id' => $transaction->user_id,
                'invoice_number' => $invoice->invoice_number,
                'amount' => $invoice->total_amount,
            ]);

            return $invoice;

        } catch (Exception $e) {
            Log::error('Invoice generation failed', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Générer le PDF d'une facture
     * 🔧 CORRECTION : Utilisation de template HTML simple au lieu de Blade
     */
    public function generatePDF(PaymentInvoice $invoice): string
    {
        try {
            // Préparer les données pour le template
            $data = $this->preparePDFData($invoice);

            // ✅ CORRECTION : Générer HTML simple au lieu d'utiliser un template Blade
            $html = $this->generateInvoiceHTML($data);

            // Générer le PDF avec DomPDF
            $pdf = Pdf::loadHTML($html);
            $pdf->setPaper('A4', 'portrait');

            // Générer le contenu PDF
            $pdfContent = $pdf->output();
            
            // Définir le chemin de stockage
            $filename = "invoice-{$invoice->invoice_number}.pdf";
            $invoiceYear = $invoice->invoice_date ? $invoice->invoice_date->year : date('Y');
            $path = "invoices/{$invoiceYear}/{$filename}";

            // Créer le répertoire s'il n'existe pas
            $directory = dirname($path);
            if (!Storage::exists($directory)) {
                Storage::makeDirectory($directory);
            }

            // Sauvegarder le fichier
            Storage::put($path, $pdfContent);

            // Calculer le hash pour l'intégrité
            $hash = hash('sha256', $pdfContent);

            // Mettre à jour la facture avec les informations du fichier
            $invoice->update([
                'pdf_path' => $path,
                'pdf_file_size' => strlen($pdfContent),
                'pdf_hash' => $hash,
                'pdf_generated_at' => now(),
            ]);

            Log::info('Invoice PDF generated', [
                'invoice_id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'file_path' => $path,
                'file_size' => strlen($pdfContent),
                'hash' => $hash,
            ]);

            return $path;

        } catch (Exception $e) {
            Log::error('PDF generation failed', [
                'invoice_id' => $invoice->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Générer le HTML de la facture
     * 🔧 CORRECTION : Template HTML intégré pour éviter les erreurs de fichier manquant
     */
    private function generateInvoiceHTML(array $data): string
    {
        $invoice = $data['invoice'];
        $company = $data['company'];
        $customer = $data['customer'];
        $amounts = $data['amounts'];
        $items = $data['items'];
        $payment = $data['payment'];
        $invoiceDetails = $data['invoice_details'];

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>Facture {$invoiceDetails['number']}</title>
            <style>
                body { 
                    font-family: 'Arial', sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    color: #333; 
                    line-height: 1.4;
                    font-size: 11px;
                }
                .header { 
                    margin-bottom: 15px; 
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 15px;
                }
                .header-flex {
                    display: table;
                    width: 100%;
                }
                .header-left {
                    display: table-cell;
                    width: 30%;
                    vertical-align: top;
                }
                .header-right {
                    display: table-cell;
                    width: 70%;
                    vertical-align: top;
                    text-align: center;
                }
                .company-name { 
                    font-size: 20px; 
                    font-weight: bold; 
                    color: #007bff; 
                    margin-bottom: 3px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    border-radius: 5px;
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .status-unpaid {
                    background-color: #fee;
                    color: #c00;
                    border: 2px solid #c00;
                }
                .status-paid {
                    background-color: #efe;
                    color: #0a0;
                    border: 2px solid #0a0;
                }
                .invoice-info {
                    margin-bottom: 10px;
                }
                .info-table {
                    width: 100%;
                    margin-bottom: 10px;
                }
                .info-table td {
                    padding: 3px 8px;
                    vertical-align: top;
                }
                .info-label {
                    font-weight: bold;
                    width: 35%;
                }
                .section-title {
                    color: #007bff;
                    font-size: 13px;
                    font-weight: bold;
                    border-bottom: 1px solid #007bff;
                    padding-bottom: 3px;
                    margin: 10px 0 5px 0;
                }
                .payment-reference {
                    background-color: #fff3cd;
                    padding: 5px 8px;
                    border-radius: 3px;
                    border-left: 3px solid #ffc107;
                    margin-top: 5px;
                    font-size: 11px;
                }
                .payment-reference strong {
                    color: #007bff;
                    font-size: 12px;
                }
                .items-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 10px;
                    border: 1px solid #007bff;
                    font-size: 10px;
                }
                .items-table th, .items-table td { 
                    padding: 6px 8px; 
                    text-align: left; 
                    border-bottom: 1px solid #ddd;
                }
                .items-table th { 
                    background-color: #007bff; 
                    color: white;
                    font-weight: bold;
                    font-size: 11px;
                }
                .items-table tbody tr {
                    background-color: #f8f9fa;
                }
                .totals { 
                    text-align: right; 
                    margin-top: 10px;
                    padding: 8px;
                    font-size: 11px;
                }
                .total-line { 
                    margin: 3px 0; 
                    padding: 2px 0;
                }
                .final-total { 
                    font-weight: bold; 
                    font-size: 13px; 
                    color: #007bff;
                    border-top: 2px solid #007bff;
                    padding-top: 5px;
                    margin-top: 5px;
                }
                .balance-due {
                    font-weight: bold;
                    font-size: 13px;
                    color: #c00;
                    border-top: 1px solid #c00;
                    padding-top: 5px;
                    margin-top: 3px;
                }
                .payment-info {
                    margin-top: 10px;
                    background-color: #fee;
                    padding: 8px;
                    border-radius: 3px;
                    border-left: 3px solid #c00;
                    font-size: 10px;
                }
                .payment-instructions {
                    background-color: white;
                    padding: 6px;
                    border-radius: 3px;
                    margin-top: 5px;
                    border: 1px solid #fcc;
                }
                .payment-instructions ol {
                    margin-left: 15px;
                    margin-top: 3px;
                    margin-bottom: 3px;
                }
                .payment-instructions li {
                    margin-bottom: 2px;
                    line-height: 1.3;
                    font-size: 9px;
                }
                .footer {
                    margin-top: 15px;
                    text-align: center;
                    font-size: 9px;
                    color: #666;
                    border-top: 1px solid #eee;
                    padding-top: 8px;
                }
                .amount { font-weight: bold; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <!-- En-tête : Logo + Instructions -->
            <div class='header'>
                <div class='header-flex'>
                    <div class='header-left'>
                        <div class='company-name'>{$company['name']}</div>
                    </div>
                    <div class='header-right'>
                        <span class='status-badge " . ($invoice->status === 'paid' ? 'status-paid' : 'status-unpaid') . "'>
                            " . ($invoice->status === 'paid' ? 'PAYÉE' : 'NON PAYÉE') . "
                        </span>
                        <p style='margin: 3px 0; font-size: 10px;'><strong>Date d'échéance :</strong> " . ($invoiceDetails['due_date'] ?: 'N/A') . "</p>
                        <p style='margin: 3px 0; font-size: 9px;'>Suivez les instructions ci-dessous pour effectuer votre paiement :</p>
                        <ol style='font-size: 8px; text-align: left; margin: 3px 0 3px 20px; padding: 0;'>
                            <li>Choisissez votre période de facturation (Mensuelle ou Annuelle)</li>
                            <li>Choisissez votre mode de paiement préféré</li>
                            <li><strong>Téléchargez cette facture (OBLIGATOIRE)</strong></li>
                            <li>Effectuez le paiement en dehors de l'application</li>
                            <li><strong>Cliquez sur le lien ci-dessous pour soumettre la preuve</strong></li>
                        </ol>
                        <div class='payment-reference'>
                            <strong>Référence pour le paiement :</strong> {$payment['reference']}
                        </div>
                        <div style='background-color: #d1ecf1; padding: 8px; border-radius: 5px; margin-top: 8px; border: 2px solid #0c5460; text-align: center;'>
                            <p style='margin: 0 0 5px 0; font-size: 10px; font-weight: bold; color: #0c5460;'>📤 Soumettre votre preuve de paiement :</p>
                            <a href='" . config('app.frontend_url') . "/features/purchase/{$invoice->feature_id}?invoice={$invoiceDetails['number']}' 
                               style='display: inline-block; background-color: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 11px;'>
                                🔗 Cliquez ici pour envoyer la preuve
                            </a>
                            <p style='margin: 5px 0 0 0; font-size: 8px; color: #0c5460;'>Ou copiez ce lien : " . config('app.frontend_url') . "/features/purchase/{$invoice->feature_id}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Titre facture -->
            <h2 style='margin: 10px 0 5px 0; font-size: 16px;'>Facture proforma #{$invoiceDetails['number']}</h2>
            
            <!-- Détails facture et client -->
            <table class='info-table'>
                <tr>
                    <td class='info-label'>Numéro :</td>
                    <td>{$invoiceDetails['number']}</td>
                    <td class='info-label'>Client :</td>
                    <td><strong>{$customer['name']}</strong></td>
                </tr>
                <tr>
                    <td class='info-label'>Date d'émission :</td>
                    <td>{$invoiceDetails['date']}</td>
                    <td class='info-label'>Email :</td>
                    <td>{$customer['email']}</td>
                </tr>
                <tr>
                    <td class='info-label'>Type :</td>
                    <td>Facture proforma</td>
                    <td colspan='2'></td>
                </tr>
            </table>
            
            <!-- Articles de la facture -->
            <div class='section-title'>Articles de la facture</div>
            <table class='items-table'>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantité</th>
                        <th class='text-right'>Prix unitaire</th>
                        <th class='text-right'>Total</th>
                    </tr>
                </thead>
                <tbody>";

        // Ajouter les articles
        if (is_array($items) && count($items) > 0) {
            foreach ($items as $item) {
                $html .= "
                    <tr>
                        <td>" . htmlspecialchars($item['description'] ?? 'Article') . "</td>
                        <td>" . ($item['quantity'] ?? 1) . "</td>
                        <td class='text-right'>" . number_format($item['unit_price'] ?? 0, 2) . "€</td>
                        <td class='text-right amount'>" . number_format($item['total_price'] ?? 0, 2) . "€</td>
                    </tr>";
            }
        } else {
            // Fallback si pas d'items formatés
            $html .= "
                <tr>
                    <td>Transaction PixelRise AI</td>
                    <td>1</td>
                    <td class='text-right'>" . number_format($amounts['subtotal'], 2) . "€</td>
                    <td class='text-right amount'>" . number_format($amounts['subtotal'], 2) . "€</td>
                </tr>";
        }

        $html .= "
                </tbody>
            </table>
            
            <!-- Totaux -->
            <div class='totals'>
                <div class='total-line final-total'>Total: <span class='amount'>" . number_format($amounts['total'], 2) . " {$amounts['currency']}</span></div>
                " . ($invoice->status !== 'paid' ? "
                <div class='total-line balance-due'>Solde dû: <span class='amount'>" . number_format($amounts['total'], 2) . " {$amounts['currency']}</span></div>
                " : "") . "
            </div>
            
            <!-- Footer -->
            <div class='footer'>
                <p>Merci pour votre confiance !</p>
                <p>{$company['name']} - {$company['email']} - {$company['website']}</p>
                <p>Facture générée automatiquement le " . now()->format('d/m/Y à H:i') . "</p>
            </div>
        </body>
        </html>";

        return $html;
    }

    /**
     * Préparer les données pour le template PDF
     * 🔧 CORRECTION : Utilisation des vraies données utilisateur
     */
    private function preparePDFData(PaymentInvoice $invoice): array
    {
        // ✅ CORRECTION : Récupérer les vraies données utilisateur
        $user = User::find($invoice->user_id);
        $transaction = $invoice->paymentTransaction;

        return [
            'invoice' => $invoice,
            'company' => [
                'name' => 'PixelRise AI',
                'address' => '123 Innovation Street',
                'city' => 'Paris, 75001',
                'country' => 'France',
                'email' => 'contact@pixelrise.ai',
                'website' => 'https://pixelrise.ai',
                'logo_url' => asset('images/logo.png'),
                'siret' => '12345678901234', // À remplacer par vos vraies infos
                'tva_number' => 'FR12345678901',
            ],
            'customer' => [
                // ✅ CORRECTION : Utiliser les vraies données utilisateur
                'name' => $user ? "{$user->first_name} {$user->last_name}" : $invoice->customer_name,
                'email' => $user ? $user->email : $invoice->customer_email,
                'address' => $invoice->customer_address,
                'company' => $invoice->customer_company,
                'vat_number' => $invoice->customer_vat_number,
            ],
            'invoice_details' => [
                'number' => $invoice->invoice_number,
                'date' => $invoice->invoice_date ? $invoice->invoice_date->format('d/m/Y') : now()->format('d/m/Y'),
                'due_date' => $invoice->due_date ? $invoice->due_date->format('d/m/Y') : null,
                'type' => $invoice->invoice_type ?: 'Achat de crédits',
                'description' => $invoice->invoice_description ?: 'Transaction PixelRise AI',
            ],
            'amounts' => [
                'subtotal' => $invoice->subtotal,
                'tax_rate' => $invoice->tax_rate ?: 20,
                'tax_amount' => $invoice->tax_amount,
                'total' => $invoice->total_amount,
                'currency' => $invoice->currency ?: 'EUR',
            ],
            'items' => $this->formatInvoiceItems($invoice),
            'payment' => [
                'method' => $invoice->payment_method ?: 'PayPal',
                'reference' => $transaction ? $transaction->paypal_order_id : $invoice->payment_reference,
                'paid_at' => $invoice->paid_at ? $invoice->paid_at->format('d/m/Y à H:i') : null,
            ],
            'generated_at' => now()->format('d/m/Y à H:i'),
        ];
    }

    /**
     * Formater les articles de la facture
     * 🔧 CORRECTION : Gestion robuste des articles
     */
    private function formatInvoiceItems(PaymentInvoice $invoice): array
    {
        $items = [];
        
        // Si les items sont déjà formatés dans la base
        if ($invoice->invoice_items && is_array($invoice->invoice_items)) {
            return $invoice->invoice_items;
        }

        // Sinon, créer un item basique depuis la transaction
        $transaction = $invoice->paymentTransaction;
        if ($transaction) {
            $metadata = $transaction->metadata;
            
            $items[] = [
                'description' => $metadata['package_name'] ?? 'Transaction PixelRise AI',
                'quantity' => 1,
                'unit_price' => $invoice->subtotal,
                'total_price' => $invoice->subtotal,
                'details' => $metadata['credits'] ? "{$metadata['credits']} crédits" : null,
            ];
        } else {
            // Fallback si pas de transaction
            $items[] = [
                'description' => 'Transaction PixelRise AI',
                'quantity' => 1,
                'unit_price' => $invoice->subtotal,
                'total_price' => $invoice->subtotal,
            ];
        }

        return $items;
    }

    /**
     * ✅ MÉTHODES - ENVOI DE FACTURES
     */

    /**
     * Envoyer une facture par email
     */
    public function sendInvoiceByEmail(PaymentInvoice $invoice, bool $forceRegenerate = false): bool
    {
        try {
            // Vérifier que le PDF existe ou le générer
            if (!$invoice->pdf_path || $forceRegenerate) {
                $this->generatePDF($invoice);
            }

            // Préparer les données de l'email
            $emailData = [
                'invoice' => $invoice,
                'customer_name' => $invoice->customer_name,
                'invoice_number' => $invoice->invoice_number,
                'total_amount' => $invoice->total_amount,
                'currency' => $invoice->currency,
                'download_url' => route('api.invoices.download', ['invoice' => $invoice->id]),
            ];

            // Envoyer l'email avec la facture en pièce jointe
            Mail::send('emails.invoice', $emailData, function ($message) use ($invoice) {
                $message->to($invoice->customer_email, $invoice->customer_name)
                       ->subject("Votre facture {$invoice->invoice_number} - PixelRise AI");
                
                // Ajouter la facture en pièce jointe
                if ($invoice->pdf_path && Storage::exists($invoice->pdf_path)) {
                    $message->attach(storage_path('app/' . $invoice->pdf_path), [
                        'as' => "facture-{$invoice->invoice_number}.pdf",
                        'mime' => 'application/pdf',
                    ]);
                }
            });

            // Marquer comme envoyée
            $invoice->update(['email_sent_at' => now()]);

            Log::info('Invoice sent by email', [
                'invoice_id' => $invoice->id,
                'customer_email' => $invoice->customer_email,
                'invoice_number' => $invoice->invoice_number,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Invoice email sending failed', [
                'invoice_id' => $invoice->id,
                'customer_email' => $invoice->customer_email,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Envoyer les factures en lot
     */
    public function sendInvoicesBatch(array $invoiceIds): array
    {
        $results = [
            'sent' => [],
            'failed' => [],
        ];

        foreach ($invoiceIds as $invoiceId) {
            try {
                $invoice = PaymentInvoice::findOrFail($invoiceId);
                $this->sendInvoiceByEmail($invoice);
                $results['sent'][] = $invoiceId;
            } catch (Exception $e) {
                $results['failed'][] = [
                    'invoice_id' => $invoiceId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        Log::info('Batch invoice sending completed', [
            'total_processed' => count($invoiceIds),
            'sent_count' => count($results['sent']),
            'failed_count' => count($results['failed']),
        ]);

        return $results;
    }

    /**
     * ✅ MÉTHODES - GESTION DES TÉLÉCHARGEMENTS
     */

    /**
     * Obtenir le contenu PDF d'une facture pour téléchargement
     */
    public function getInvoicePDFContent(PaymentInvoice $invoice): array
    {
        if (!$invoice->pdf_path || !Storage::exists($invoice->pdf_path)) {
            $this->generatePDF($invoice);
        }

        // Enregistrer le téléchargement
        $invoice->increment('download_count');

        $content = Storage::get($invoice->pdf_path);
        $filename = "facture-{$invoice->invoice_number}.pdf";

        Log::info('Invoice PDF downloaded', [
            'invoice_id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'download_count' => $invoice->download_count + 1,
        ]);

        return [
            'content' => $content,
            'filename' => $filename,
            'mime_type' => 'application/pdf',
            'size' => strlen($content),
        ];
    }

    /**
     * ✅ MÉTHODES - STATISTIQUES ET GESTION
     */

    /**
     * Obtenir l'historique des factures d'un utilisateur
     */
    public function getUserInvoiceHistory(int $userId, int $limit = 20): array
    {
        return PaymentInvoice::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Obtenir les statistiques de facturation
     */
    public function getInvoiceStats(): array
    {
        $totalInvoices = PaymentInvoice::count();
        $paidInvoices = PaymentInvoice::where('status', 'paid')->count();

        return [
            'total_invoices' => $totalInvoices,
            'paid_invoices' => $paidInvoices,
            'draft_invoices' => PaymentInvoice::where('status', 'draft')->count(),
            'sent_invoices' => PaymentInvoice::where('status', 'sent')->count(),
            'cancelled_invoices' => PaymentInvoice::where('status', 'cancelled')->count(),
            'refunded_invoices' => PaymentInvoice::where('status', 'refunded')->count(),
            'payment_rate' => $totalInvoices > 0 ? round(($paidInvoices / $totalInvoices) * 100, 1) : 0,
            'total_revenue' => PaymentInvoice::where('status', 'paid')->sum('total_amount'),
        ];
    }

    /**
     * ✅ MÉTHODES - ACTIONS ADMINISTRATIVES
     */

    /**
     * Marquer une facture comme payée manuellement
     */
    public function markInvoiceAsPaid(int $invoiceId, Carbon $paidAt = null, string $paymentMethod = null, string $paymentReference = null, string $adminNotes = null): bool
    {
        $invoice = PaymentInvoice::findOrFail($invoiceId);

        if ($invoice->status === 'paid') {
            throw new Exception('Cette facture est déjà marquée comme payée');
        }

        try {
            $updateData = [
                'status' => 'paid',
                'paid_at' => $paidAt ?: now(),
            ];

            if ($paymentMethod) {
                $updateData['payment_method'] = $paymentMethod;
            }

            if ($paymentReference) {
                $updateData['payment_reference'] = $paymentReference;
            }

            if ($adminNotes) {
                $updateData['admin_notes'] = $adminNotes;
            }

            $invoice->update($updateData);

            Log::info('Invoice manually marked as paid', [
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoice->invoice_number,
                'paid_at' => $paidAt ? $paidAt->toDateString() : now()->toDateString(),
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Manual invoice payment marking failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Annuler une facture
     */
    public function cancelInvoice(int $invoiceId, string $reason = null): bool
    {
        $invoice = PaymentInvoice::findOrFail($invoiceId);

        if ($invoice->status === 'paid') {
            throw new Exception('Impossible d\'annuler une facture déjà payée');
        }

        try {
            $updateData = ['status' => 'cancelled'];

            if ($reason) {
                $updateData['admin_notes'] = $reason;
            }

            $invoice->update($updateData);

            Log::info('Invoice cancelled', [
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoice->invoice_number,
                'reason' => $reason,
            ]);

            return true;

        } catch (Exception $e) {
            Log::error('Invoice cancellation failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Régénérer le PDF d'une facture
     */
    public function regenerateInvoicePDF(int $invoiceId): string
    {
        $invoice = PaymentInvoice::findOrFail($invoiceId);

        try {
            // Supprimer l'ancien PDF s'il existe
            if ($invoice->pdf_path && Storage::exists($invoice->pdf_path)) {
                Storage::delete($invoice->pdf_path);
            }

            // Générer le nouveau PDF
            $newPath = $this->generatePDF($invoice);

            Log::info('Invoice PDF regenerated', [
                'invoice_id' => $invoiceId,
                'invoice_number' => $invoice->invoice_number,
                'new_path' => $newPath,
            ]);

            return $newPath;

        } catch (Exception $e) {
            Log::error('PDF regeneration failed', [
                'invoice_id' => $invoiceId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Nettoyer les anciens fichiers PDF
     */
    public function cleanupOldPDFs(int $daysOld = 365): int
    {
        $deletedCount = 0;
        $cutoffDate = now()->subDays($daysOld);

        $oldInvoices = PaymentInvoice::where('created_at', '<', $cutoffDate)
            ->whereNotNull('pdf_path')
            ->get();

        foreach ($oldInvoices as $invoice) {
            try {
                if (Storage::exists($invoice->pdf_path)) {
                    Storage::delete($invoice->pdf_path);
                    $invoice->update([
                        'pdf_path' => null,
                        'pdf_file_size' => null,
                        'pdf_hash' => null,
                    ]);
                    $deletedCount++;
                }
            } catch (Exception $e) {
                Log::warning('Failed to delete old PDF', [
                    'invoice_id' => $invoice->id,
                    'pdf_path' => $invoice->pdf_path,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($deletedCount > 0) {
            Log::info('Old invoice PDFs cleaned up', [
                'deleted_count' => $deletedCount,
                'cutoff_date' => $cutoffDate->toDateString(),
            ]);
        }

        return $deletedCount;
    }
}