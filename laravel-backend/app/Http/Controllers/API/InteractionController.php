<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ContentGeneration\InteractionService;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\Comment;
use App\Models\HiddenContent;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class InteractionController extends Controller
{
    private InteractionService $interactionService;

    public function __construct(InteractionService $interactionService)
    {
        // ✅ CORRECTION : Ajouter les méthodes publiques aux exceptions
        $this->middleware('auth:sanctum')->except([
    'publicStatistics',
    'publicComments',
    'topPosts',
    'getStatistics',
    'getComments',
    'incrementView',
    'embedLike',
    'embedShare',
    'embedComment',
    'embedCommentLike'    // ✅ NOUVEAU
]);
        $this->interactionService = $interactionService;
    }

    /**
     * POST /api/interactions/reaction - Toggle réaction (like, love, etc.)
     */
    public function toggleReaction(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'reactable_type' => 'required|in:blog_post,social_media_post,comment',
                'reactable_id' => 'required|integer|min:1',
                'type' => 'sometimes|in:like,love,laugh,angry,sad'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier le spam
            if (!$this->interactionService->checkSpamPrevention($user, 'reaction')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trop de réactions. Veuillez attendre avant de continuer.'
                ], 429);
            }

            // Convertir le type en classe
            $reactableType = $this->convertTypeToClass($request->reactable_type);
            if (!$reactableType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'élément non valide'
                ], 400);
            }

            $result = $this->interactionService->toggleReaction(
                $user,
                $reactableType,
                $request->reactable_id,
                $request->get('type', 'like')
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
                'message' => $result['data']['action'] === 'added'
                    ? 'Réaction ajoutée'
                    : 'Réaction supprimée'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la réaction'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/comment - Créer un commentaire
     */
    public function createComment(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'commentable_type' => 'required|in:blog_post,social_media_post',
                'commentable_id' => 'required|integer|min:1',
                'content' => 'required|string|min:3|max:1000',
                'parent_id' => 'sometimes|integer|exists:comments,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier le spam
            if (!$this->interactionService->checkSpamPrevention($user, 'comment')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trop de commentaires. Veuillez attendre avant de continuer.'
                ], 429);
            }

            // Convertir le type en classe
            $commentableType = $this->convertTypeToClass($request->commentable_type);
            if (!$commentableType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'élément non valide'
                ], 400);
            }

            $result = $this->interactionService->createComment(
                $user,
                $commentableType,
                $request->commentable_id,
                $request->content,
                $request->get('parent_id')
            );

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['comment'],
                'message' => 'Commentaire créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du commentaire'
            ], 500);
        }
    }

    /**
     * GET /api/interactions/{type}/{id}/statistics - Statistiques d'interaction d'un post
     * ✅ MAINTENANT PUBLIC - Pas d'authentification requise
     */
    public function getStatistics(string $type, int $id): JsonResponse
    {
        try {
            $result = $this->interactionService->getPostInteractionStats($type, $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Statistiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/view - Incrémenter les vues d'un post
     * ✅ MAINTENANT PUBLIC - Pas d'authentification requise
     */
    public function incrementView(Request $request): JsonResponse
    {
        try {
            // ✅ CORRECTION : Utilisateur optionnel (null si non connecté)
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'post_type' => 'required|in:blog,social',
                'post_id' => 'required|integer|min:1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // ✅ CORRECTION : Vérifier spam seulement si utilisateur connecté
            if ($user && !$this->interactionService->checkSpamPrevention($user, 'view')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trop de vues. Veuillez attendre.'
                ], 429);
            }

            $result = $this->interactionService->incrementViews(
                $request->post_type,
                $request->post_id,
                $user // ✅ Peut être null pour utilisateurs non connectés
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
                'message' => 'Vue comptabilisée'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du comptage des vues'
            ], 500);
        }
    }

    /**
     * GET /api/interactions/comments/{commentableType}/{commentableId} - Récupérer commentaires d'un post
     * ✅ MAINTENANT PUBLIC - Pas d'authentification requise
     */
    public function getComments(string $commentableType, int $commentableId, Request $request): JsonResponse
    {
        try {
            $validator = Validator::make([
                'commentable_type' => $commentableType,
                'page' => $request->get('page', 1),
                'per_page' => $request->get('per_page', 10)
            ], [
                'commentable_type' => 'required|in:blog_post,social_media_post',
                'page' => 'integer|min:1',
                'per_page' => 'integer|min:1|max:50'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Convertir le type en classe
            $commentableClass = $this->convertTypeToClass($commentableType);
            if (!$commentableClass) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'élément non valide'
                ], 400);
            }

            // Récupérer les commentaires principaux avec leurs réponses
            $comments = Comment::where('commentable_type', $commentableClass)
                ->where('commentable_id', $commentableId)
                ->whereNull('parent_id') // Seulement les commentaires principaux
                ->with(['user', 'replies.user', 'replies.replies.user']) // Charger les réponses
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 10));

            return response()->json([
                'success' => true,
                'data' => $comments,
                'message' => 'Commentaires récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des commentaires'
            ], 500);
        }
    }

    /**
     * GET /api/interactions/user-reactions/{type}/{id} - Réactions de l'utilisateur connecté
     */
    public function getUserReactions(string $type, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make([
                'type' => $type
            ], [
                'type' => 'required|in:blog_post,social_media_post,comment'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Convertir le type en classe
            $reactableType = $this->convertTypeToClass($type);
            if (!$reactableType) {
                return response()->json([
                    'success' => false,
                    'message' => 'Type d\'élément non valide'
                ], 400);
            }

            // Récupérer les réactions de l'utilisateur
            $userReactions = $user->reactions()
                ->where('reactable_type', $reactableType)
                ->where('reactable_id', $id)
                ->pluck('type')
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => [
                    'user_reactions' => $userReactions,
                    'has_liked' => in_array('like', $userReactions),
                    'has_loved' => in_array('love', $userReactions)
                ],
                'message' => 'Réactions utilisateur récupérées'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des réactions'
            ], 500);
        }
    }

    /**
     * GET /api/public/interactions/comments/{commentableType}/{commentableId} - Commentaires publics
     */
    public function publicComments(string $commentableType, int $commentableId, Request $request): JsonResponse
    {
        // Même logique que getComments() mais sans auth
        return $this->getComments($commentableType, $commentableId, $request);
    }

    /**
     * GET /api/public/interactions/top-posts - Posts les plus engageants
     */
    public function topPosts(Request $request): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [],
                'message' => 'Top posts récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des top posts'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/share - Enregistrer un partage
     */
    public function recordShare(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'reactable_type' => 'required|in:blog_post,social_media_post',
                'reactable_id' => 'required|integer|min:1'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier le spam
            if (!$this->interactionService->checkSpamPrevention($user, 'share')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trop de partages. Veuillez attendre.'
                ], 429);
            }

            $result = $this->interactionService->recordShare(
                $user,
                $request->reactable_type,
                $request->reactable_id
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
                'message' => 'Partage enregistré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement du partage'
            ], 500);
        }
    }

/**
     * POST /api/interactions/embed/like - Like public pour embed
     * ✅ SANS AUTHENTIFICATION - Pour visiteurs sites clients
     */
    public function embedLike(Request $request): JsonResponse
{
    try {
        // ✅ CORRECTION CORS : Récupérer client_id du header ou du body
        $clientId = $request->input('client_id') ?? $request->header('X-Client-ID');
        
        $validator = Validator::make(array_merge($request->all(), ['client_id' => $clientId]), [
            'post_type' => 'required|in:blog,social',
            'post_id' => 'required|integer|min:1',
            'client_id' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $postType = $request->post_type === 'blog' ? 'blog_post' : 'social_media_post';
        $modelClass = $postType === 'blog_post' ? BlogPost::class : SocialMediaPost::class;

        $post = $modelClass::find($request->post_id);
        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post non trouvé'
            ], 404);
        }

        // ✅ TOGGLE LOGIC : Utiliser IP + client_id comme identifiant unique
        $userIdentifier = $request->ip() . '_' . $clientId;
        $cacheKey = "embed_like_{$postType}_{$request->post_id}_{$userIdentifier}";

        $hasLiked = cache()->has($cacheKey);

        if ($hasLiked) {
            // ✅ SUPPRIMER le like (toggle OFF)
            $post->decrement('likes');
            cache()->forget($cacheKey);
            $action = 'removed';
        } else {
            // ✅ AJOUTER le like (toggle ON)
            $post->increment('likes');
            cache()->put($cacheKey, true, now()->addDays(30)); // Expire après 30 jours
            $action = 'added';
        }

        $newLikeCount = $post->fresh()->likes;

        return response()->json([
            'success' => true,
            'data' => [
                'action' => $action,
                'new_count' => $newLikeCount,
                'has_liked' => !$hasLiked
            ],
            'message' => $action === 'added' ? 'Like ajouté' : 'Like supprimé'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du like embed'
        ], 500);
    }
}

    /**
     * POST /api/interactions/embed/share - Partage public pour embed
     * ✅ SANS AUTHENTIFICATION - Pour visiteurs sites clients
     */
    public function embedShare(Request $request): JsonResponse
    {
        try {
            // ✅ CORRECTION CORS : Récupérer client_id du header ou du body
            $clientId = $request->input('client_id') ?? $request->header('X-Client-ID');
            
            $validator = Validator::make(array_merge($request->all(), ['client_id' => $clientId]), [
                'post_type' => 'required|in:blog,social',
                'post_id' => 'required|integer|min:1',
                'client_id' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // ✅ VRAIE INTERACTION : Incrémenter réellement le compteur en BDD
            $postType = $request->post_type === 'blog' ? 'blog_post' : 'social_media_post';
            $modelClass = $postType === 'blog_post' ? BlogPost::class : SocialMediaPost::class;

            // Trouver le post
            $post = $modelClass::find($request->post_id);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post non trouvé'
                ], 404);
            }

            // ✅ INCRÉMENTER RÉELLEMENT en BDD
            $post->increment('shares');
            $newShareCount = $post->fresh()->shares;

            return response()->json([
                'success' => true,
                'data' => [
                    'shares' => $newShareCount
                ],
                'message' => 'Partage enregistré (embed)'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du partage embed'
            ], 500);
        }
    }

    /**
     * ✅ MISE À JOUR : POST /api/interactions/embed/comment - Commentaire public avec identité
     */
    public function embedComment(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'post_type' => 'required|in:blog,social',
                'post_id' => 'required|integer|min:1',
                'content' => 'required|string|min:3|max:1000',
                'author_name' => 'required|string|min:2|max:100',
                'author_email' => 'nullable|email|max:255',
                'user_fingerprint' => 'nullable|string|max:50',
                'parent_id' => 'nullable|integer|exists:comments,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $postType = $request->post_type === 'blog' ? 'blog_post' : 'social_media_post';
            $modelClass = $postType === 'blog_post' ? BlogPost::class : SocialMediaPost::class;

            $post = $modelClass::find($request->post_id);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post non trouvé'
                ], 404);
            }

            // ✅ Créer le commentaire avec les nouvelles données d'identité
            $comment = Comment::create([
                'commentable_type' => $modelClass,
                'commentable_id' => $request->post_id,
                'content' => trim($request->content),
                'author_name' => trim($request->author_name),
                'author_email' => $request->author_email ? trim($request->author_email) : null,
                'user_fingerprint' => $request->user_fingerprint,
                'parent_id' => $request->parent_id,
                'user_id' => null, // Toujours null pour les commentaires embed
                'likes_count' => 0,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'comment' => [
                        'id' => $comment->id,
                        'content' => $comment->content,
                        'author_name' => $comment->author_name,
                        'created_at' => $comment->created_at->toISOString(),
                        'parent_id' => $comment->parent_id,
                        'likes_count' => $comment->likes_count
                    ]
                ],
                'message' => 'Commentaire créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du commentaire'
            ], 500);
        }
    }

    /**
 * POST /api/interactions/embed/comment-like - Like public sur commentaire pour embed
 */
public function embedCommentLike(Request $request): JsonResponse
{
    try {
        $validator = Validator::make($request->all(), [
            'comment_id' => 'required|integer|min:1',
            'client_id' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Trouver le commentaire
        $comment = Comment::find($request->comment_id);
        if (!$comment) {
            return response()->json([
                'success' => false,
                'message' => 'Commentaire non trouvé'
            ], 404);
        }

        // Incrémenter les likes du commentaire
        $comment->increment('likes_count');
        $newLikeCount = $comment->fresh()->likes_count;

        return response()->json([
            'success' => true,
            'data' => [
                'action' => 'added',
                'new_count' => $newLikeCount
            ],
            'message' => 'Like commentaire enregistré'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors du like commentaire'
        ], 500);
    }
}

    // ===== MÉTHODES PRIVÉES =====

    /**
     * Convertir type string en classe Eloquent
     */
    private function convertTypeToClass(string $type): ?string
    {
        $mapping = [
            'blog_post' => BlogPost::class,
            'social_media_post' => SocialMediaPost::class,
            'comment' => Comment::class
        ];

        return $mapping[$type] ?? null;
    }

    /**
     * ✅ NOUVELLE MÉTHODE : GET /api/public/interactions/{type}/{id}/statistics
     * Statistiques publiques (même logique que getStatistics mais accessible sans auth)
     */
    public function publicStatistics(string $type, int $id): JsonResponse
    {
        try {
            $result = $this->interactionService->getPostInteractionStats($type, $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Statistiques publiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques publiques'
            ], 500);
        }
    }

    // ===== GESTION DES COMMENTAIRES (ACTIONS UTILISATEUR) =====

    /**
     * PUT /api/interactions/comments/{commentId} - Modifier un commentaire
     * Permet à l'utilisateur de modifier son propre commentaire
     */
    public function updateComment(Request $request, int $commentId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'content' => 'required|string|min:1|max:1000',
            ]);

            // Récupérer le commentaire
            $comment = Comment::find($commentId);

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            // Vérifier que l'utilisateur est le propriétaire du commentaire
            if ($comment->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez modifier que vos propres commentaires'
                ], 403);
            }

            // Mettre à jour le contenu
            $comment->update([
                'content' => $validated['content']
            ]);

            // Recharger avec les relations
            $comment->load(['user:id,name,avatar', 'reactions']);

            return response()->json([
                'success' => true,
                'data' => $comment,
                'message' => 'Commentaire modifié avec succès'
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation échouée',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification du commentaire'
            ], 500);
        }
    }

    /**
     * DELETE /api/interactions/comments/{commentId} - Supprimer un commentaire
     * Permet à l'utilisateur de supprimer son propre commentaire
     */
    public function deleteComment(int $commentId): JsonResponse
    {
        try {
            // Récupérer le commentaire avec ses réponses
            $comment = Comment::with('replies')->find($commentId);

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            // Vérifier que l'utilisateur est le propriétaire du commentaire
            if ($comment->user_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez supprimer que vos propres commentaires'
                ], 403);
            }

            // Si le commentaire a des réponses, on remplace le contenu par "[supprimé]"
            // au lieu de supprimer complètement (pour préserver la structure des discussions)
            if ($comment->replies()->count() > 0) {
                $comment->update([
                    'content' => '[Commentaire supprimé par son auteur]',
                    'user_id' => null, // Anonymiser
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Commentaire marqué comme supprimé (les réponses sont préservées)',
                    'data' => ['deleted' => false, 'anonymized' => true]
                ]);
            }

            // Sinon, supprimer complètement
            $comment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Commentaire supprimé avec succès',
                'data' => ['deleted' => true]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du commentaire'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/comments/{commentId}/hide - Masquer un commentaire
     * Masque le commentaire du fil de l'utilisateur connecté
     */
    public function hideComment(int $commentId): JsonResponse
    {
        try {
            // Vérifier que le commentaire existe
            $comment = Comment::find($commentId);

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            // Créer l'entrée de masquage via le système de modération
            $hidden = HiddenContent::firstOrCreate([
                'user_id' => Auth::id(),
                'hideable_type' => Comment::class,
                'hideable_id' => $commentId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Commentaire masqué de votre fil',
                'data' => $hidden
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du masquage du commentaire'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/comments/{commentId}/unhide - Démasquer un commentaire
     * Affiche à nouveau un commentaire précédemment masqué
     */
    public function unhideComment(int $commentId): JsonResponse
    {
        try {
            // Vérifier que le commentaire existe
            $comment = Comment::find($commentId);

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            // Supprimer l'entrée de masquage
            $deleted = HiddenContent::where('user_id', Auth::id())
                ->where('hideable_type', Comment::class)
                ->where('hideable_id', $commentId)
                ->delete();

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce commentaire n\'était pas masqué'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Commentaire affiché à nouveau dans votre fil'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du démasquage du commentaire'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/comments/{commentId}/report - Signaler un commentaire
     * Envoie un signalement à l'équipe de modération
     */
    public function reportComment(Request $request, int $commentId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'reason' => 'required|string|min:3|max:1000',
            ]);

            // Vérifier que le commentaire existe
            $comment = Comment::find($commentId);

            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            // Vérifier que l'utilisateur n'a pas déjà signalé ce commentaire
            $existingReport = Report::where('user_id', Auth::id())
                ->where('reportable_type', Comment::class)
                ->where('reportable_id', $commentId)
                ->first();

            if ($existingReport) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous avez déjà signalé ce commentaire'
                ], 409);
            }

            // Créer le signalement
            $report = Report::create([
                'user_id' => Auth::id(),
                'reportable_type' => Comment::class,
                'reportable_id' => $commentId,
                'reason' => 'user_report',
                'description' => $validated['reason'],
                'status' => 'pending',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Commentaire signalé avec succès. Notre équipe va l\'examiner.',
                'data' => $report
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation échouée',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du signalement du commentaire'
            ], 500);
        }
    }

    /**
     * POST /api/interactions/batch-statistics
     * Récupère les statistiques de plusieurs posts en un seul appel
     * Body: { posts: [{type: "blog_post", id: 1}, ...] }
     */
    public function batchStatistics(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'posts'          => 'required|array|min:1|max:100',
                'posts.*.type'   => 'required|string|in:blog_post,social_media_post',
                'posts.*.id'     => 'required|integer|min:1',
            ]);

            $results = [];
            foreach ($validated['posts'] as $item) {
                $key    = $item['type'] . '_' . $item['id'];
                $result = $this->interactionService->getPostInteractionStats($item['type'], $item['id']);
                $results[$key] = $result['success'] ? $result['data'] : null;
            }

            return response()->json([
                'success' => true,
                'data'    => $results,
                'message' => 'Statistiques batch récupérées',
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques batch',
            ], 500);
        }
    }
}
