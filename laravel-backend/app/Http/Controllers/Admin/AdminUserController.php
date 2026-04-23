<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\Sprint;
use App\Models\UserFeatureAccess;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Auth\Events\Registered;
use Illuminate\Validation\ValidationException;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class AdminUserController extends Controller
{
    /**
     * GET /api/admin/users
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $query = User::orderBy('created_at', 'desc');
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(10);

        return response()->json([
            'message' => 'Liste des utilisateurs récupérée avec succès.',
            'data'    => $users,
        ]);
    }

    /**
     * GET /api/admin/users/{user}
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'message' => 'Détail de l’utilisateur récupéré avec succès.',
            'data'    => $user,
        ]);
    }

    /**
     * POST /api/admin/users
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|unique:users,email',
                'password' => 'required|string|min:6|confirmed',
            ]);

            $data['password'] = Hash::make($data['password']);
            $data['is_admin'] = true;

            $user = User::create($data);
            event(new Registered($user));

            return response()->json([
                'message' => 'Utilisateur administrateur créé avec succès. Un e-mail de vérification a été envoyé.',
                'data'    => $user,
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $e->errors(),
            ], 422);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la création.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PUT /api/admin/users/{user}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        try {
            Log::info('🚀 [AdminUserController] Début mise à jour utilisateur:', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'website_avant' => $user->website,
                'request_data' => $request->all()
            ]);

            $data = $request->validate([
                'name'                  => 'required|string|max:255',
                'email'                 => 'required|email|unique:users,email,' . $user->id,
                'website'               => 'nullable|string|max:255', // Changé de 'url' à 'string' pour accepter string vide
                'password'              => 'nullable|string|min:6|confirmed',
                'is_admin'              => 'required|boolean',
                'plan'                  => 'nullable|string|in:Standard,Premium,Pro',
            ]);

            // Mise à jour des données de base
            $user->name = $data['name'];
            $user->email = $data['email'];
            $user->is_admin = $data['is_admin'];
            
            // Mise à jour du website (permet la suppression avec string vide)
            if (array_key_exists('website', $data)) {
                $websiteAncien = $user->website;
                $websiteNouveau = empty(trim($data['website'])) ? null : $data['website'];
                $user->website = $websiteNouveau;
                
                Log::info('🔄 [AdminUserController] Mise à jour website:', [
                    'user_id' => $user->id,
                    'website_ancien' => $websiteAncien,
                    'website_nouveau' => $websiteNouveau,
                    'website_data_recu' => $data['website']
                ]);
            }
            
            // Mise à jour du plan si fourni (temporairement désactivé le temps de la migration)
            // if (isset($data['plan'])) {
            //     $user->plan = $data['plan'];
            // }

            // Mise à jour du mot de passe seulement s'il est fourni
            if (!empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            $user->save();
            
            Log::info('✅ [AdminUserController] Utilisateur sauvegardé:', [
                'user_id' => $user->id,
                'website_final' => $user->website
            ]);

            return response()->json([
                'message' => 'Utilisateur modifié avec succès.',
                'data'    => $user->fresh(),
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $e->errors(),
            ], 422);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Une erreur est survenue lors de la modification.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/admin/users/stats
     */
    public function stats(): JsonResponse
    {
        $total    = User::count();
        $active   = User::whereNotNull('email_verified_at')->count();
        $inactive = User::whereNull('email_verified_at')->count();
        // pour l’instant on n’a pas encore de table subscription
        $premium  = 0;

        return response()->json(compact('total','active','inactive','premium'));
    }

    /**
     * DELETE /api/admin/users/{user}
     */
    public function destroy(User $user): JsonResponse
    {
        try {
            $user->delete();
            return response()->json([
                'message' => 'Utilisateur supprimé avec succès.',
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Récupérer les social posts d'un utilisateur groupés par achat
     * GET /api/admin/users/{user}/social-posts
     */
    public function getSocialPosts(User $user): JsonResponse
    {
        try {
            // Récupérer tous les achats social_media de l'utilisateur
            $socialAccesses = UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'social_media');
                })
                ->where('user_id', $user->id)
                ->with('feature')
                ->orderBy('created_at', 'desc')
                ->get();

            // Pour chaque achat, récupérer ses posts
            $groupedPosts = $socialAccesses->map(function($access) {
                $posts = SocialMediaPost::where('user_feature_access_id', $access->id)
                    ->orderBy('created_at', 'desc')
                    ->get();

                return [
                    'access_id' => $access->id,
                    'feature_name' => $access->feature->name,
                    'status' => $access->status,
                    'is_active' => $access->isActive(),
                    'created_at' => $access->created_at,
                    'expires_at' => $access->expires_at,
                    'posts_count' => $posts->count(),
                    'posts' => $posts
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email
                    ],
                    'purchases' => $groupedPosts
                ]
            ]);

        } catch (Exception $e) {
            Log::error("❌ [ADMIN] Erreur récupération social posts", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des posts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Récupérer les blog posts d'un utilisateur groupés par achat
     * GET /api/admin/users/{user}/blog-posts
     */
    public function getBlogPosts(User $user): JsonResponse
    {
        try {
            // Récupérer tous les achats blog de l'utilisateur
            $blogAccesses = UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'blog');
                })
                ->where('user_id', $user->id)
                ->with('feature')
                ->orderBy('created_at', 'desc')
                ->get();

            // Pour chaque achat, récupérer ses posts
            $groupedPosts = $blogAccesses->map(function($access) {
                $posts = BlogPost::where('user_feature_access_id', $access->id)
                    ->with(['categories'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                return [
                    'access_id' => $access->id,
                    'feature_name' => $access->feature->name,
                    'status' => $access->status,
                    'is_active' => $access->isActive(),
                    'created_at' => $access->created_at,
                    'expires_at' => $access->expires_at,
                    'posts_count' => $posts->count(),
                    'posts' => $posts
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email
                    ],
                    'purchases' => $groupedPosts
                ]
            ]);

        } catch (Exception $e) {
            Log::error("❌ [ADMIN] Erreur récupération blog posts", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des articles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ NOUVEAU : Récupérer les sprints d'un utilisateur groupés par achat
     * GET /api/admin/users/{user}/sprints
     */
    public function getSprints(User $user): JsonResponse
    {
        try {
            // Récupérer tous les achats sprint_planning de l'utilisateur
            $sprintAccesses = UserFeatureAccess::whereHas('feature', function($query) {
                    $query->where('key', 'sprint_planning');
                })
                ->where('user_id', $user->id)
                ->with('feature')
                ->orderBy('created_at', 'desc')
                ->get();

            // Pour chaque achat, récupérer ses sprints
            $groupedSprints = $sprintAccesses->map(function($access) {
                $sprints = Sprint::where('user_feature_access_id', $access->id)
                    ->with(['tasks', 'project'])
                    ->orderBy('created_at', 'desc')
                    ->get();

                return [
                    'access_id' => $access->id,
                    'feature_name' => $access->feature->name,
                    'status' => $access->status,
                    'is_active' => $access->isActive(),
                    'created_at' => $access->created_at,
                    'expires_at' => $access->expires_at,
                    'sprints_count' => $sprints->count(),
                    'sprints' => $sprints
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email
                    ],
                    'purchases' => $groupedSprints
                ]
            ]);

        } catch (Exception $e) {
            Log::error("❌ [ADMIN] Erreur récupération sprints", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des sprints',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
