<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Category;
use App\Models\Comment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminBlogController extends Controller
{
    /**
     * GET /api/admin/blog - Liste tous les blog posts (tous les utilisateurs)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = BlogPost::with(['user', 'categories', 'reactions']);

            // Filtres
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('category')) {
                $query->whereHas('categories', function($q) use ($request) {
                    $q->where('slug', $request->category);
                });
            }

            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('summary', 'like', "%{$search}%");
                });
            }

            $perPage = $request->get('per_page', 15);
            $posts = $query->orderBy('created_at', 'desc')->paginate($perPage);

            // ✅ CORRECTION : Synchroniser les statistiques avec les vraies données
            foreach ($posts->items() as $post) {
                $likesCount = $post->reactions()->where('type', 'like')->count();
                $commentsCount = $post->comments()->count();
                
                // Mettre à jour les colonnes pour garder la cohérence
                $post->update([
                    'likes' => $likesCount,
                ]);
                
                // Ajouter les vraies statistiques dans la réponse
                $post->likes = $likesCount;
                $post->comments_count = $commentsCount;
            }

            return response()->json([
                'success' => true,
                'data' => $posts,
                'message' => 'Liste des articles récupérée avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::index] Erreur", [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des articles'
            ], 500);
        }
    }

    /**
     * POST /api/admin/blog - Créer un nouvel article de blog (admin)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $admin = Auth::user();

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|min:3|max:255',
                'summary' => 'required|string|min:10|max:500',
                'content' => 'required|string|min:20',
                'header_image' => 'nullable|string',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'categories' => 'nullable|array',
                'categories.*' => 'string|max:100',
                'status' => 'nullable|in:draft,scheduled,published',
                'scheduled_at' => 'nullable|date|after:now',
                'scheduled_time' => 'nullable|date_format:H:i',
                'author_id' => 'nullable|exists:users,id', // Permet de créer pour un utilisateur spécifique
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Créer le slug unique
            $slug = Str::slug($request->title);
            $originalSlug = $slug;
            $counter = 1;

            while (BlogPost::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            // Déterminer l'auteur (admin ou utilisateur spécifique)
            $authorId = $request->author_id ?? $admin->id;

            // Créer l'article
            $blogPost = BlogPost::create([
                'user_id' => $authorId,
                'slug' => $slug,
                'title' => $request->title,
                'summary' => $request->summary,
                'content' => $request->content,
                'header_image' => $request->header_image,
                'tags' => $request->tags ?? [],
                'status' => $request->status ?? 'draft',
                'scheduled_at' => $request->scheduled_at,
                'scheduled_time' => $request->scheduled_time,
                'is_ai_generated' => false,
                'generation_context' => null,
                'published_at' => $request->status === 'published' ? now() : null
            ]);

            // Associer les catégories si présentes
            if ($request->categories && !empty($request->categories)) {
                $categoryIds = [];
                foreach ($request->categories as $categoryName) {
                    $category = Category::firstOrCreate(
                        ['name' => $categoryName, 'slug' => Str::slug($categoryName)],
                        ['description' => 'Catégorie créée par admin', 'is_active' => true]
                    );
                    $categoryIds[] = $category->id;
                }
                $blogPost->categories()->sync($categoryIds);
            }

            // Charger les relations pour la réponse
            $blogPost->load(['categories', 'user']);

            Log::info("[AdminBlogController::store] Article créé par admin", [
                'admin_id' => $admin->id,
                'author_id' => $authorId,
                'post_id' => $blogPost->id,
                'title' => $blogPost->title
            ]);

            return response()->json([
                'success' => true,
                'data' => $blogPost,
                'message' => 'Article créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::store] Erreur", [
                'error' => $e->getMessage(),
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'article'
            ], 500);
        }
    }

    /**
     * GET /api/admin/blog/{id} - Détail d'un article
     */
    public function show(int $id): JsonResponse
    {
        try {
            $post = BlogPost::with(['user', 'categories', 'reactions', 'comments' => function($query) {
                $query->with('user')->orderBy('created_at', 'desc');
            }])->find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé'
                ], 404);
            }

            // ✅ CORRECTION : Synchroniser les statistiques avec les vraies données
            $likesCount = $post->reactions()->where('type', 'like')->count();
            $commentsCount = $post->comments()->count();
            
            // Mettre à jour les colonnes pour garder la cohérence
            $post->update([
                'likes' => $likesCount,
            ]);
            
            // Ajouter les vraies statistiques dans la réponse
            $post->likes = $likesCount;
            $post->comments_count = $commentsCount;

            return response()->json([
                'success' => true,
                'data' => $post,
                'message' => 'Article récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::show] Erreur", [
                'error' => $e->getMessage(),
                'post_id' => $id
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'article'
            ], 500);
        }
    }

    /**
     * PUT /api/admin/blog/{id} - Mettre à jour un article
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $admin = Auth::user();
            $post = BlogPost::find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|string|min:3|max:255',
                'summary' => 'sometimes|string|min:10|max:500',
                'content' => 'sometimes|string|min:20',
                'header_image' => 'sometimes|nullable|string',
                'tags' => 'sometimes|array',
                'tags.*' => 'string|max:50',
                'categories' => 'sometimes|array',
                'categories.*' => 'string|max:100',
                'status' => 'sometimes|in:draft,scheduled,published',
                'scheduled_at' => 'sometimes|nullable|date|after:now',
                'scheduled_time' => 'sometimes|nullable|date_format:H:i',
                'author_id' => 'sometimes|nullable|integer|exists:users,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Mise à jour des champs
            $post->fill($request->only([
                'title', 'summary', 'content', 'header_image', 'tags',
                'status', 'scheduled_at', 'scheduled_time', 'author_id'
            ]));

            // Gérer author_id - si null, garder l'auteur actuel
            if ($request->has('author_id')) {
                $post->user_id = $request->author_id ?? $post->user_id;
            }

            // Mettre à jour le slug si le titre change
            if ($request->has('title')) {
                $slug = Str::slug($request->title);
                $originalSlug = $slug;
                $counter = 1;

                while (BlogPost::where('slug', $slug)->where('id', '!=', $id)->exists()) {
                    $slug = $originalSlug . '-' . $counter;
                    $counter++;
                }
                $post->slug = $slug;
            }

            // Gérer published_at
            if ($request->status === 'published' && !$post->published_at) {
                $post->published_at = now();
            } elseif ($request->status !== 'published') {
                $post->published_at = null;
            }

            $post->save();

            // Mettre à jour les catégories si présentes
            if ($request->has('categories')) {
                $categoryIds = [];
                if (!empty($request->categories)) {
                    foreach ($request->categories as $categoryName) {
                        $category = Category::firstOrCreate(
                            ['name' => $categoryName, 'slug' => Str::slug($categoryName)],
                            ['description' => 'Catégorie créée par admin', 'is_active' => true]
                        );
                        $categoryIds[] = $category->id;
                    }
                }
                $post->categories()->sync($categoryIds);
            }

            $post->load(['categories', 'user']);

            Log::info("[AdminBlogController::update] Article mis à jour par admin", [
                'admin_id' => $admin->id,
                'post_id' => $post->id,
                'title' => $post->title
            ]);

            return response()->json([
                'success' => true,
                'data' => $post,
                'message' => 'Article mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::update] Erreur", [
                'error' => $e->getMessage(),
                'post_id' => $id,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'article'
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/blog/{id} - Supprimer un article
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $admin = Auth::user();
            $post = BlogPost::find($id);

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé'
                ], 404);
            }

            $title = $post->title;
            $authorId = $post->user_id;

            // Supprimer les relations
            $post->categories()->detach();
            $post->comments()->delete();
            $post->reactions()->delete();

            // Supprimer l'article
            $post->delete();

            Log::info("[AdminBlogController::destroy] Article supprimé par admin", [
                'admin_id' => $admin->id,
                'post_id' => $id,
                'title' => $title,
                'author_id' => $authorId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Article supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::destroy] Erreur", [
                'error' => $e->getMessage(),
                'post_id' => $id,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'article'
            ], 500);
        }
    }

    /**
     * GET /api/admin/blog/statistics - Statistiques globales des blogs
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total_posts' => BlogPost::count(),
                'published_posts' => BlogPost::where('status', 'published')->count(),
                'draft_posts' => BlogPost::where('status', 'draft')->count(),
                'scheduled_posts' => BlogPost::where('status', 'scheduled')->count(),
                'total_views' => BlogPost::sum('views'),
                'total_likes' => BlogPost::sum('likes'),
                'total_shares' => BlogPost::sum('shares'),
                'authors_count' => BlogPost::distinct('user_id')->count(),
                'categories_count' => Category::whereHas('blogPosts')->count(),
                'recent_posts' => BlogPost::with(['user', 'categories'])
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get(),
                'most_viewed' => BlogPost::with(['user', 'categories'])
                    ->orderBy('views', 'desc')
                    ->take(5)
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistiques récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::statistics] Erreur", [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
     * POST /api/admin/blog/upload-image - Upload d'image pour les articles admin
     */
    public function uploadImage(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            ]);

            $admin = Auth::user();
            $image = $request->file('image');

            $timestamp = now()->format('Ymd_His');
            $randomId = Str::random(8);
            $extension = $image->getClientOriginalExtension();
            $filename = "admin_blog_{$admin->id}_{$timestamp}_{$randomId}.{$extension}";

            $path = $image->storeAs('blog-images', $filename, 'public');

            Log::info("[AdminBlogController::uploadImage] Image uploadée par admin", [
                'admin_id' => $admin->id,
                'filename' => $filename,
                'path' => $path,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'path' => $path,
                    'filename' => $filename,
                    'url' => asset('storage/' . $path)
                ],
                'message' => 'Image uploadée avec succès'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::uploadImage] Erreur upload", [
                'error' => $e->getMessage(),
                'admin_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload de l\'image'
            ], 500);
        }
    }

    /**
     * GET /api/admin/blog/users - Liste des utilisateurs pour sélection d'auteur
     */
    public function getUsers(): JsonResponse
    {
        try {
            $users = User::select('id', 'name', 'email')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $users,
                'message' => 'Liste des utilisateurs récupérée'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des utilisateurs'
            ], 500);
        }
    }

    /**
     * GET /api/admin/blog/{id}/comments - Récupérer les commentaires d'un article
     */
    public function getComments(int $id): JsonResponse
    {
        try {
            $admin = Auth::user();
            
            $post = BlogPost::find($id);
            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé'
                ], 404);
            }

            $comments = $post->comments()
                ->with(['user', 'replies.user', 'reactions'])
                ->whereNull('parent_id') // Seulement les commentaires de niveau supérieur
                ->orderBy('created_at', 'desc')
                ->get();

            // Enrichir les données avec synchronisation des vraies statistiques
            $comments = $comments->map(function ($comment) {
                // ✅ DIAGNOSTIC : Compter les vraies réactions au lieu d'utiliser la colonne obsolète
                $realLikesCount = $comment->reactions()->where('type', 'like')->count();
                $oldLikesCount = $comment->likes_count;
                
                // ✅ LOG DIAGNOSTIC : Voir ce qui se passe
                Log::info("[AdminBlogController::getComments] DIAGNOSTIC Commentaire", [
                    'comment_id' => $comment->id,
                    'old_likes_count_column' => $oldLikesCount,
                    'real_likes_count_from_reactions' => $realLikesCount,
                    'reactions_total' => $comment->reactions()->count(),
                    'reactions_like_only' => $comment->reactions()->where('type', 'like')->count(),
                    'user_id' => $comment->user_id,
                    'is_anonymous' => $comment->user_id === null
                ]);
                
                // Mettre à jour la colonne pour la cohérence
                if ($oldLikesCount !== $realLikesCount) {
                    $comment->update(['likes_count' => $realLikesCount]);
                    Log::info("[AdminBlogController::getComments] SYNC Likes count mis à jour", [
                        'comment_id' => $comment->id,
                        'from' => $oldLikesCount,
                        'to' => $realLikesCount
                    ]);
                }
                
                return [
                    'id' => $comment->id,
                    'content' => $comment->content,
                    'created_at' => $comment->created_at,
                    'updated_at' => $comment->updated_at,
                    'likes_count' => $realLikesCount, // ✅ CORRECTION : Utiliser le vrai compte
                    'user' => $comment->user ? [
                        'id' => $comment->user->id,
                        'name' => $comment->user->name,
                        'email' => $comment->user->email,
                    ] : [
                        'id' => null,
                        'name' => $comment->display_name,
                        'email' => $comment->author_email,
                    ],
                    'replies_count' => $comment->replies_count,
                    'is_anonymous' => $comment->isAnonymous(),
                    'display_name' => $comment->display_name,
                ];
            });

            // ✅ AJOUT : Inclure les stats du post pour le modal
            $postLikesCount = $post->reactions()->where('type', 'like')->count();
            $postViewsCount = $post->views ?: 0;
            
            Log::info("[AdminBlogController::getComments] Commentaires récupérés", [
                'admin_id' => $admin->id,
                'post_id' => $id,
                'comments_count' => $comments->count(),
                'post_likes' => $postLikesCount,
                'post_views' => $postViewsCount
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'comments' => $comments,
                    'post_stats' => [
                        'likes' => $postLikesCount,
                        'views' => $postViewsCount,
                        'comments_count' => $comments->count()
                    ]
                ],
                'message' => 'Commentaires récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::getComments] Erreur", [
                'error' => $e->getMessage(),
                'post_id' => $id,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des commentaires'
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/blog/comments/{commentId} - Supprimer un commentaire
     */
    public function deleteComment(int $commentId): JsonResponse
    {
        try {
            $admin = Auth::user();
            
            $comment = Comment::find($commentId);
            if (!$comment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Commentaire non trouvé'
                ], 404);
            }

            $postTitle = '';
            if ($comment->commentable_type === 'App\\Models\\BlogPost') {
                $post = $comment->commentable;
                $postTitle = $post ? $post->title : '';
            }

            // Supprimer aussi les réponses
            $comment->replies()->delete();
            
            // Supprimer le commentaire
            $comment->delete();

            Log::info("[AdminBlogController::deleteComment] Commentaire supprimé", [
                'admin_id' => $admin->id,
                'comment_id' => $commentId,
                'post_title' => $postTitle
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Commentaire supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[AdminBlogController::deleteComment] Erreur", [
                'error' => $e->getMessage(),
                'comment_id' => $commentId,
                'admin_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du commentaire'
            ], 500);
        }
    }
}