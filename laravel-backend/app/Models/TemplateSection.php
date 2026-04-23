<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplateSection extends Model
{
    protected $table = 'template_sections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'template_page_id',
        'section_type_id',
        'order',
        'default_content',
        'default_styles',
    ];

    protected $casts = [
        'order' => 'integer',
        'default_content' => 'array',
        'default_styles' => 'array',
    ];

    // Relations
    public function page()
    {
        return $this->belongsTo(TemplatePage::class, 'template_page_id');
    }

    public function sectionType()
    {
        return $this->belongsTo(SectionType::class, 'section_type_id');
    }
}
