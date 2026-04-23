<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    protected $table = 'purchase_orders';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'source',
        'source_item_id',
        'site_name',
        'item_name',
        'item_description',
        'item_thumbnail',
        'total_eur',
        'total_ariary',
        'status',
        'payment_method',
        'payment_proof_url',
        'full_name',
        'email',
        'contact_number',
        'user_message',
        'payment_proofs',
        'amount_claimed',
        'admin_note',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'total_eur' => 'decimal:2',
        'total_ariary' => 'integer',
        'payment_proofs' => 'array',
        'confirmed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function confirmedByAdmin()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaymentSubmitted($query)
    {
        return $query->where('status', 'payment_submitted');
    }

    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }
}
