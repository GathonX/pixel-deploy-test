<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketplaceOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'product_price',
        'quantity',
        'subtotal',
        'product_snapshot'
    ];

    protected $casts = [
        'product_price' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'quantity' => 'integer',
        'product_snapshot' => 'array',
    ];

    public function order()
    {
        return $this->belongsTo(MarketplaceOrder::class, 'order_id');
    }

    public function product()
    {
        return $this->belongsTo(MarketplaceProduct::class, 'product_id');
    }
}
