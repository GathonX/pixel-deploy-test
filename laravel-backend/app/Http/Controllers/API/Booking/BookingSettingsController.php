<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingSettingsController extends Controller
{
    private array $allowedKeys = ['cgv_content', 'devis_config'];

    public function get(Request $request, string $siteId, string $key): JsonResponse
    {
        if (!in_array($key, $this->allowedKeys)) {
            return response()->json(['message' => 'Clé invalide.'], 400);
        }

        $value = BookingSetting::get($siteId, $key);

        // Pour devis_config, retourner un objet JSON décodé
        if ($key === 'devis_config' && $value) {
            return response()->json(['key' => $key, 'value' => json_decode($value, true)]);
        }

        return response()->json(['key' => $key, 'value' => $value]);
    }

    public function set(Request $request, string $siteId, string $key): JsonResponse
    {
        if (!in_array($key, $this->allowedKeys)) {
            return response()->json(['message' => 'Clé invalide.'], 400);
        }

        $rules = match ($key) {
            'cgv_content'  => ['value' => 'required|string'],
            'devis_config' => ['value' => 'required|array',
                'value.nom'     => 'nullable|string|max:255',
                'value.adresse' => 'nullable|string',
                'value.phone'   => 'nullable|string|max:50',
                'value.email'   => 'nullable|email',
                'value.couleur' => 'nullable|string|max:20',
                'value.devise'  => 'nullable|string|max:10',
            ],
            default => ['value' => 'required'],
        };

        $data = $request->validate($rules);
        $value = is_array($data['value']) ? json_encode($data['value']) : $data['value'];

        BookingSetting::set($siteId, $key, $value);

        return response()->json(['key' => $key, 'message' => 'Paramètre enregistré.']);
    }

    public function getAll(Request $request, string $siteId): JsonResponse
    {
        $settings = [];
        foreach ($this->allowedKeys as $key) {
            $value = BookingSetting::get($siteId, $key);
            $settings[$key] = ($key === 'devis_config' && $value)
                ? json_decode($value, true)
                : $value;
        }

        return response()->json($settings);
    }
}
