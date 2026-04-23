<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;  // ✅ IMPORT AJOUTÉ

class UserController extends Controller
{
    /**
     * GET /api/users/{id} - Récupérer un utilisateur par ID
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            // Charger les compteurs
            $user->loadCount(['blogPosts', 'socialMediaPosts']);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'bio' => $user->bio,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'language' => $user->language,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at,
                    'articles_count' => $user->blog_posts_count ?? 0,
                    'social_posts_count' => $user->social_media_posts_count ?? 0,
                ],
                'message' => 'Utilisateur récupéré avec succès'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé'
            ], 404);
        }
    }

    /**
     * GET /api/users/search - Rechercher des utilisateurs
     */
    public function search(Request $request): JsonResponse
    {
        try {
            $query = $request->get('q', '');
            $limit = min($request->get('limit', 20), 50);
            
            $users = User::where('name', 'like', "%{$query}%")
                ->orWhere('email', 'like', "%{$query}%")
                ->limit($limit)
                ->get(['id', 'name', 'email', 'avatar', 'bio', 'created_at']);
            
            return response()->json([
                'success' => true,
                'data' => $users,
                'message' => 'Recherche effectuée avec succès'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche'
            ], 500);
        }
    }

    /**
     * GET /api/users/popular-authors - Auteurs populaires
     */
    public function getPopularAuthors(Request $request): JsonResponse
    {
        try {
            $limit = min($request->get('limit', 10), 50);
            
            $authors = User::select('users.*')
                ->join('blog_posts', 'users.id', '=', 'blog_posts.user_id')
                ->selectRaw('users.*, count(blog_posts.id) as articles_count, sum(blog_posts.likes) as total_likes')
                ->where('blog_posts.status', 'published')
                ->groupBy('users.id')
                ->orderByDesc('total_likes')
                ->orderByDesc('articles_count')
                ->limit($limit)
                ->get(['id', 'name', 'email', 'avatar', 'bio']);
            
            return response()->json([
                'success' => true,
                'data' => $authors,
                'message' => 'Auteurs populaires récupérés avec succès'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des auteurs populaires'
            ], 500);
        }
    }

    /**
     * GET /api/public/users/{id} - Version publique
     */
    public function showPublic(int $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar' => $user->avatar,
                    'bio' => $user->bio,
                    'created_at' => $user->created_at,
                ],
                'message' => 'Profil public récupéré avec succès'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé'
            ], 404);
        }
    }

    /**
     * ✅ CORRIGÉ : GET /api/public/users/{id}/stats - Statistiques publiques
     */
    public function getPublicStats(int $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            // Statistiques des articles publics seulement
            $articlesStats = BlogPost::where('user_id', $id)
                ->where('status', 'published') // Seulement les articles publiés
                ->selectRaw('
                    count(*) as total,
                    sum(likes) as total_likes,
                    sum(views) as total_views,
                    avg(likes) as avg_likes_per_article
                ')
                ->first();
            
            // Compteur de commentaires publics (si table comments existe)
            $totalComments = 0;
            try {
                if (Schema::hasTable('comments')) {
                    $totalComments = DB::table('comments')
                        ->whereIn('commentable_id', function($query) use ($id) {
                            $query->select('id')
                                  ->from('blog_posts')
                                  ->where('user_id', $id)
                                  ->where('status', 'published'); // Seulement articles publiés
                        })
                        ->where('commentable_type', 'App\\Models\\BlogPost')
                        ->count();
                }
            } catch (\Exception $e) {
                $totalComments = 0;
            }
            
            // ✅ CORRECTION CRITIQUE : Utiliser 'user_follows' au lieu de 'follows'
            $followStats = ['followers_count' => 0, 'following_count' => 0];
            try {
                if (Schema::hasTable('user_follows')) {  // ✅ CHANGÉ: user_follows
                    Log::info("Calcul followers pour utilisateur {$id}");  // ✅ CORRIGÉ: Log sans backslash
                    
                    $followersCount = DB::table('user_follows')->where('following_id', $id)->count();
                    $followingCount = DB::table('user_follows')->where('follower_id', $id)->count();
                    
                    Log::info("Résultats followers:", [  // ✅ CORRIGÉ: Log sans backslash
                        'user_id' => $id,
                        'followers_count' => $followersCount,
                        'following_count' => $followingCount
                    ]);
                    
                    $followStats = [
                        'followers_count' => $followersCount,
                        'following_count' => $followingCount,
                    ];
                } else {
                    Log::warning("Table user_follows n'existe pas");  // ✅ CORRIGÉ: Log sans backslash
                }
            } catch (\Exception $e) {
                Log::error("Erreur calcul followers:", [  // ✅ CORRIGÉ: Log sans backslash
                    'user_id' => $id,
                    'error' => $e->getMessage()
                ]);
                $followStats = ['followers_count' => 0, 'following_count' => 0];
            }
            
            Log::info("Stats finales pour utilisateur {$id}:", [  // ✅ CORRIGÉ: Log sans backslash
                'articles' => $articlesStats,
                'social' => $followStats
            ]);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'articles' => [
                        'total' => (int)($articlesStats->total ?? 0),
                        'published' => (int)($articlesStats->total ?? 0), // Seulement publiés
                        'drafts' => 0, // Masqué en version publique
                        'scheduled' => 0, // Masqué en version publique
                    ],
                    'engagement' => [
                        'total_likes' => (int)($articlesStats->total_likes ?? 0),
                        'total_views' => (int)($articlesStats->total_views ?? 0),
                        'total_comments' => (int)$totalComments,
                        'avg_likes_per_article' => round($articlesStats->avg_likes_per_article ?? 0, 1),
                    ],
                    'social' => $followStats  // ✅ DONNÉES CORRECTES
                ],
                'message' => 'Statistiques publiques récupérées avec succès'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur stats publiques utilisateur:', [  // ✅ CORRIGÉ: Log sans backslash
                'user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques publiques'
            ], 500);
        }
    }

    /**
     * ✅ CORRIGÉ : GET /api/users/{id}/stats - Statistiques utilisateurs authentifiés
     */
    public function getStats(int $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            // Statistiques des articles
            $articlesStats = BlogPost::where('user_id', $id)
                ->selectRaw('
                    count(*) as total,
                    sum(case when status = "published" then 1 else 0 end) as published,
                    sum(case when status = "draft" then 1 else 0 end) as drafts,
                    sum(case when status = "scheduled" then 1 else 0 end) as scheduled,
                    sum(likes) as total_likes,
                    sum(views) as total_views,
                    avg(likes) as avg_likes_per_article
                ')
                ->first();
            
            // Compteur de commentaires (si table comments existe)
            $totalComments = 0;
            try {
                if (Schema::hasTable('comments')) {  // ✅ CORRIGÉ: Schema sans backslash
                    $totalComments = DB::table('comments')
                        ->whereIn('commentable_id', function($query) use ($id) {
                            $query->select('id')
                                  ->from('blog_posts')
                                  ->where('user_id', $id);
                        })
                        ->where('commentable_type', 'App\\Models\\BlogPost')
                        ->count();
                }
            } catch (\Exception $e) {
                $totalComments = 0;
            }
            
            // ✅ CORRECTION CRITIQUE : Stats de follow avec user_follows
            $followStats = ['followers_count' => 0, 'following_count' => 0];
            try {
                if (Schema::hasTable('user_follows')) {  // ✅ CHANGÉ: user_follows + Schema sans backslash
                    $followStats = [
                        'followers_count' => DB::table('user_follows')->where('following_id', $id)->count(),
                        'following_count' => DB::table('user_follows')->where('follower_id', $id)->count(),
                    ];
                }
            } catch (\Exception $e) {
                $followStats = ['followers_count' => 0, 'following_count' => 0];
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'articles' => [
                        'total' => (int)($articlesStats->total ?? 0),
                        'published' => (int)($articlesStats->published ?? 0),
                        'drafts' => (int)($articlesStats->drafts ?? 0),
                        'scheduled' => (int)($articlesStats->scheduled ?? 0),
                    ],
                    'engagement' => [
                        'total_likes' => (int)($articlesStats->total_likes ?? 0),
                        'total_views' => (int)($articlesStats->total_views ?? 0),
                        'total_comments' => (int)$totalComments,
                        'avg_likes_per_article' => round($articlesStats->avg_likes_per_article ?? 0, 1),
                    ],
                    'social' => $followStats
                ],
                'message' => 'Statistiques récupérées avec succès'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erreur stats utilisateur:', [  // ✅ CORRIGÉ: Log sans backslash
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }
}