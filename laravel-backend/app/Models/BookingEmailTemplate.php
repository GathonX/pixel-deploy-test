<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingEmailTemplate extends Model
{
    protected $fillable = ['site_id', 'type', 'subject', 'body_html'];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }
}
