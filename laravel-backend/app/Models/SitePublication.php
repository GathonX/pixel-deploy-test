<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SitePublication extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'site_id',
        'action',
        'reason_code',
        'actor_user_id',
        'meta_json',
        'created_at',
    ];

    protected $casts = [
        'meta_json'  => 'array',
        'created_at' => 'datetime',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
