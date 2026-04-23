<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * GET /api/profile - Récupérer le profil
     */
    public function index(): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();
        
        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * PUT /api/profile - Mettre à jour le profil
     */
    public function update(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'email' => ['required', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'bio' => 'nullable|string|max:160',
            'language' => 'nullable|string|in:french,english,spanish,german,chinese,arabic,portuguese,russian,japanese,hindi',
        ]);

        // PROTECTION: Exclure avatar des mises à jour générales
        $profileData = collect($validated)->except(['avatar'])->toArray();
        $user->update($profileData);

        return response()->json([
            'message' => 'Profil mis à jour avec succès.',
            'user' => $user,
        ]);
    }

    /**
     * POST /api/profile/avatar - Upload avatar
     */
    public function uploadAvatar(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'avatar' => 'required|image|max:2048',
        ]);

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $file = $request->file('avatar');
        $ext = $file->getClientOriginalExtension();
        $name = 'avatar_' . $user->id . '_' . time() . '.' . $ext;
        $path = $file->storeAs('avatars', $name, 'public');

        $user->avatar = $path;
        $user->save();

        return response()->json([
            'message' => 'Avatar mis à jour',
            'avatar' => $path,
        ], 200);
    }

    /**
     * DELETE /api/profile/avatar - Supprimer avatar
     */
    public function deleteAvatar(): \Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->avatar = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Avatar supprimé avec succès',
        ]);
    }
}