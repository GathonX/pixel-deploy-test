<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteProduct extends Model
{
    protected $table = 'site_products';

    protected $fillable = [
        'site_id',
        'name',
        'description',
        'images',
        'base_price',
        'price_low_season',
        'price_mid_season',
        'price_high_season',
        'price_peak_season',
        'is_active',
    ];

    protected $casts = [
        'images'            => 'array',
        'price_low_season'  => 'array',
        'price_mid_season'  => 'array',
        'price_high_season' => 'array',
        'price_peak_season' => 'array',
        'is_active'         => 'boolean',
        'base_price'        => 'integer',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(UserSite::class, 'site_id');
    }

    /**
     * Retourne le prix applicable pour une date donnée (format Y-m-d).
     * Parcourt les saisons dans l'ordre de priorité et retourne le premier match.
     */
    public function priceForDate(string $date): int
    {
        $monthDay = date('m-d', strtotime($date));

        foreach (['price_peak_season', 'price_high_season', 'price_mid_season', 'price_low_season'] as $season) {
            $s = $this->{$season};
            if (!$s || empty($s['date_start']) || empty($s['date_end']) || !isset($s['price'])) {
                continue;
            }
            if ($this->isInSeason($monthDay, $s['date_start'], $s['date_end'])) {
                return (int) $s['price'];
            }
        }

        return $this->base_price;
    }

    private function isInSeason(string $monthDay, string $start, string $end): bool
    {
        // Gestion du chevauchement d'année (ex: peak saison = 12-15 → 01-15)
        if ($start <= $end) {
            return $monthDay >= $start && $monthDay <= $end;
        }
        // Chevauchement de fin d'année
        return $monthDay >= $start || $monthDay <= $end;
    }
}
