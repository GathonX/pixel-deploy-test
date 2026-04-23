<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingProduct extends Model
{
    protected $fillable = [
        'site_id', 'name', 'description', 'type',
        'price', 'price_child', 'capacity', 'max_capacity', 'stock',
        'image_url', 'parcours', 'amenities', 'status',
    ];

    protected $casts = [
        'amenities' => 'array',
        'price' => 'float',
        'price_child' => 'float',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function seasons(): HasMany
    {
        return $this->hasMany(BookingProductSeason::class, 'product_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(BookingProductImage::class, 'product_id')->orderBy('position');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(BookingReservation::class, 'product_id');
    }

    public function supplierPrices(): HasMany
    {
        return $this->hasMany(BookingSupplierPrice::class, 'product_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(BookingExpense::class, 'product_id');
    }
}
