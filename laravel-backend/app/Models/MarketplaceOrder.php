<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketplaceOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'shipping_address',
        'billing_address',
        'subtotal',
        'tax',
        'shipping_cost',
        'discount',
        'total',
        'status',
        'payment_status',
        'payment_method',
        'payment_proof',
        'payment_date',
        'customer_notes',
        'admin_notes'
    ];

    protected $casts = [
        'shipping_address' => 'array',
        'billing_address' => 'array',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'payment_date' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(MarketplaceOrderItem::class, 'order_id');
    }

    public function products()
    {
        return $this->hasManyThrough(
            MarketplaceProduct::class,
            MarketplaceOrderItem::class,
            'order_id',
            'id',
            'id',
            'product_id'
        );
    }

    public function calculateTotal()
    {
        $this->total = $this->subtotal + $this->tax + $this->shipping_cost - $this->discount;
        return $this->total;
    }

    public static function generateOrderNumber()
    {
        $year = date('Y');
        $lastOrder = self::whereYear('created_at', $year)->orderBy('id', 'desc')->first();
        $number = $lastOrder ? intval(substr($lastOrder->order_number, -5)) + 1 : 1;
        return 'MKT-' . $year . '-' . str_pad($number, 5, '0', STR_PAD_LEFT);
    }
}
