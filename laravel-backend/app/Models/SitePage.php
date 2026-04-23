<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SitePage extends Model
{
    protected $table = 'site_pages';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'site_id',
        'name',
        'slug',
        'order',
        'is_published',
    ];

    protected $casts = [
        'order' => 'integer',
        'is_published' => 'boolean',
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

    public function sections()
    {
        return $this->hasMany(SiteSection::class, 'page_id')->orderBy('order');
    }
}
