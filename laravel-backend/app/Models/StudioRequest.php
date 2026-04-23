<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StudioRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'domain',
        'client_name',
        'client_email',
        'client_phone',
        'company_name',
        'description',
        'notes',
        'status',
        'rejection_reason',
        'activated_at',
        'rejected_at',
        'processed_by',
    ];

    protected $casts = [
        'activated_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    /**
     * La commande de paiement associée (créée via le système purchases)
     */
    public function purchaseOrder(): HasOne
    {
        return $this->hasOne(\App\Models\PurchaseOrder::class, 'source_item_id', 'id')
            ->where('source', 'studio-domain');
    }

    /**
     * L'utilisateur qui a fait la demande
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * L'admin qui a traité la demande
     */
    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Scope par statut
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope demandes en attente
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope demandes actives
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Marquer comme activé
     */
    public function activate(int $processedBy): void
    {
        $this->update([
            'status' => 'active',
            'activated_at' => now(),
            'processed_by' => $processedBy,
        ]);
    }

    /**
     * Marquer comme rejeté
     */
    public function reject(int $processedBy, string $reason = null): void
    {
        $this->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'rejection_reason' => $reason,
            'processed_by' => $processedBy,
        ]);
    }

    /**
     * Vérifier si la demande est en attente
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Vérifier si la demande est active
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
