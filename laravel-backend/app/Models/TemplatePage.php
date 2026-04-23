<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplatePage extends Model
{
    protected $table = 'template_pages';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'template_id',
        'name',
        'slug',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    // Relations
    public function template()
    {
        return $this->belongsTo(SiteTemplate::class, 'template_id');
    }

    public function sections()
    {
        return $this->hasMany(TemplateSection::class, 'template_page_id')->orderBy('order');
    }
}
