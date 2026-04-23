<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingSetting extends Model
{
    protected $fillable = ['site_id', 'key', 'value'];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    public static function get(string $siteId, string $key, mixed $default = null): mixed
    {
        $setting = static::where('site_id', $siteId)->where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set(string $siteId, string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['site_id' => $siteId, 'key' => $key],
            ['value' => $value]
        );
    }
}
