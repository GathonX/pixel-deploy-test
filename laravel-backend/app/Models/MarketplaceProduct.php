<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MarketplaceProduct extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'created_by',
        'name',
        'slug',
        'description',
        'short_description',
        'price',
        'original_price',
        'category_id',
        'stock_quantity',
        'sku',
        'images',
        'main_image',
        'is_active',
        'is_featured',
        'metadata'
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'images' => 'array',
        'metadata' => 'array',
    ];

    public function category()
    {
        return $this->belongsTo(MarketplaceCategory::class, 'category_id');
    }

    public function badges()
    {
        return $this->hasMany(MarketplaceBadge::class, 'product_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function inventoryLogs()
    {
        return $this->hasMany(MarketplaceInventoryLog::class, 'product_id');
    }

    public function getDiscountPercentageAttribute()
    {
        if ($this->original_price && $this->original_price > $this->price) {
            return round((($this->original_price - $this->price) / $this->original_price) * 100);
        }
        return null;
    }

    public function getInStockAttribute()
    {
        return $this->stock_quantity > 0;
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function scopeInStock($query)
    {
        return $query->where('stock_quantity', '>', 0);
    }

    public function decrementStock(int $quantity): bool
    {
        if ($this->stock_quantity < $quantity) {
            return false;
        }

        $this->stock_quantity -= $quantity;
        return $this->save();
    }
}
