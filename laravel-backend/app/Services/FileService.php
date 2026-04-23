<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Intervention\Image\ImageManager;

class FileService
{
    protected static ImageManager $manager;

    public function __construct()
    {
        self::$manager = new ImageManager('gd');
    }

    private static array $platformStandards = [
        'facebook' => ['post' => ['width' => 1200, 'height' => 630]],
        'instagram' => [
            'post' => ['width' => 1080, 'height' => 1080],
            'story' => ['width' => 1080, 'height' => 1920],
        ],
        'twitter' => ['post' => ['width' => 1200, 'height' => 675]],
        'linkedin' => ['post' => ['width' => 1200, 'height' => 627]],
        'blog' => ['header' => ['width' => 1200, 'height' => 400]],
    ];

    public static function convertAndStore(string $imagePath, string $platform, string $type = 'post'): ?string
    {
        try {
            if (!file_exists($imagePath)) {
                Log::warning("[FileService] Image not found: $imagePath");
                return null;
            }

            $standard = self::getPlatformStandard($platform, $type);
            if (!$standard) {
                Log::warning("[FileService] No standard found for $platform - $type");
                return null;
            }

            $image = self::$manager->read($imagePath)
                ->cover($standard['width'], $standard['height']);

            $filename = pathinfo($imagePath, PATHINFO_FILENAME) . "_{$platform}_{$type}.jpg";
            $storagePath = "social-media/{$platform}/{$filename}";

            Storage::disk('local')->put($storagePath, (string) $image->toJpeg(85));

            Log::info("[FileService] Image converted and saved: $storagePath");

            return Storage::url($storagePath);
        } catch (\Exception $e) {
            Log::error("[FileService] Image conversion error: {$e->getMessage()}", [
                'imagePath' => $imagePath,
                'platform' => $platform,
                'type' => $type,
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }

    public static function getPlatformStandard(string $platform, string $type = 'post'): ?array
    {
        return self::$platformStandards[strtolower($platform)][$type] ?? null;
    }

    public static function delete(string $path): bool
    {
        if (Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
            Log::info("[FileService] Image deleted: $path");
            return true;
        }

        Log::warning("[FileService] Attempt to delete non-existent image: $path");
        return false;
    }

    public static function storeBlogHeader(string $path): ?string
    {
        return self::convertAndStore($path, 'blog', 'header');
    }
}
