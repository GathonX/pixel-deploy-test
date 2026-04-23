<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteBuilderSetting extends Model
{
    protected $fillable = [
        'domain_settings',
        'branding',
        'limits',
        'features',
        'notifications',
    ];

    protected $casts = [
        'domain_settings' => 'array',
        'branding' => 'array',
        'limits' => 'array',
        'features' => 'array',
        'notifications' => 'array',
    ];

    /**
     * Retourne l'unique ligne de settings, ou la crée avec les defaults
     */
    public static function getSettings(): self
    {
        $settings = self::first();

        if (!$settings) {
            $settings = self::create([
                'domain_settings' => [
                    'defaultDomain' => 'monsite.app',
                    'allowCustomDomains' => true,
                ],
                'branding' => [
                    'platformName' => 'SiteBuilder Pro',
                    'primaryColor' => '#8b5cf6',
                    'logoUrl' => '',
                ],
                'limits' => [
                    'maxSitesPerUser' => 5,
                    'maxPagesPerSite' => 10,
                    'maxStorageGB' => 5,
                ],
                'features' => [
                    'enableAnalytics' => true,
                    'enableSEO' => true,
                    'enableCustomCode' => false,
                ],
                'notifications' => [
                    'emailNotifications' => true,
                    'adminAlerts' => true,
                ],
            ]);
        }

        return $settings;
    }
}
