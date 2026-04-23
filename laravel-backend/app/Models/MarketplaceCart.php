<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketplaceCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'session_id',
        'product_id',
        'quantity',
        'price_snapshot',
        'product_snapshot'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price_snapshot' => 'decimal:2',
        'product_snapshot' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(MarketplaceProduct::class, 'product_id');
    }
}
