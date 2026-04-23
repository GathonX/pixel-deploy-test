<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ===== RELATIONS =====

    public function blogPosts(): BelongsToMany
    {
        return $this->belongsToMany(BlogPost::class, 'blog_post_category');
    }

    public function socialMediaPosts(): BelongsToMany
    {
        return $this->belongsToMany(SocialMediaPost::class, 'social_media_post_category');
    }

    // ===== SCOPES =====

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ===== MUTATORS =====

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        if (empty($this->attributes['slug'])) {
            $this->attributes['slug'] = Str::slug($value);
        }
    }

    // ===== ACCESSORS =====

    public function getBlogPostsCountAttribute()
    {
        return $this->blogPosts()->published()->count();
    }

    public function getSocialPostsCountAttribute()
    {
        return $this->socialMediaPosts()->published()->count();
    }

    public function getTotalPostsCountAttribute()
    {
        return $this->getBlogPostsCountAttribute() + $this->getSocialPostsCountAttribute();
    }
}