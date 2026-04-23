<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocialMediaPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AdminSocialMediaController extends Controller
{
    /**
     * DELETE /api/admin/social-posts/{id} - Supprimer un post social
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $admin = Auth::user();
            $post = SocialMediaPost::find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post social non trouvé'
                ], 404);
            }

            $platform = $post->platform;
            $userId = $post->user_id;

            // Supprimer le post
            $post->delete();

            Log::info("[AdminSocialMediaController::destroy] Post social supprimé par admin", [
                'admin_id' => $admin->id,
                'post_id' => $id,
                'platform' => $platform,
                'user_id' => $userId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Post social supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminSocialMediaController::destroy] Erreur", [
                'error' => $e->getMessage(),
                'post_id' => $id,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du post'
            ], 500);
        }
    }
}
