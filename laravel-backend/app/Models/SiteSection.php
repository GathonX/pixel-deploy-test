<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SiteSection extends Model
{
    protected $table = 'site_sections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'page_id',
        'section_type_id',
        'order',
        'content',
        'styles',
        'translations',
    ];

    protected $casts = [
        'order'        => 'integer',
        'content'      => 'array',
        'styles'       => 'array',
        'translations' => 'array',
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
    public function page()
    {
        return $this->belongsTo(SitePage::class, 'page_id');
    }

    public function sectionType()
    {
        return $this->belongsTo(SectionType::class, 'section_type_id');
    }
}
