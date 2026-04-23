<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingProductSeason extends Model
{
    protected $fillable = [
        'product_id', 'season', 'price', 'price_child', 'start_month', 'end_month',
    ];

    protected $casts = [
        'price' => 'float',
        'price_child' => 'float',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'product_id');
    }
}
