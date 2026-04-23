<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingSupplierPrice extends Model
{
    protected $fillable = ['supplier_id', 'product_id', 'cost_price'];

    protected $casts = ['cost_price' => 'float'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(BookingSupplier::class, 'supplier_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'product_id');
    }
}
