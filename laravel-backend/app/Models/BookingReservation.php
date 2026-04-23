<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingReservation extends Model
{
    protected $fillable = [
        'product_id', 'site_id',
        'client_name', 'client_email', 'client_phone', 'client_country',
        'start_date', 'end_date', 'status',
        'adults', 'children', 'notes', 'price_override', 'history', 'linked_product_id',
    ];

    protected $casts = [
        'history' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'price_override' => 'float',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'product_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function linkedProduct(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'linked_product_id');
    }

    public function addHistory(string $action, string $by): void
    {
        $history = $this->history ?? [];
        $history[] = [
            'action' => $action,
            'date' => now()->toIso8601String(),
            'by' => $by,
        ];
        $this->history = $history;
    }
}
