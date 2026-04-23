<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketplaceCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id',
        'icon',
        'image',
        'is_active',
        'order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    public function parent()
    {
        return $this->belongsTo(MarketplaceCategory::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(MarketplaceCategory::class, 'parent_id');
    }

    public function products()
    {
        return $this->hasMany(MarketplaceProduct::class, 'category_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeRootCategories($query)
    {
        return $query->whereNull('parent_id');
    }
}
