<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketplaceInventoryLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'quantity_change',
        'previous_quantity',
        'new_quantity',
        'type',
        'notes',
        'created_by',
        'created_at'
    ];

    protected $casts = [
        'quantity_change' => 'integer',
        'previous_quantity' => 'integer',
        'new_quantity' => 'integer',
        'created_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(MarketplaceProduct::class, 'product_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
