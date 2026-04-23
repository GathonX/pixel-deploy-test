<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\Category;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Pagination\LengthAwarePaginator;

class PostManagementService
{
    
        /**
     * ✅ CORRECTION : Obtenir posts d'un utilisateur avec filtres
     * Le problème était que la structure de retour ne correspondait pas 
     * à ce que le contrôleur attendait (pagination Laravel)
     */
    public function getUserPosts(User $user, array $filters = []): array
    {
        try {
            Log::info("📋 Récupération posts utilisateur", [
                'user_id' => $user->id,
                'filters' => $filters
            ]);

            $type     = $filters['type'] ?? 'all'; // all, blog, social
            $status   = $filters['status'] ?? 'all'; // all, draft, scheduled, published
            $platform = $filters['platform'] ?? null; // pour social media
            $perPage  = $filters['per_page'] ?? 10;
            $page     = $filters['page'] ?? 1;
            $siteId   = $filters['site_id'] ?? null; // filtrage par site

            $results = [];

            // ✅ CORRECTION : Récupérer les blog posts avec réactions pour synchronisation
            if (in_array($type, ['all', 'blog'])) {
                // ✅ NOUVEAU : Récupérer l'access_id actif pour le blog
                $blogAccessId = $this->getActiveAccessId($user, 'blog');

                $blogQuery = $user->blogPosts()->with(['categories', 'user', 'reactions']);

                // ✅ NOUVEAU : Filtrer uniquement les posts du purchase actif
                if ($blogAccessId) {
                    $blogQuery->where('user_feature_access_id', $blogAccessId);
                }

                // Filtrer par site si fourni
                if ($siteId) {
                    $blogQuery->where('site_id', $siteId);
                }

                if ($status !== 'all') {
                    $blogQuery->where('status', $status);
                }

                // ✅ NOUVEAU : Utiliser paginate() au lieu de get() pour correspondre au contrôleur
                $blogPosts = $blogQuery->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
                
                // ✅ SYNCHRONISATION : Mettre à jour les statistiques avec les vraies données
                foreach ($blogPosts->items() as $post) {
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
                
                // ✅ NOUVEAU : Structure compatible avec le contrôleur
                $results['blog_posts'] = [
                    'data' => $blogPosts->items(),
                    'current_page' => $blogPosts->currentPage(),
                    'last_page' => $blogPosts->lastPage(),
                    'per_page' => $blogPosts->perPage(),
                    'total' => $blogPosts->total()
                ];

                Log::info("✅ Blog posts récupérés", [
                    'count' => count($blogPosts->items()),
                    'total' => $blogPosts->total(),
                    'user_id' => $user->id
                ]);
            }

            // Récupérer les social media posts (même correction)
            if (in_array($type, ['all', 'social'])) {
                // ✅ NOUVEAU : Récupérer l'access_id actif pour social_media
                $socialAccessId = $this->getActiveAccessId($user, 'social_media');

                $socialQuery = $user->socialMediaPosts()->with(['categories', 'user']);

                // ✅ NOUVEAU : Filtrer uniquement les posts du purchase actif
                if ($socialAccessId) {
                    $socialQuery->where('user_feature_access_id', $socialAccessId);
                }

                // Filtrer par site si fourni
                if ($siteId) {
                    $socialQuery->where('site_id', $siteId);
                }

                if ($status !== 'all') {
                    $socialQuery->where('status', $status);
                }

                if ($platform) {
                    $socialQuery->where('platform', $platform);
                }

                $socialPosts = $socialQuery->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
                
                $results['social_posts'] = [
                    'data' => $socialPosts->items(),
                    'current_page' => $socialPosts->currentPage(),
                    'last_page' => $socialPosts->lastPage(),
                    'per_page' => $socialPosts->perPage(),
                    'total' => $socialPosts->total()
                ];
            }

            // Pagination si nécessaire pour 'all'
            if ($type === 'all') {
                $allPosts = collect();
                if (isset($results['blog_posts'])) {
                    $allPosts = $allPosts->merge($results['blog_posts']['data']);
                }
                if (isset($results['social_posts'])) {
                    $allPosts = $allPosts->merge($results['social_posts']['data']);
                }
                
                $allPosts = $allPosts->sortByDesc('created_at');
                $results['all_posts'] = $this->paginateCollection($allPosts, $perPage, $page);
            }

            return [
                'success' => true,
                'data' => $results
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur récupération posts", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération des posts: ' . $e->getMessage()
            ];
        }
    }


       /**
     * Obtenir un post spécifique avec détails
     */
    public function getPostDetails(string $postType, int $postId, ?User $user = null): array
    {
        try {
            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            // 🔧 CORRECTION : Utiliser la bonne relation selon le modèle
            $commentsRelation = $postType === 'blog' ? 'comments' : 'postComments';
            
            $post = $model::with(['categories', 'user', $commentsRelation . '.user', $commentsRelation . '.replies.user'])
                ->find($postId);

            if (!$post) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable'
                ];
            }

            // Vérifier permissions si utilisateur spécifié
            if ($user && !$this->canUserAccessPost($user, $post)) {
                return [
                    'success' => false,
                    'error' => 'Accès non autorisé'
                ];
            }

            // Ajouter statistiques
            $stats = $this->getPostStatistics($post);

            return [
                'success' => true,
                'data' => [
                    'post' => $post,
                    'statistics' => $stats,
                    'type' => $postType
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur détails post", [
                'post_type' => $postType,
                'post_id' => $postId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération du post'
            ];
        }
    }


    /**
     * Mettre à jour un post (modification autorisée)
     */
    public function updatePost(User $user, string $postType, int $postId, array $data): array
    {
        try {
            Log::info("✏️ Mise à jour post", [
                'user_id' => $user->id,
                'post_type' => $postType,
                'post_id' => $postId
            ]);

            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $post = $model::find($postId);
            if (!$post) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable'
                ];
            }

            // Vérifier que l'utilisateur est propriétaire
            if ($post->user_id !== $user->id) {
                return [
                    'success' => false,
                    'error' => 'Vous ne pouvez modifier que vos propres posts'
                ];
            }

            DB::beginTransaction();

            // Valider et préparer les données selon le type
            $updateData = $this->prepareUpdateData($postType, $data);
            if (!$updateData['valid']) {
                DB::rollBack();
                return [
                    'success' => false,
                    'error' => $updateData['error']
                ];
            }

            // Mettre à jour le post
            $post->update($updateData['data']);

            // Mettre à jour les catégories si fournies
            if (isset($data['categories'])) {
                $this->updatePostCategories($post, $data['categories'], $postType);
            }

            DB::commit();

            // Recharger avec relations
            $post->load(['categories', 'user']);

            Log::info("✅ Post mis à jour", [
                'post_id' => $post->id,
                'user_id' => $user->id
            ]);

            return [
                'success' => true,
                'data' => [
                    'post' => $post
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Erreur mise à jour post", [
                'user_id' => $user->id,
                'post_type' => $postType,
                'post_id' => $postId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la mise à jour du post'
            ];
        }
    }

    /**
     * Changer le statut d'un post
     */
    public function changePostStatus(User $user, string $postType, int $postId, string $newStatus, array $options = []): array
    {
        try {
            Log::info("🔄 Changement statut post", [
                'user_id' => $user->id,
                'post_type' => $postType,
                'post_id' => $postId,
                'new_status' => $newStatus
            ]);

            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $post = $model::find($postId);
            if (!$post || $post->user_id !== $user->id) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable ou non autorisé'
                ];
            }

            // Valider le nouveau statut
            $validStatuses = ['draft', 'scheduled', 'published'];
            if (!in_array($newStatus, $validStatuses)) {
                return [
                    'success' => false,
                    'error' => 'Statut non valide'
                ];
            }

            $updateData = ['status' => $newStatus];

            // Gérer les dates selon le statut
            if ($newStatus === 'published') {
                $updateData['published_at'] = now();
            } elseif ($newStatus === 'scheduled') {
                if (empty($options['scheduled_at'])) {
                    return [
                        'success' => false,
                        'error' => 'Date de programmation requise'
                    ];
                }
                $updateData['published_at'] = $options['scheduled_at'];
                $updateData['scheduled_time'] = $options['scheduled_time'] ?? null;
            } elseif ($newStatus === 'draft') {
                $updateData['published_at'] = null;
                $updateData['scheduled_time'] = null;
            }

            $post->update($updateData);

            Log::info("✅ Statut changé", [
                'post_id' => $post->id,
                'old_status' => $post->getOriginal('status'),
                'new_status' => $newStatus
            ]);

            return [
                'success' => true,
                'data' => [
                    'post' => $post->fresh(),
                    'old_status' => $post->getOriginal('status'),
                    'new_status' => $newStatus
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur changement statut", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors du changement de statut'
            ];
        }
    }

    /**
     * Dupliquer un post
     */
    public function duplicatePost(User $user, string $postType, int $postId): array
    {
        try {
            Log::info("📋 Duplication post", [
                'user_id' => $user->id,
                'post_type' => $postType,
                'post_id' => $postId
            ]);

            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $originalPost = $model::with('categories')->find($postId);
            if (!$originalPost || $originalPost->user_id !== $user->id) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable ou non autorisé'
                ];
            }

            DB::beginTransaction();

            // Préparer les données pour la duplication
            $duplicateData = $originalPost->toArray();
            unset($duplicateData['id'], $duplicateData['created_at'], $duplicateData['updated_at']);
            
            // Modifier les champs spécifiques
            $duplicateData['status'] = 'draft';
            $duplicateData['published_at'] = null;
            $duplicateData['scheduled_time'] = null;
            $duplicateData['views'] = 0;
            $duplicateData['likes'] = 0;
            
            if ($postType === 'blog') {
                $duplicateData['title'] = $duplicateData['title'] . ' (Copie)';
                $duplicateData['slug'] = $this->generateUniqueSlug($duplicateData['title']);
            } else {
                $duplicateData['comments'] = 0;
                $duplicateData['shares'] = 0;
            }

            // Créer le nouveau post
            $newPost = $model::create($duplicateData);

            // Dupliquer les catégories
            if ($originalPost->categories->count() > 0) {
                $categoryIds = $originalPost->categories->pluck('id')->toArray();
                $newPost->categories()->sync($categoryIds);
            }

            DB::commit();

            Log::info("✅ Post dupliqué", [
                'original_id' => $postId,
                'new_id' => $newPost->id,
                'user_id' => $user->id
            ]);

            return [
                'success' => true,
                'data' => [
                    'original_post' => $originalPost,
                    'duplicated_post' => $newPost->load('categories')
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error("❌ Erreur duplication post", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la duplication'
            ];
        }
    }

    /**
 * Obtenir statistiques utilisateur globales
 */
public function getUserPostsStatistics(User $user): array
{
    try {
        $blogStats = [
            'total' => (int) $user->blogPosts()->count(),
            'published' => (int) $user->blogPosts()->where('status', 'published')->count(),
            'drafts' => (int) $user->blogPosts()->where('status', 'draft')->count(),
            'scheduled' => (int) $user->blogPosts()->where('status', 'scheduled')->count(),
            'total_views' => (int) $user->blogPosts()->sum('views'),
            'total_likes' => (int) $user->blogPosts()->sum('likes')
        ];

        $socialStats = [
            'total' => (int) $user->socialMediaPosts()->count(),
            'published' => (int) $user->socialMediaPosts()->where('status', 'published')->count(),
            'drafts' => (int) $user->socialMediaPosts()->where('status', 'draft')->count(),
            'scheduled' => (int) $user->socialMediaPosts()->where('status', 'scheduled')->count(),
            'total_views' => (int) $user->socialMediaPosts()->sum('views'),
            'total_likes' => (int) $user->socialMediaPosts()->sum('likes'),
            'total_shares' => (int) $user->socialMediaPosts()->sum('shares'),
            'by_platform' => $user->socialMediaPosts()
                ->selectRaw('platform, count(*) as count')
                ->groupBy('platform')
                ->pluck('count', 'platform')
                ->mapWithKeys(function ($count, $platform) {
                    return [$platform => (int) $count];
                })
                ->toArray()
        ];

        return [
            'success' => true,
            'data' => [
                'blog_posts' => $blogStats,
                'social_posts' => $socialStats,
                'total_posts' => $blogStats['total'] + $socialStats['total'],
                'most_used_categories' => $this->getUserTopCategories($user)
            ]
        ];

    } catch (\Exception $e) {
        Log::error("❌ Erreur statistiques utilisateur", [
            'user_id' => $user->id,
            'error' => $e->getMessage()
        ]);

        return [
            'success' => false,
            'error' => 'Erreur lors de la récupération des statistiques'
        ];
    }
}

    // ===== MÉTHODES PRIVÉES =====

    private function getModelByType(string $type): ?string
    {
        $models = [
            'blog' => BlogPost::class,
            'social' => SocialMediaPost::class,
            'blog_post' => BlogPost::class,
            'social_media_post' => SocialMediaPost::class
        ];

        return $models[$type] ?? null;
    }

    private function canUserAccessPost(User $user, $post): bool
    {
        // Propriétaire peut toujours accéder
        if ($post->user_id === $user->id) {
            return true;
        }

        // Sinon, seulement si publié
        return $post->status === 'published';
    }
 private function getPostStatistics($post): array
    {
        // 🔧 CORRECTION : Utiliser la bonne relation selon le modèle
        $commentsRelation = $post instanceof BlogPost ? 'comments' : 'postComments';
        
        $stats = [
            'views' => $post->views,
            'likes' => $post->reactions()->where('type', 'like')->count(),
            'comments' => $post->{$commentsRelation}()->count()
        ];

        if ($post instanceof SocialMediaPost) {
            $stats['shares'] = $post->shares;
        }

        return $stats;
    }

    private function prepareUpdateData(string $postType, array $data): array
    {
        $allowedFields = $postType === 'blog' 
            ? ['title', 'summary', 'content', 'header_image', 'tags']
            : ['content', 'images', 'video', 'tags'];

        $updateData = [];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                // Validations spécifiques
                if ($field === 'title' && strlen($data[$field]) < 3) {
                    return ['valid' => false, 'error' => 'Le titre doit contenir au moins 3 caractères'];
                }
                
                if ($field === 'content' && strlen($data[$field]) < 10) {
                    return ['valid' => false, 'error' => 'Le contenu doit contenir au moins 10 caractères'];
                }

                $updateData[$field] = $data[$field];
            }
        }

        // Générer nouveau slug si titre modifié
        if ($postType === 'blog' && isset($updateData['title'])) {
            $updateData['slug'] = $this->generateUniqueSlug($updateData['title']);
        }

        return ['valid' => true, 'data' => $updateData];
    }

    private function updatePostCategories($post, array $categoryNames, string $postType): void
    {
        $categoryIds = [];
        
        foreach ($categoryNames as $categoryName) {
            $category = Category::firstOrCreate(
                ['slug' => Str::slug($categoryName)],
                ['name' => $categoryName, 'is_active' => true]
            );
            $categoryIds[] = $category->id;
        }
        
        $post->categories()->sync($categoryIds);
    }

    private function generateUniqueSlug(string $title): string
    {
        $baseSlug = Str::slug($title);
        $slug = $baseSlug;
        $counter = 1;

        while (BlogPost::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    private function getUserTopCategories(User $user, int $limit = 5): array
    {
        return Category::whereHas('blogPosts', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->orWhereHas('socialMediaPosts', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->withCount(['blogPosts' => function($query) use ($user) {
                $query->where('user_id', $user->id);
            }, 'socialMediaPosts' => function($query) use ($user) {
                $query->where('user_id', $user->id);
            }])
            ->orderByRaw('(blog_posts_count + social_media_posts_count) DESC')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    private function paginateCollection($collection, int $perPage, int $page): LengthAwarePaginator
    {
        $total = $collection->count();
        $items = $collection->forPage($page, $perPage)->values();
        
        return new LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => request()->url()]
        );
    }

    /**
     * Obtenir posts publics (sans authentification)
     */
    /**
 * Obtenir posts publics (sans authentification)
 */
public function getPublicPosts(string $postType, array $filters = []): array
{
    try {
        $model = $this->getModelByType($postType);
        if (!$model) {
            return [
                'success' => false,
                'error' => 'Type de post non valide'
            ];
        }

        $query = $model::with(['categories', 'user', 'reactions'])
            ->where('status', 'published')
            ->orderBy('published_at', 'desc');

        // Filtrer par catégorie si spécifiée
        if (!empty($filters['category'])) {
            $query->whereHas('categories', function($q) use ($filters) {
                $q->where('slug', $filters['category']);
            });
        }

        // Filtrer par plateforme si spécifiée
        if (!empty($filters['platform'])) {
            $query->where('platform', $filters['platform']);
        }

        $perPage = $filters['per_page'] ?? 10;
        $posts = $query->paginate($perPage);

        return [
            'success' => true,
            'data' => $posts
        ];

    } catch (\Exception $e) {
        Log::error("❌ Erreur posts publics", [
            'error' => $e->getMessage()
        ]);

        return [
            'success' => false,
            'error' => 'Erreur lors de la récupération des posts publics'
        ];
    }
}

    /**
     * Obtenir un post public par slug
     */
    public function getPublicPostBySlug(string $postType, string $slug): array
    {
        try {
            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $post = $model::with(['categories', 'user', 'comments.user'])
                ->where('slug', $slug)
                ->where('status', 'published')
                ->first();

            if (!$post) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable'
                ];
            }

            return [
                'success' => true,
                'data' => $post
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur post public par slug", [
                'slug' => $slug,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération du post'
            ];
        }
    }

    /**
     * Obtenir posts en vedette (populaires)
     */
    public function getFeaturedPosts(string $postType, int $limit = 6): array
    {
        try {
            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $posts = $model::with(['categories', 'user', 'reactions'])
                ->where('status', 'published')
                ->orderByRaw('(views + likes * 5) DESC')
                ->limit($limit)
                ->get();
                
            // ✅ SYNCHRONISATION : Mettre à jour les statistiques avec les vraies données
            foreach ($posts as $post) {
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

            return [
                'success' => true,
                'data' => $posts
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur posts en vedette", [
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération des posts en vedette'
            ];
        }
    }

/**
     * Obtenir un post public par ID
     */
    public function getPublicPostById(string $postType, int $id): array
    {
        try {
            $model = $this->getModelByType($postType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            // 🔧 CORRECTION : Utiliser la bonne relation selon le modèle
            $commentsRelation = $postType === 'blog' ? 'comments' : 'postComments';
            
            $post = $model::with(['categories', 'user', $commentsRelation . '.user'])
                ->where('id', $id)
                ->where('status', 'published')
                ->first();

            if (!$post) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable'
                ];
            }

            return [
                'success' => true,
                'data' => $post
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur post public par ID", [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération du post'
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Obtenir l'access_id actif pour une fonctionnalité
     */
    private function getActiveAccessId(User $user, string $featureKey): ?int
    {
        // ✅ SOURCE DE VÉRITÉ : Récupérer l'accès ACTIF (expires_at > NOW)
        $access = UserFeatureAccess::whereHas('feature', function($query) use ($featureKey) {
                $query->where('key', $featureKey);
            })
            ->where('user_id', $user->id)
            ->where('admin_enabled', true)
            ->where('user_activated', true)
            ->where(function($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '>', now());
            })
            ->orderBy('expires_at', 'desc')
            ->first();

        if ($access && $access->isActive()) {
            Log::info("🔍 [ACCESS] Access ID actif trouvé", [
                'user_id' => $user->id,
                'feature_key' => $featureKey,
                'access_id' => $access->id
            ]);

            return $access->id;
        }

        Log::info("⚠️ [ACCESS] Aucun access actif trouvé", [
            'user_id' => $user->id,
            'feature_key' => $featureKey
        ]);

        return null;
    }

}