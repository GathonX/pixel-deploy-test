<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function __construct()
{
    $this->middleware('auth:sanctum')->except(['publicIndex', 'publicShow', 'publicPosts', 'trending', 'cloud']);
}

    /**
     * GET /api/categories - Liste des catégories
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Category::active();

            // Filtrage par utilisateur si demandé
            if ($request->get('user_only')) {
                $user = Auth::user();
                $query->where(function($q) use ($user) {
                    $q->whereHas('blogPosts', function($subQ) use ($user) {
                        $subQ->where('user_id', $user->id);
                    })->orWhereHas('socialMediaPosts', function($subQ) use ($user) {
                        $subQ->where('user_id', $user->id);
                    });
                });
            }

            // Tri et pagination
            $categories = $query->withCount(['blogPosts', 'socialMediaPosts'])
                ->orderBy('name')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $categories,
                'message' => 'Catégories récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des catégories'
            ], 500);
        }
    }

    /**
     * GET /api/categories/{id} - Détails d'une catégorie
     */
    public function show(int $id): JsonResponse
    {
        try {
            $category = Category::with(['blogPosts', 'socialMediaPosts'])
                ->withCount(['blogPosts', 'socialMediaPosts'])
                ->find($id);

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Catégorie introuvable'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $category,
                'message' => 'Catégorie récupérée avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la catégorie'
            ], 500);
        }
    }

    /**
     * GET /api/categories/{id}/posts - Posts d'une catégorie
     */
    public function getPosts(int $id, Request $request): JsonResponse
    {
        try {
            $category = Category::find($id);
            if (!$category) {
                return response()->json([
                    'success' => false,
                    'message' => 'Catégorie introuvable'
                ], 404);
            }

            $type = $request->get('type', 'all'); // all, blog, social
            $status = $request->get('status', 'published');

            $posts = [];

            // Récupérer les blog posts
            if (in_array($type, ['all', 'blog'])) {
                $blogPosts = $category->blogPosts()
                    ->with(['user', 'categories'])
                    ->where('status', $status)
                    ->orderBy('published_at', 'desc')
                    ->get();
                
                $posts['blog_posts'] = $blogPosts;
            }

            // Récupérer les social media posts
            if (in_array($type, ['all', 'social'])) {
                $socialPosts = $category->socialMediaPosts()
                    ->with(['user', 'categories'])
                    ->where('status', $status)
                    ->orderBy('published_at', 'desc')
                    ->get();
                
                $posts['social_posts'] = $socialPosts;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'category' => $category,
                    'posts' => $posts
                ],
                'message' => 'Posts de la catégorie récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts'
            ], 500);
        }
    }

    /**
     * GET /api/categories/popular - Catégories populaires
     */
    public function popular(Request $request): JsonResponse
    {
        try {
            $limit = $request->get('limit', 10);

            $categories = Category::active()
                ->withCount(['blogPosts', 'socialMediaPosts'])
                ->orderByRaw('(blog_posts_count + social_media_posts_count) DESC')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories,
                'message' => 'Catégories populaires récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des catégories populaires'
            ], 500);
        }
    }

    /**
     * GET /api/categories/user-top - Top catégories de l'utilisateur
     */
    public function userTop(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $limit = $request->get('limit', 5);

            $categories = Category::whereHas('blogPosts', function($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->orWhereHas('socialMediaPosts', function($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->withCount([
                    'blogPosts' => function($query) use ($user) {
                        $query->where('user_id', $user->id);
                    },
                    'socialMediaPosts' => function($query) use ($user) {
                        $query->where('user_id', $user->id);
                    }
                ])
                ->orderByRaw('(blog_posts_count + social_media_posts_count) DESC')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories,
                'message' => 'Top catégories utilisateur récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des top catégories'
            ], 500);
        }
    }

    /**
     * GET /api/categories/search - Rechercher des catégories
     */
    public function search(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'q' => 'required|string|min:2|max:100'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paramètres de recherche invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $searchTerm = $request->get('q');

            $categories = Category::active()
                ->where(function($query) use ($searchTerm) {
                    $query->where('name', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('description', 'LIKE', "%{$searchTerm}%")
                          ->orWhere('slug', 'LIKE', "%{$searchTerm}%");
                })
                ->withCount(['blogPosts', 'socialMediaPosts'])
                ->orderBy('name')
                ->limit(20)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories,
                'message' => 'Recherche de catégories effectuée avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche'
            ], 500);
        }
    }

    /**
     * GET /api/categories/statistics - Statistiques globales des catégories
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total_categories' => Category::active()->count(),
                'categories_with_posts' => Category::active()
                    ->whereHas('blogPosts')
                    ->orWhereHas('socialMediaPosts')
                    ->count(),
                'most_used_category' => Category::active()
                    ->withCount(['blogPosts', 'socialMediaPosts'])
                    ->orderByRaw('(blog_posts_count + social_media_posts_count) DESC')
                    ->first(),
                'avg_posts_per_category' => Category::active()
                    ->withCount(['blogPosts', 'socialMediaPosts'])
                    ->get()
                    ->avg(function($category) {
                        return $category->blog_posts_count + $category->social_media_posts_count;
                    })
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistiques des catégories récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }

    /**
 * GET /api/public/categories - Catégories publiques
 * ✅ CORRECTION : Afficher TOUTES les catégories actives, pas seulement celles avec posts
 */
public function publicIndex(Request $request): JsonResponse
{
    try {
        // ✅ CORRECTION : Récupérer TOUTES les catégories actives
        $categories = Category::active()
            ->withCount([
                'blogPosts' => function($q) {
                    $q->where('status', 'published');
                }, 
                'socialMediaPosts' => function($q) {
                    $q->where('status', 'published');
                }
            ])
            ->orderBy('name')
            ->paginate($request->get('per_page', 100)); // Augmenter la limite par défaut

        return response()->json([
            'success' => true,
            'data' => $categories,
            'message' => 'Catégories publiques récupérées avec succès'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des catégories publiques'
        ], 500);
    }
}

/**
 * GET /api/public/categories/{slug} - Catégorie publique par slug
 */
public function publicShow(string $slug): JsonResponse
{
    try {
        $category = Category::where('slug', $slug)
            ->active()
            ->with([
                'blogPosts' => function($q) {
                    $q->where('status', 'published')->with(['user', 'categories']);
                },
                'socialMediaPosts' => function($q) {
                    $q->where('status', 'published')->with(['user', 'categories']);
                }
            ])
            ->withCount([
                'blogPosts' => function($q) {
                    $q->where('status', 'published');
                },
                'socialMediaPosts' => function($q) {
                    $q->where('status', 'published');
                }
            ])
            ->first();

        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Catégorie introuvable'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => 'Catégorie publique récupérée avec succès'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération de la catégorie publique'
        ], 500);
    }
}

/**
 * GET /api/public/categories/{slug}/posts - Posts publics d'une catégorie
 */
public function publicPosts(string $slug, Request $request): JsonResponse
{
    try {
        $category = Category::where('slug', $slug)->active()->first();
        if (!$category) {
            return response()->json([
                'success' => false,
                'message' => 'Catégorie introuvable'
            ], 404);
        }

        $type = $request->get('type', 'all');
        $perPage = $request->get('per_page', 10);

        $posts = [];

        if (in_array($type, ['all', 'blog'])) {
            $blogPosts = $category->blogPosts()
                ->where('status', 'published')
                ->with(['user', 'categories'])
                ->orderBy('published_at', 'desc')
                ->paginate($perPage);
            $posts['blog_posts'] = $blogPosts;
        }

        if (in_array($type, ['all', 'social'])) {
            $socialPosts = $category->socialMediaPosts()
                ->where('status', 'published')
                ->with(['user', 'categories'])
                ->orderBy('published_at', 'desc')
                ->paginate($perPage);
            $posts['social_posts'] = $socialPosts;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'category' => $category,
                'posts' => $posts
            ],
            'message' => 'Posts publics de la catégorie récupérés avec succès'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des posts publics'
        ], 500);
    }
}

/**
 * GET /api/public/categories/trending - Catégories tendance
 */

public function trending(Request $request): JsonResponse
{
    try {
        $limit = $request->get('limit', 10);
        $period = $request->get('period', 'week');
        $days = $period === 'month' ? 30 : 7;

        $categories = Category::active()
            ->where(function($query) use ($days) {
                $query->whereHas('blogPosts', function($q) use ($days) {
                    $q->where('status', 'published')
                      ->where('published_at', '>=', now()->subDays($days));
                })->orWhereHas('socialMediaPosts', function($q) use ($days) {
                    $q->where('status', 'published')
                      ->where('published_at', '>=', now()->subDays($days));
                });
            })
            ->withCount([
                'blogPosts' => function($q) use ($days) {
                    $q->where('status', 'published')
                      ->where('published_at', '>=', now()->subDays($days));
                },
                'socialMediaPosts' => function($q) use ($days) {
                    $q->where('status', 'published')
                      ->where('published_at', '>=', now()->subDays($days));
                }
            ])
            ->orderByRaw('(blog_posts_count + social_media_posts_count) DESC')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $categories,
            'message' => 'Catégories tendance récupérées avec succès'
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur lors de la récupération des catégories tendance'
        ], 500);
    }
}


}