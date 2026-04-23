<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SectionType extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'schema',
        'default_content',
        'default_styles',
    ];

    protected $casts = [
        'schema' => 'array',
        'default_content' => 'array',
        'default_styles' => 'array',
    ];

    // Relations
    public function templateSections()
    {
        return $this->hasMany(TemplateSection::class, 'section_type_id');
    }

    public function siteSections()
    {
        return $this->hasMany(SiteSection::class, 'section_type_id');
    }
}
