<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingInvoice extends Model
{
    protected $table = 'billing_invoices';

    protected $fillable = [
        'workspace_id',
        'site_id',
        'subscription_scope',
        'invoice_number',
        'plan_key',
        'billing_period',
        'amount_ariary',
        'amount_eur',
        'currency',
        'status',
        'payment_method',
        'payment_reference',
        'payment_proof_url',
        'confirmed_by',
        'due_at',
        'paid_at',
    ];

    protected $casts = [
        'due_at'     => 'datetime',
        'paid_at'    => 'datetime',
        'amount_eur' => 'decimal:2',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function isOverdue(): bool
    {
        return $this->status === 'issued'
            && $this->due_at
            && $this->due_at->isPast();
    }

    public static function generateInvoiceNumber(): string
    {
        return 'WS-' . now()->format('Ymd') . '-' . strtoupper(substr(uniqid(), -6));
    }

    public static function generatePaymentReference(): string
    {
        return strtoupper(substr(md5(uniqid() . time()), 0, 8));
    }

    public static function availablePaymentMethods(): array
    {
        return [
            'orange_money'  => 'Orange Money',
            'mvola'         => 'Mvola',
            'airtel_money'  => 'Airtel Money',
            'bank_transfer' => 'Virement bancaire',
            'taptap_send'   => 'TapTap Send',
        ];
    }
}
