<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteLanguage extends Model
{
    protected $fillable = [
        'site_id',
        'language_code',
        'status',
        'is_default',
        'is_paid_extra',
    ];

    protected $casts = [
        'is_default'    => 'boolean',
        'is_paid_extra' => 'boolean',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
