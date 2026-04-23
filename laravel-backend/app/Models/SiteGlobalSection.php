<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SiteGlobalSection extends Model
{
    protected $table = 'site_global_sections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'site_id',
        'section_type_id',
        'position',
        'content',
        'styles',
    ];

    protected $casts = [
        'content' => 'array',
        'styles' => 'array',
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

    public function sectionType()
    {
        return $this->belongsTo(SectionType::class, 'section_type_id');
    }

    // Scopes
    public function scopeNavbar($query)
    {
        return $query->where('position', 'navbar');
    }

    public function scopeFooter($query)
    {
        return $query->where('position', 'footer');
    }
}
