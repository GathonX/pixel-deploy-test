<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingProductImage extends Model
{
    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = ['product_id', 'url', 'position'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(BookingProduct::class, 'product_id');
    }
}
