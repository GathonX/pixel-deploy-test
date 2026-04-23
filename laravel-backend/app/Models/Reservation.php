<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Reservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'user_id',
        'name',
        'email',
        'phone',
        'date',
        'time',
        'guests',
        'interest_description',
        'additional_details',
        'type',
        'message',
        'metadata',
        'status',
        'source',
        'ip_address',
        'user_agent',
        'is_partial',
        'completion_token',
        'completed_at',
        'email_was_blocked',
        'is_masked',
    ];

    protected $casts = [
        'metadata' => 'array',
        'date' => 'date',
        'time' => 'datetime:H:i',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'completed_at' => 'datetime',
        'is_partial' => 'boolean',
        'is_masked' => 'boolean',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_CANCELLED = 'cancelled';

    // Source constants
    const SOURCE_IFRAME = 'iframe';
    const SOURCE_API = 'api';
    const SOURCE_MANUAL = 'manual';

    /**
     * Scope pour filtrer par client_id
     */
    public function scopeForClient($query, string $clientId)
    {
        return $query->where('client_id', $clientId);
    }

    /**
     * Scope pour filtrer par statut
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope pour filtrer par date
     */
    public function scopeForDate($query, Carbon $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Accessor pour formater la date complète
     */
    public function getFullDateTimeAttribute(): string
    {
        return $this->date->format('Y-m-d') . ' ' . $this->time->format('H:i');
    }

    /**
     * Accessor pour vérifier si la réservation est dans le futur
     */
    public function getIsFutureAttribute(): bool
    {
        $reservationDateTime = Carbon::parse($this->full_date_time);
        return $reservationDateTime->isFuture();
    }

    /**
     * Marquer comme confirmée
     */
    public function confirm(): bool
    {
        return $this->update(['status' => self::STATUS_CONFIRMED]);
    }

    /**
     * Marquer comme complétée
     */
    public function complete(): bool
    {
        return $this->update([
            'is_partial' => false,
            'completed_at' => now(),
            'completion_token' => null
        ]);
    }

    /**
     * Générer token de completion
     */
    public function generateCompletionToken(): string
    {
        $token = 'complete_' . uniqid() . '_' . $this->id;
        $this->update(['completion_token' => $token]);
        return $token;
    }

    /**
     * Scope pour réservations partielles
     */
    public function scopePartial($query)
    {
        return $query->where('is_partial', true);
    }

    /**
     * Scope pour réservations complètes
     */
    public function scopeComplete($query)
    {
        return $query->where('is_partial', false);
    }
}