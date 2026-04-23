<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingExpense extends Model
{
    protected $fillable = [
        'site_id', 'label', 'amount',
        'product_id', 'supplier_id', 'expense_date', 'notes',
    ];

    protected $casts = [
        'amount' => 'float',
        'expense_date' => 'date',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'product_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(BookingSupplier::class, 'supplier_id');
    }
}
