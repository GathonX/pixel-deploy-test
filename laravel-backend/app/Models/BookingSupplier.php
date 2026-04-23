<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingSupplier extends Model
{
    protected $fillable = ['site_id', 'name', 'contact_email', 'phone', 'notes'];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function prices(): HasMany
    {
        return $this->hasMany(BookingSupplierPrice::class, 'supplier_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(BookingExpense::class, 'supplier_id');
    }
}
