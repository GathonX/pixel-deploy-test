<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\Category;
use App\Services\ContentGeneration\PostManagementService;
use App\Services\ContentGeneration\InteractionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BlogController extends Controller
{
    private PostManagementService $postManagementService;
    private InteractionService $interactionService;

    public function __construct(
        PostManagementService $postManagementService,
        InteractionService $interactionService
    ) {
        $this->middleware('auth:sanctum')->except(['publicIndex', 'publicShow', 'featured']);
        $this->postManagementService = $postManagementService;
        $this->interactionService = $interactionService;
    }

    public function uploadImage(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
            ]);

            $user = Auth::user();
            $image = $request->file('image');

            // Génération nom unique
            $timestamp = now()->format('Ymd_His');
            $randomId = Str::random(8);
            $extension = $image->getClientOriginalExtension();
            $filename = "blog_image_{$user->id}_{$timestamp}_{$randomId}.{$extension}";

            // Stockage
            $path = $image->storeAs('blog-images', $filename, 'public');

            // Log
            Log::info("[BlogController::uploadImage] Image uploadée", [
                'user_id' => $user->id,
                'filename' => $filename,
                'path' => $path,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'path' => $path,
                    'filename' => $filename,
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
            Log::error("[BlogController::uploadImage] Erreur upload", [
                'error' => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload de l\'image'
            ], 500);
        }
    }

    /**
     * POST /api/blog - Créer un nouveau blog post manuellement
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'title' => 'required|string|min:3|max:255',
                'summary' => 'required|string|min:10|max:500', 
                'content' => 'required|string|min:20',
                'header_image' => 'nullable|url',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'categories' => 'nullable|array',
                'categories.*' => 'string|max:100',
                'status' => 'nullable|in:draft,scheduled,published',
                'scheduled_at' => 'nullable|date|after:now',
                'scheduled_time' => 'nullable|date_format:H:i'
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

            // Créer le blog post — accès basé sur le plan (OFFER.md), pas sur UserFeatureAccess
            $blogPost = BlogPost::create([
                'user_id' => $user->id,
                'user_feature_access_id' => null,
                'slug' => $slug,
                'title' => $request->title,
                'summary' => $request->summary,
                'content' => $request->content,
                'header_image' => $request->header_image,
                'tags' => $request->tags ?? [],
                'status' => $request->status ?? 'draft',
                'scheduled_at' => $request->scheduled_at,
                'scheduled_time' => $request->scheduled_time,
                'is_ai_generated' => false, // Création manuelle
                'generation_context' => null, // Pas de contexte IA
                'published_at' => $request->status === 'published' ? now() : null
            ]);

            // Associer les catégories si présentes
            if ($request->categories && !empty($request->categories)) {
                $categoryIds = [];
                foreach ($request->categories as $categoryName) {
                    $category = Category::firstOrCreate(
                        ['name' => $categoryName, 'slug' => Str::slug($categoryName)],
                        ['description' => 'Catégorie créée automatiquement', 'is_active' => true]
                    );
                    $categoryIds[] = $category->id;
                }
                $blogPost->categories()->sync($categoryIds);
            }

            // Charger les relations pour la réponse
            $blogPost->load(['categories', 'user']);

            return response()->json([
                'success' => true,
                'data' => $blogPost,
                'message' => 'Article de blog créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'article'
            ], 500);
        }
    }

    /**
     * GET /api/blog - Liste des blog posts de l'utilisateur
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $filters = [
                'type'    => 'blog',
                'status'  => $request->get('status', 'all'),
                'per_page'=> $request->get('per_page', 10),
                'page'    => $request->get('page', 1),
                'site_id' => $request->get('site_id') ?: null,
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
                'data' => $result['data']['blog_posts'],
                'message' => 'Blog posts récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des blog posts'
            ], 500);
        }
    }

    /**
     * GET /api/blog/{id} - Détails d'un blog post
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $result = $this->postManagementService->getPostDetails('blog', $id, $user);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 404);
            }

            // Incrémenter les vues
            $this->interactionService->incrementViews('blog', $id, $user);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Blog post récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du blog post'
            ], 500);
        }
    }

    /**
     * PUT /api/blog/{id} - Mettre à jour un blog post
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $validator = Validator::make($request->all(), [
                'title' => 'sometimes|string|min:3|max:255',
                'summary' => 'sometimes|string|min:10|max:500',
                'content' => 'sometimes|string|min:10',
                'header_image' => 'sometimes|url',
                'tags' => 'sometimes|array',
                'tags.*' => 'string|max:50',
                'categories' => 'sometimes|array',
                'categories.*' => 'string|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $request->only(['title', 'summary', 'content', 'header_image', 'tags', 'categories']);

            $result = $this->postManagementService->updatePost($user, 'blog', $id, $data);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['post'],
                'message' => 'Blog post mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du blog post'
            ], 500);
        }
    }

    /**
     * POST /api/blog/{id}/status - Changer le statut d'un blog post
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
                'blog',
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
     * POST /api/blog/{id}/duplicate - Dupliquer un blog post
     */
    public function duplicate(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $result = $this->postManagementService->duplicatePost($user, 'blog', $id);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $result['error']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result['data']['duplicated_post'],
                'message' => 'Blog post dupliqué avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la duplication'
            ], 500);
        }
    }

    /**
     * GET /api/blog/statistics - Statistiques des blog posts de l'utilisateur
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
                'data' => $result['data']['blog_posts'],
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
     * GET /api/public/blog - Blog posts publiés (publique)
     */
    public function publicIndex(Request $request): JsonResponse
    {
        try {
            // Pas d'authentification requise pour les routes publiques
            $filters = [
                'status' => 'published', // Seulement les posts publiés
                'per_page' => $request->get('per_page', 10),
                'page' => $request->get('page', 1),
                'category' => $request->get('category')
            ];

            $result = $this->postManagementService->getPublicPosts('blog', $filters);

            return response()->json([
                'success' => true,
                'data' => $result['data'] ?? [],
                'message' => 'Posts publics récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts publics'
            ], 500);
        }
    }

    /**
     * GET /api/public/blog/{slug} - Détail blog post public par slug
     */
    public function publicShow(string $slug): JsonResponse
    {
        try {
            $result = $this->postManagementService->getPublicPostBySlug('blog', $slug);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post non trouvé'
                ], 404);
            }

            // Incrémenter les vues sans authentification
            $this->interactionService->incrementViews('blog', $result['data']['id'], null);

            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'message' => 'Post public récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du post public'
            ], 500);
        }
    }

    /**
     * GET /api/public/blog/featured - Blog posts mis en avant
     */
    public function featured(): JsonResponse
    {
        try {
            $result = $this->postManagementService->getFeaturedPosts('blog');

            return response()->json([
                'success' => true,
                'data' => $result['data'] ?? [],
                'message' => 'Posts en vedette récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts en vedette'
            ], 500);
        }
    }

    /**
     * GET /api/blog/calendar - Posts blog pour calendrier
     * Retourne tous les posts (draft, scheduled, published) pour le calendrier
     */
    public function calendar(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            $query = $user->blogPosts()->with(['categories', 'user']);

            // ✅ FILTRES : Année, mois, statut
            if ($request->has('year')) {
                $query->whereYear('created_at', $request->year);
            }

            if ($request->has('month')) {
                $query->whereMonth('created_at', $request->month);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // ✅ TOUS les posts blog (drafts, published, scheduled)
            $posts = $query->orderBy('created_at', 'desc')->get();

            Log::info("📅 Calendrier Blog: {$posts->count()} posts trouvés", [
                'user_id' => $user->id,
                'filters' => $request->only(['year', 'month', 'status'])
            ]);

            return response()->json([
                'success' => true,
                'data' => $posts
            ]);
        } catch (\Exception $e) {
            Log::error("❌ Erreur calendrier blog", [
                'error' => $e->getMessage(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur récupération calendrier blog'
            ], 500);
        }
    }

    /**
     * DELETE /api/blog/{id} - Supprimer un blog post
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $user = Auth::user();

            $post = BlogPost::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$post) {
                return response()->json([
                    'success' => false,
                    'message' => 'Post non trouvé ou non autorisé'
                ], 404);
            }

            Log::info("🗑️ Suppression blog post", [
                'user_id' => $user->id,
                'post_id' => $id,
                'title' => $post->title
            ]);

            $post->delete();

            return response()->json([
                'success' => true,
                'message' => 'Post supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur suppression blog post", [
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
