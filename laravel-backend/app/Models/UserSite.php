<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UserSite extends Model
{
    protected $table = 'user_sites';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'workspace_id',
        'name',
        'description',
        'lieu',
        'objectif',
        'probleme',
        'source_template_id',
        'status',
        'global_styles',
        'seo_config',
        'preview_token',
        'subdomain',
        'published_at',
        'social_enabled_platforms',
    ];

    protected $casts = [
        'global_styles' => 'array',
        'seo_config' => 'array',
        'social_enabled_platforms' => 'array',
        'published_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Auto-generate ID and preview_token on creation
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::random(10);
            }
            if (empty($model->preview_token)) {
                $model->preview_token = Str::random(12) . '-' . Str::random(12);
            }
        });
    }

    // Relations
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function workspace()
    {
        return $this->belongsTo(Workspace::class);
    }

    public function languages()
    {
        return $this->hasMany(SiteLanguage::class, 'site_id');
    }

    public function planAssignment()
    {
        return $this->hasOne(SitePlanAssignment::class, 'site_id')
            ->where('status', 'active')
            ->latest();
    }

    public function publications()
    {
        return $this->hasMany(SitePublication::class, 'site_id');
    }

    public function template()
    {
        return $this->belongsTo(SiteTemplate::class, 'source_template_id');
    }

    public function pages()
    {
        return $this->hasMany(SitePage::class, 'site_id')->orderBy('order');
    }

    public function domains()
    {
        return $this->hasMany(SiteDomain::class, 'site_id');
    }

    public function globalSections()
    {
        return $this->hasMany(SiteGlobalSection::class, 'site_id');
    }

    public function navbar()
    {
        return $this->hasOne(SiteGlobalSection::class, 'site_id')->where('position', 'navbar');
    }

    public function footer()
    {
        return $this->hasOne(SiteGlobalSection::class, 'site_id')->where('position', 'footer');
    }

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Accessors
    public function getIsPublishedAttribute()
    {
        return $this->status === 'published';
    }

    public function getVerifiedDomainAttribute()
    {
        return $this->domains()
            ->where('status', 'verified')
            ->where('type', 'custom')
            ->first();
    }

    public function getPreviewUrlAttribute()
    {
        $verifiedDomain = $this->verified_domain;

        if ($verifiedDomain) {
            return 'https://' . $verifiedDomain->domain;
        }

        // Generate internal preview URL
        $templateSlug = Str::slug($this->template?->name ?? 'template');
        $siteSlug = Str::slug($this->name);

        return "/site-builder/preview/{$this->user_id}/{$templateSlug}/{$siteSlug}/{$this->preview_token}";
    }
}
