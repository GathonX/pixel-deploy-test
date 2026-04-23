<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use App\Traits\ProtectedFileFields;

class Invoice extends Model
{
    use HasFactory, ProtectedFileFields;

    protected $fillable = [
        'user_id',
        'feature_id',
        'feature_activation_request_id',
        'invoice_number',
        'amount',
        'currency',
        'status',
        'billing_period',
        'due_date',
        'pdf_path',
        'is_paid',
        'payment_date',
        'metadata',
        'payment_reference',
        'payment_method',
        'payment_instructions',
    ];

    /**
     * Champs de fichiers protégés contre la corruption lors des mises à jour en masse
     */
    protected array $protectedFileFields = [
        'pdf_path',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'datetime',
        'payment_date' => 'datetime',
        'is_paid' => 'boolean',
        'metadata' => 'array',
        'payment_method' => 'string',
        'payment_instructions' => 'array'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(Feature::class);
    }

    public function featureActivationRequest(): BelongsTo
    {
        return $this->belongsTo(FeatureActivationRequest::class);
    }

    // Générer un numéro de facture unique
    public static function generateInvoiceNumber(): string
    {
        return 'INV-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }

    // Ajouter une méthode pour générer la référence de paiement
    public static function generatePaymentReference(): string
    {
        return strtoupper(substr(md5(uniqid() . time()), 0, 6));
    }

    // Méthode pour obtenir les modes de paiement disponibles
    public static function getAvailablePaymentMethods(): array
    {
        return [
            'orange_money' => 'Orange Money',
            'bank_transfer' => 'Virement bancaire',
            'airtel_money' => 'Airtel Money',
            'mvola' => 'Mvola',
            'taptap_send' => 'TapTap send',
            'other' => 'Autre'
        ];
    }

    // Méthode pour générer les instructions de paiement
    public function generatePaymentInstructions(): array
    {
        $instructions = [
            'status' => 'NON PAYÉE',
            'due_date' => $this->due_date->format('d/m/Y'),
            'payment_reference' => $this->payment_reference,
            'payment_methods' => self::getAvailablePaymentMethods(),
            'next_step_url' => config('app.frontend_url') . "/features/purchase/{$this->feature_id}"
        ];

        return $instructions;
    }

    // Méthodes de statut
    public function markAsPaid(): bool
    {
        return $this->update([
            'is_paid' => true,
            'payment_date' => now(),
            'status' => 'paid'
        ]);
    }

    public function scopePending($query)
    {
        return $query->where('is_paid', false);
    }

    public function scopePaid($query)
    {
        return $query->where('is_paid', true);
    }

    // Méthode pour obtenir les détails complets de la facture
    public function getFullDetailsAttribute(): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status,
            'billing_period' => $this->billing_period,
            'due_date' => $this->due_date ? $this->due_date->format('d/m/Y') : null,
            'payment_date' => $this->payment_date ? $this->payment_date->format('d/m/Y') : null,
            'is_paid' => $this->is_paid,
            'payment_reference' => $this->payment_reference,
            'payment_method' => $this->payment_method,
            'feature' => $this->feature ? [
                'id' => $this->feature->id,
                'name' => $this->feature->name,
                'description' => $this->feature->description,
                'category' => $this->feature->category,
                'pricing' => $this->feature->pricing // Ajoute la tarification !
            ] : null,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email
            ] : null,
            'payment_instructions' => $this->payment_instructions ? json_decode($this->payment_instructions, true) : null,
            'metadata' => $this->metadata,
            'pdf_path' => $this->pdf_path ? Storage::url($this->pdf_path) : null,
            'created_at' => $this->created_at ? $this->created_at->format('d/m/Y H:i:s') : null,
            'updated_at' => $this->updated_at ? $this->updated_at->format('d/m/Y H:i:s') : null
        ];
    }

    // Méthode pour calculer le montant total avec taxes et frais
    public function calculateTotalWithTaxes(): float
    {
        $taxRate = config('app.tax_rate', 0.20); // 20% par défaut
        $additionalFees = config('app.invoice_additional_fees', 0);

        $baseAmount = $this->amount;
        $taxAmount = $baseAmount * $taxRate;
        $totalAmount = $baseAmount + $taxAmount + $additionalFees;

        return round($totalAmount, 2);
    }

    // Méthode pour générer un résumé détaillé de la facture
    public function generateDetailedSummary(): array
    {
        return [
            'base_amount' => $this->amount,
            'tax_rate' => config('app.tax_rate', 0.20) * 100 . '%',
            'tax_amount' => $this->calculateTotalWithTaxes() - $this->amount,
            'total_amount' => $this->calculateTotalWithTaxes(),
            'payment_methods' => self::getAvailablePaymentMethods(),
            'status_details' => [
                'current_status' => $this->status,
                'is_paid' => $this->is_paid,
                'due_date' => $this->due_date ? $this->due_date->format('d/m/Y') : null,
                'payment_date' => $this->payment_date ? $this->payment_date->format('d/m/Y') : null
            ]
        ];
    }

    // Méthode pour vérifier si la facture est en retard
    public function isOverdue(): bool
    {
        return !$this->is_paid && $this->due_date && $this->due_date->isPast();
    }

    // Méthode pour générer une facture avec une période de facturation sélectionnable
    public static function generateInvoiceWithBillingPeriod(
        int $activationRequestId, 
        string $billingPeriod = 'monthly'
    ): self {
        $activationRequest = FeatureActivationRequest::findOrFail($activationRequestId);
        $feature = Feature::findOrFail($activationRequest->feature_id);
        
        // Valider la période de facturation
        if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
            $billingPeriod = 'monthly'; // Valeur par défaut
        }

        // Calculer le prix en fonction de la période
        $pricing = $feature->pricing ?? [];
        $amount = $billingPeriod === 'yearly' 
            ? ($pricing['yearly']['price'] ?? $activationRequest->amount_claimed)
            : ($pricing['monthly']['price'] ?? $activationRequest->amount_claimed);

        // Calculer la date d'échéance en fonction de la période
        $dueDate = $billingPeriod === 'yearly' 
            ? now()->addMonths(12) 
            : now()->addMonths(1);

        return self::create([
            'user_id' => $activationRequest->user_id,
            'feature_id' => $activationRequest->feature_id,
            'feature_activation_request_id' => $activationRequestId,
            'invoice_number' => self::generateInvoiceNumber(),
            'amount' => $amount,
            'currency' => 'EUR',
            'billing_period' => $billingPeriod,
            'due_date' => $dueDate,
            'status' => 'pending',
            'payment_reference' => self::generatePaymentReference(),
            'payment_instructions' => json_encode([
                'status' => 'NON PAYÉE',
                'due_date' => $dueDate->format('d/m/Y'),
                'payment_reference' => self::generatePaymentReference(),
                'payment_methods' => self::getAvailablePaymentMethods(),
                'next_step_url' => config('app.frontend_url') . "/features/purchase/{$activationRequest->feature_id}"
            ])
        ]);
    }

    // Méthode pour mettre à jour la période de facturation d'une facture existante
    public function updateBillingPeriod(string $billingPeriod): bool
    {
        // Valider la période de facturation
        if (!in_array($billingPeriod, ['monthly', 'yearly'])) {
            return false;
        }

        // Récupérer les informations de tarification de la fonctionnalité
        $feature = $this->feature;
        $pricing = $feature->pricing ?? [];

        // Mettre à jour le montant en fonction de la nouvelle période
        $newAmount = $billingPeriod === 'yearly' 
            ? ($pricing['yearly']['price'] ?? $this->amount)
            : ($pricing['monthly']['price'] ?? $this->amount);

        // Calculer la nouvelle date d'échéance
        $newDueDate = $billingPeriod === 'yearly' 
            ? now()->addMonths(12) 
            : now()->addMonths(1);

        // Mettre à jour la facture
        return $this->update([
            'billing_period' => $billingPeriod,
            'amount' => $newAmount,
            'due_date' => $newDueDate,
            'payment_instructions' => json_encode([
                'status' => 'NON PAYÉE',
                'due_date' => $newDueDate->format('d/m/Y'),
                'payment_reference' => $this->payment_reference,
                'payment_methods' => self::getAvailablePaymentMethods(),
                'next_step_url' => config('app.frontend_url') . "/features/purchase/{$this->feature_id}"
            ])
        ]);
    }
}
