<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SiteDomain extends Model
{
    protected $table = 'site_domains';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'site_id',
        'domain',
        'type',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Auto-generate ID on creation
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::random(10);
            }
        });
    }

    // Relations
    public function site()
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    // Scopes
    public function scopeVerified($query)
    {
        return $query->where('status', 'verified');
    }

    public function scopeCustom($query)
    {
        return $query->where('type', 'custom');
    }

    public function scopeSubdomain($query)
    {
        return $query->where('type', 'subdomain');
    }

    // Accessors
    public function getIsVerifiedAttribute()
    {
        return $this->status === 'verified';
    }
}
