<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketplaceBadge extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'badge_type',
        'badge_text',
        'badge_color',
        'discount_percentage',
        'is_active',
        'start_date',
        'end_date'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'discount_percentage' => 'integer',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(MarketplaceProduct::class, 'product_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('badge_type', $type);
    }
}
