<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ContentGeneration\PostManagementService;
use App\Services\ContentGeneration\InteractionService;
use App\Models\SocialMediaPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class SocialMediaController extends Controller
{
    private PostManagementService $postManagementService;
    private InteractionService $interactionService;

    public function __construct(
        PostManagementService $postManagementService,
        InteractionService $interactionService
    ) {
        // 🔧 CORRECTION : Exclure les méthodes publiques du middleware auth
        $this->middleware('auth:sanctum')->except(['publicIndex', 'publicShow','trending','publicByPlatform','postsByPlatform','platformStatistics','platforms']);
        $this->postManagementService = $postManagementService;
        $this->interactionService = $interactionService;
    }

    /**
     * GET /api/social - Liste des posts social media de l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $filters = [
                'type'     => 'social',
                'status'   => $request->get('status', 'all'),
                'platform' => $request->get('platform'),
                'per_page' => $request->get('per_page', 10),
                'page'     => $request->get('page', 1),
                'site_id'  => $request->get('site_id') ?: null,
            ];

            $result = $this->postManagementService->getUserPosts($user, $filters);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['social_posts'],
                'message' => 'Posts social media récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts social media'
            ], 500);
        }
    }

    /**
     * GET /api/social/{id} - Détails d'un post social media
     */
   public function show($id)
    {
        try {
            $post = SocialMediaPost::with(['categories', 'user'])->find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post introuvable'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $post
            ]);
        } catch (\Exception $e) {
            \Log::error('Erreur dans SocialMediaController@show : ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du post'
            ], 500);
        }
    }

    /**
     * ✅ CORRECTION : PUT /api/social/{id} - Mettre à jour un post social media AVEC base64
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            // ✅ CORRECTION : Validation qui accepte base64 ET URLs
            $validator = Validator::make($request->all(), [
                'content' => 'sometimes|string|min:10|max:5000',
                'images' => 'sometimes|array|max:10',
                'images.*' => [
                    'string',
                    function ($attribute, $value, $fail) {
                        // Accepter URLs valides OU images base64
                        $isValidUrl = filter_var($value, FILTER_VALIDATE_URL) !== false;
                        $isValidBase64 = preg_match('/^data:image\/(jpeg|jpg|png|gif|webp);base64,/', $value);

                        if (!$isValidUrl && !$isValidBase64) {
                            $fail('L\'image doit être une URL valide ou une image base64.');
                        }

                        // Vérifier la taille pour base64 (max ~3MB encodé = ~4MB base64)
                        if ($isValidBase64 && strlen($value) > 4 * 1024 * 1024) {
                            $fail('L\'image base64 est trop volumineuse (max 3MB).');
                        }
                    }
                ],
                'video' => 'sometimes|url',
                'tags' => 'sometimes|array',
                'tags.*' => 'string|max:50',
                'categories' => 'sometimes|array',
                'categories.*' => 'string|max:100'
            ], [
                // ✅ NOUVEAU : Messages d'erreur personnalisés
                'content.min' => 'Le contenu doit contenir au moins 10 caractères',
                'content.max' => 'Le contenu ne peut pas dépasser 5000 caractères',
                'images.max' => 'Vous ne pouvez pas ajouter plus de 10 images',
                'images.*.string' => 'Chaque image doit être une chaîne valide',
                'video.url' => 'La vidéo doit être une URL valide',
                'tags.array' => 'Les tags doivent être un tableau',
                'tags.*.string' => 'Chaque tag doit être une chaîne de caractères',
                'tags.*.max' => 'Chaque tag ne peut pas dépasser 50 caractères',
                'categories.array' => 'Les catégories doivent être un tableau',
                'categories.*.string' => 'Chaque catégorie doit être une chaîne de caractères',
                'categories.*.max' => 'Chaque catégorie ne peut pas dépasser 100 caractères'
            ]);

            if ($validator->fails()) {
                // ✅ NOUVEAU : Log détaillé des erreurs de validation
                Log::warning("❌ Validation échouée pour update social post", [
                    'user_id' => $user->id,
                    'post_id' => $id,
                    'errors' => $validator->errors()->toArray(),
                    'request_data_summary' => [
                        'content_length' => strlen($request->get('content', '')),
                        'images_count' => count($request->get('images', [])),
                        'tags_count' => count($request->get('tags', [])),
                        'categories_count' => count($request->get('categories', []))
                    ]
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->only(['content', 'images', 'video', 'tags', 'categories']);

            // ✅ NOUVEAU : Log des données avant traitement
            Log::info("📝 Mise à jour social post", [
                'user_id' => $user->id,
                'post_id' => $id,
                'data_summary' => [
                    'content_length' => strlen($data['content'] ?? ''),
                    'images_count' => count($data['images'] ?? []),
                    'has_base64_images' => isset($data['images']) ?
                        count(array_filter($data['images'], fn($img) => str_starts_with($img, 'data:'))) : 0,
                    'tags_count' => count($data['tags'] ?? []),
                    'categories_count' => count($data['categories'] ?? [])
                ]
            ]);

            $result = $this->postManagementService->updatePost($user, 'social', $id, $data);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['post'],
                'message' => 'Post social media mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            // ✅ NOUVEAU : Log d'erreur détaillé
            Log::error("❌ Erreur mise à jour social post", [
                'user_id' => $user->id ?? null,
                'post_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour'
            ], 500);
        }
    }

    /**
     * POST /api/social/{id}/status - Changer le statut d'un post social media
     */
    public function changeStatus(Request $request, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'status' => 'required|in:draft,scheduled,published',
                'scheduled_at' => 'sometimes|date|after:now',
                'scheduled_time' => 'sometimes|date_format:H:i'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $options = $request->only(['scheduled_at', 'scheduled_time']);

            $result = $this->postManagementService->changePostStatus(
                $user,
                'social',
                $id,
                $request->status,
                $options
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Statut modifié avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du changement de statut'
            ], 500);
        }
    }

    /**
     * POST /api/social/{id}/duplicate - Dupliquer un post social media
     */
    public function duplicate(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $result = $this->postManagementService->duplicatePost($user, 'social', $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['duplicated_post'],
                'message' => 'Post social media dupliqué avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la duplication'
            ], 500);
        }
    }

    /**
     * POST /api/social/{id}/share - Incrémenter les partages
     */
    public function share(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $result = $this->interactionService->recordShare($user, 'social_media_post', $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Partage comptabilisé'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du partage'
            ], 500);
        }
    }

    /**
     * GET /api/social/platforms - Liste des plateformes supportées
     */
    public function platforms(): JsonResponse
    {
        try {
            $platforms = collect(SocialMediaPost::PLATFORMS)->map(function ($platform) {
                return [
                    'key' => $platform,
                    'name' => ucfirst($platform),
                    'character_limit' => $this->getCharacterLimit($platform)
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $platforms,
                'message' => 'Plateformes récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des plateformes'
            ], 500);
        }
    }

    /**
     * GET /api/social/statistics - Statistiques des posts social media
     */
    public function statistics(): JsonResponse
    {
        try {
            $user = Auth::user();

            $result = $this->postManagementService->getUserPostsStatistics($user);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['social_posts'],
                'message' => 'Statistiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    // ===== MÉTHODES PRIVÉES =====

    private function getCharacterLimit(string $platform): int
    {
        $limits = [
            'twitter' => 280,
            'facebook' => 2000,
            'instagram' => 2200,
            'linkedin' => 3000,
        
        ];

        return $limits[$platform] ?? 2000;
    }

    /**
     * GET /api/public/social - Liste des posts sociaux publics
     */
    public function publicIndex(Request $request): JsonResponse
    {
        try {
            $filters = [
                'type' => 'social',
                'status' => 'published',
                'platform' => $request->get('platform'),
                'per_page' => $request->get('per_page', 10),
                'page' => $request->get('page', 1),
                'category' => $request->get('category')
            ];

            $result = $this->postManagementService->getPublicPosts('social', $filters);

            return response()->json([
                'success' => true,
                'data' => $result['data'] ?? [],
                'message' => 'Posts sociaux publics récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts sociaux publics'
            ], 500);
        }
    }

    /**
     * GET /api/public/social/{id} - Détail d'un post social public
     */
    public function publicShow(int $id): JsonResponse
    {
        try {
            $result = $this->postManagementService->getPublicPostById('social', $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error'] ?? 'Post non trouvé'
                ], 404);
            }

            // Incrémenter les vues sans authentification
            $this->interactionService->incrementViews('social', $result['data']['id'], null);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Post social public récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du post social public'
            ], 500);
        }
    }

    /**
     * GET /api/public/social/trending - Posts sociaux tendance
     */
    public function trending(Request $request): JsonResponse
    {
        try {
            $result = $this->postManagementService->getFeaturedPosts('social', 6);

            return response()->json([
                'success' => true,
                'data' => $result['data'] ?? [],
                'message' => 'Posts sociaux tendance récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts tendance'
            ], 500);
        }
    }

    /**
     * GET /api/public/social/{platform} - Posts publics par plateforme
     */
    public function publicByPlatform(Request $request, string $platform): JsonResponse
    {
        try {
            $filters = [
                'type' => 'social',
                'status' => 'published',
                'platform' => $platform,
                'per_page' => $request->get('per_page', 10),
                'page' => $request->get('page', 1),
                'category' => $request->get('category')
            ];

            $result = $this->postManagementService->getPublicPosts('social', $filters);

            return response()->json([
                'success' => true,
                'data' => $result['data'] ?? [],
                'message' => "Posts sociaux publics pour {$platform} récupérés avec succès"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts publics'
            ], 500);
        }
    }

    /**
     * GET /api/social/platforms/{platform}/posts - Posts par plateforme
     */
    public function postsByPlatform(Request $request, string $platform): JsonResponse
    {
        try {
            $user = Auth::user();
            $filters = [
                'type' => 'social',
                'status' => $request->get('status', 'all'),
                'platform' => $platform,
                'per_page' => $request->get('per_page', 10),
                'page' => $request->get('page', 1)
            ];

            $result = $this->postManagementService->getUserPosts($user, $filters);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['social_posts'],
                'message' => "Posts pour {$platform} récupérés avec succès"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts'
            ], 500);
        }
    }

    /**
     * GET /api/social/statistics/{platform} - Statistiques par plateforme
     */
    public function platformStatistics(string $platform): JsonResponse
    {
        try {
            $user = Auth::user();
            $stats = [
                'total' => (int) $user->socialMediaPosts()->where('platform', $platform)->count(),
                'published' => (int) $user->socialMediaPosts()->where('platform', $platform)->where('status', 'published')->count(),
                'drafts' => (int) $user->socialMediaPosts()->where('platform', $platform)->where('status', 'draft')->count(),
                'scheduled' => (int) $user->socialMediaPosts()->where('platform', $platform)->where('status', 'scheduled')->count(),
                'total_views' => (int) $user->socialMediaPosts()->where('platform', $platform)->sum('views'),
                'total_likes' => (int) $user->socialMediaPosts()->where('platform', $platform)->sum('likes'),
                'total_shares' => (int) $user->socialMediaPosts()->where('platform', $platform)->sum('shares'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => "Statistiques pour {$platform} récupérées avec succès"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
     * GET /api/social/calendar - Posts pour calendrier
     */
    public function calendar(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $query = $user->socialMediaPosts()->with(['categories', 'user']);

            // ✅ CORRECTION : Filtrer par date de création, pas seulement programmés
            if ($request->has('year')) {
                $query->whereYear('created_at', $request->year);
            }

            if ($request->has('month')) {
                $query->whereMonth('created_at', $request->month);
            }

            if ($request->has('platform')) {
                $query->where('platform', $request->platform);
            }

            // ✅ TOUS les posts (drafts, published, scheduled)
            $posts = $query->orderBy('created_at', 'desc')->get();

            Log::info("📅 Calendrier: {$posts->count()} posts trouvés", [
                'user_id' => $user->id,
                'filters' => $request->only(['year', 'month', 'platform'])
            ]);

            return response()->json([
                'success' => true,
                'data' => $posts
            ]);
        } catch (\Exception $e) {
            Log::error("❌ Erreur calendrier", [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur récupération calendrier'
            ], 500);
        }
    }

    /**
     * DELETE /api/social/{id} - Supprimer un post social media
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $post = SocialMediaPost::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post non trouvé ou non autorisé'
                ], 404);
            }

            Log::info("🗑️ Suppression social post", [
                'user_id' => $user->id,
                'post_id' => $id,
                'platform' => $post->platform
            ]);

            $post->delete();

            return response()->json([
                'success' => true,
                'message' => 'Post supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur suppression social post", [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
                'post_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }
}
