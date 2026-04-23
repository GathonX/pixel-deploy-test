<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteTemplate extends Model
{
    protected $table = 'site_templates';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'description',
        'category',
        'thumbnail',
        'version',
        'status',
        'price',
        'price_ariary',
        'is_premium',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'price_ariary' => 'integer',
        'is_premium' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relations
    public function pages()
    {
        return $this->hasMany(TemplatePage::class, 'template_id')->orderBy('order');
    }

    public function sites()
    {
        return $this->hasMany(UserSite::class, 'source_template_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    // Accessors
    public function getSitesCountAttribute()
    {
        return $this->sites()->count();
    }
}
