<?php

namespace App\Services\ContentGeneration;

use App\Models\User;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\Comment;
use App\Models\Reaction;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class InteractionService
{

    const TYPES = ['like', 'love', 'laugh', 'angry', 'sad'];

    /**
     * ✅ CORRECTION : URL du contenu avec les bonnes routes React
     */
    private function getContentUrl(string $reactableType, int $reactableId): string
    {
        try {
            if ($reactableType === BlogPost::class) {
                $post = BlogPost::find($reactableId);
                if ($post && $post->slug) {
                    // ✅ CORRIGÉ : Utiliser le slug pour les blogs
                    return "/user-blogs/{$post->slug}";
                }
                // Fallback si pas de slug
                return "/user-blogs/{$reactableId}";

            } elseif ($reactableType === SocialMediaPost::class) {
                // ✅ CORRIGÉ : Utiliser l'ID pour les posts sociaux
                return "/social-media/post/{$reactableId}";

            } elseif ($reactableType === Comment::class) {
                $comment = Comment::find($reactableId);
                if ($comment) {
                    // Récupérer l'URL du contenu parent et ajouter l'ancre du commentaire
                    $parentUrl = $this->getContentUrl($comment->commentable_type, $comment->commentable_id);
                    return "{$parentUrl}#comment-{$reactableId}";
                }
                return "/dashboard";
            }

            return "/dashboard";
        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur génération URL contenu", [
                'error' => $e->getMessage(),
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId
            ]);
            return "/dashboard";
        }
    }

    // ✅ GARDEZ TOUTES LES AUTRES MÉTHODES EXACTEMENT PAREILLES
    // Je ne montre que la méthode modifiée pour éviter de répéter tout le code

    /**
     * Gérer les likes/réactions sur posts et commentaires
     */
    public function toggleReaction(User $user, string $reactableType, int $reactableId, string $type = 'like'): array
    {
        try {
            Log::info("👍 Toggle réaction", [
                'user_id' => $user->id,
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId,
                'type' => $type
            ]);

            // Valider le type de réaction
            if (!in_array($type, self::TYPES)) {
                return [
                    'success' => false,
                    'error' => 'Type de réaction non valide'
                ];
            }

            // Valider le modèle cible
            if (!$this->isValidReactableType($reactableType)) {
                return [
                    'success' => false,
                    'error' => 'Type d\'élément non valide'
                ];
            }

            DB::beginTransaction();

            // Vérifier si l'utilisateur a déjà cette réaction
            $existingReaction = Reaction::where([
                'user_id' => $user->id,
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId,
                'type' => $type
            ])->first();

            $action = 'added';
            if ($existingReaction) {
                // Supprimer la réaction existante
                $existingReaction->delete();
                $action = 'removed';
                Log::info("🗑️ Réaction supprimée", [
                    'reaction_id' => $existingReaction->id,
                    'type' => $type
                ]);
            } else {
                // Créer une nouvelle réaction
                Reaction::create([
                    'user_id' => $user->id,
                    'reactable_type' => $reactableType,
                    'reactable_id' => $reactableId,
                    'type' => $type
                ]);

                // 🔔 NOTIFICATION avec URL corrigée
                $this->createReactionNotification($user, $reactableType, $reactableId, $type);

                Log::info("✅ Nouvelle réaction créée", [
                    'user_id' => $user->id,
                    'type' => $type
                ]);
            }

            // Calculer le nouveau nombre de réactions de ce type
            $newCount = Reaction::where([
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId,
                'type' => $type
            ])->count();

            // Mettre à jour les compteurs du post
            $this->updateReactionCounters($reactableType, $reactableId);

            // Invalider le cache
            $this->clearReactionCache($reactableType, $reactableId);

            DB::commit();

            Log::info("✅ Toggle réaction terminé", [
                'action' => $action,
                'type' => $type,
                'new_count' => $newCount
            ]);

            return [
                'success' => true,
                'data' => [
                    'action' => $action,
                    'type' => $type,
                    'new_count' => $newCount
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("❌ Erreur toggle réaction", [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la réaction'
            ];
        }
    }

    /**
     * Créer un commentaire
     */
    public function createComment(User $user, string $commentableType, int $commentableId, string $content, ?int $parentId = null): array
    {
        try {
            Log::info("💬 Création commentaire", [
                'user_id' => $user->id,
                'commentable_type' => $commentableType,
                'commentable_id' => $commentableId,
                'parent_id' => $parentId
            ]);

            // Valider le modèle cible
            if (!$this->isValidCommentableType($commentableType)) {
                return [
                    'success' => false,
                    'error' => 'Type d\'élément non valide'
                ];
            }

            DB::beginTransaction();

            $comment = Comment::create([
                'user_id' => $user->id,
                'commentable_type' => $commentableType,
                'commentable_id' => $commentableId,
                'content' => $content,
                'parent_id' => $parentId
            ]);

            // Charger les relations
            $comment->load(['user', 'replies.user']);

            // 🔔 NOTIFICATION avec URL corrigée
            $this->createCommentNotification($user, $commentableType, $commentableId, $comment, $parentId);

            // Mettre à jour les compteurs
            $this->updateCommentCounters($commentableType, $commentableId);

            DB::commit();

            Log::info("✅ Commentaire créé", [
                'comment_id' => $comment->id
            ]);

            return [
                'success' => true,
                'data' => [
                    'comment' => $comment
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error("❌ Erreur création commentaire", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la création du commentaire'
            ];
        }
    }

    /**
     * 🔔 Créer notification pour réaction
     */
    private function createReactionNotification(User $user, string $reactableType, int $reactableId, string $type): void
    {
        try {
            // Récupérer le propriétaire du contenu
            $contentOwner = $this->getContentOwner($reactableType, $reactableId);

            // Ne pas notifier si l'utilisateur réagit à son propre contenu
            if (!$contentOwner || $contentOwner->id === $user->id) {
                return;
            }

            // Récupérer le titre du contenu
            $contentTitle = $this->getContentTitle($reactableType, $reactableId);
            $contentType = $this->getReadableContentType($reactableType);

            // Emoji selon le type de réaction
            $emoji = $this->getReactionEmoji($type);

            Notification::create([
                'user_id' => $contentOwner->id,
                'type' => 'user',
                'priority' => 'normal',
                'status' => 'unread',
                'title' => "Nouvelle réaction {$emoji}",
                'message' => "{$user->name} a réagi avec {$emoji} à votre {$contentType} \"{$contentTitle}\"",
                'data' => [
                    'actor_id' => $user->id,
                    'actor_name' => $user->name,
                    'reaction_type' => $type,
                    'content_type' => $contentType,
                    'content_id' => $reactableId,
                    'content_title' => $contentTitle
                ],
                'href' => $this->getContentUrl($reactableType, $reactableId), // ✅ URL corrigée
                'category' => 'interaction',
                'tags' => ['reaction', $type, $contentType]
            ]);

            Log::info("🔔 Notification réaction créée", [
                'owner_id' => $contentOwner->id,
                'reactor_id' => $user->id,
                'type' => $type
            ]);

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur création notification réaction", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * 🔔 Créer notification pour commentaire
     */
    private function createCommentNotification(User $user, string $commentableType, int $commentableId, Comment $comment, ?int $parentId = null): void
    {
        try {
            if ($parentId) {
                // Réponse à un commentaire - notifier l'auteur du commentaire parent
                $parentComment = Comment::with('user')->find($parentId);
                if ($parentComment && $parentComment->user && $parentComment->user->id !== $user->id) {
                    $contentTitle = $this->getContentTitle($commentableType, $commentableId);

                    Notification::create([
                        'user_id' => $parentComment->user->id,
                        'type' => 'user',
                        'priority' => 'normal',
                        'status' => 'unread',
                        'title' => "Réponse à votre commentaire",
                        'message' => "{$user->name} a répondu à votre commentaire sur \"{$contentTitle}\"",
                        'data' => [
                            'actor_id' => $user->id,
                            'actor_name' => $user->name,
                            'comment_id' => $comment->id,
                            'parent_comment_id' => $parentId,
                            'content_id' => $commentableId,
                            'content_title' => $contentTitle,
                            'comment_preview' => substr($comment->content, 0, 100)
                        ],
                        'href' => $this->getContentUrl($commentableType, $commentableId) . "#comment-{$comment->id}", // ✅ URL corrigée
                        'category' => 'interaction',
                        'tags' => ['comment', 'reply']
                    ]);
                }
            } else {
                // Commentaire principal - notifier le propriétaire du contenu
                $contentOwner = $this->getContentOwner($commentableType, $commentableId);

                if ($contentOwner && $contentOwner->id !== $user->id) {
                    $contentTitle = $this->getContentTitle($commentableType, $commentableId);
                    $contentType = $this->getReadableContentType($commentableType);

                    Notification::create([
                        'user_id' => $contentOwner->id,
                        'type' => 'user',
                        'priority' => 'normal',
                        'status' => 'unread',
                        'title' => "Nouveau commentaire 💬",
                        'message' => "{$user->name} a commenté votre {$contentType} \"{$contentTitle}\"",
                        'data' => [
                            'actor_id' => $user->id,
                            'actor_name' => $user->name,
                            'comment_id' => $comment->id,
                            'content_type' => $contentType,
                            'content_id' => $commentableId,
                            'content_title' => $contentTitle,
                            'comment_preview' => substr($comment->content, 0, 100)
                        ],
                        'href' => $this->getContentUrl($commentableType, $commentableId) . "#comment-{$comment->id}", // ✅ URL corrigée
                        'category' => 'interaction',
                        'tags' => ['comment', $contentType]
                    ]);
                }
            }

            Log::info("🔔 Notification commentaire créée", [
                'commenter_id' => $user->id,
                'is_reply' => !!$parentId
            ]);

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur création notification commentaire", [
                'error' => $e->getMessage()
            ]);
        }
    }

    // ✅ GARDEZ TOUTES LES AUTRES MÉTHODES EXACTEMENT PAREILLES
    // (getContentOwner, getContentTitle, getReadableContentType, etc.)

    private function getContentOwner(string $reactableType, int $reactableId): ?User
    {
        try {
            if ($reactableType === BlogPost::class) {
                $post = BlogPost::find($reactableId);
                return $post?->user;
            } elseif ($reactableType === SocialMediaPost::class) {
                $post = SocialMediaPost::find($reactableId);
                return $post?->user;
            } elseif ($reactableType === Comment::class) {
                $comment = Comment::find($reactableId);
                return $comment?->user;
            }

            return null;
        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur récupération propriétaire contenu", ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function getContentTitle(string $reactableType, int $reactableId): string
    {
        try {
            if ($reactableType === BlogPost::class) {
                $post = BlogPost::find($reactableId);
                return $post?->title ?? 'Article sans titre';
            } elseif ($reactableType === SocialMediaPost::class) {
                $post = SocialMediaPost::find($reactableId);
                return substr($post?->content ?? 'Post sans contenu', 0, 50) . '...';
            } elseif ($reactableType === Comment::class) {
                $comment = Comment::find($reactableId);
                return 'Commentaire: ' . substr($comment?->content ?? 'Commentaire supprimé', 0, 30) . '...';
            }

            return 'Contenu';
        } catch (\Exception $e) {
            return 'Contenu';
        }
    }

    private function getReadableContentType(string $reactableType): string
    {
        return match ($reactableType) {
            BlogPost::class => 'article',
            SocialMediaPost::class => 'post',
            Comment::class => 'commentaire',
            default => 'contenu'
        };
    }

    private function getReactionEmoji(string $type): string
    {
        return match ($type) {
            'like' => '👍',
            'love' => '❤️',
            'laugh' => '😂',
            'angry' => '😠',
            'sad' => '😢',
            default => '👍'
        };
    }

    /**
     * ✅ CORRECTION MAJEURE : Obtenir les statistiques d'interaction d'un post
     */
    public function getPostInteractionStats(string $postType, int $postId): array
    {
        try {
            Log::info("📊 Récupération statistiques", [
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

            // ✅ CORRECTION : Calculer les vraies statistiques
            $totalLikes = $post->reactions()->where('type', 'like')->count();
            $totalComments = $post->comments()->count();
            $totalViews = $post->views ?? 0;

            // ✅ AJOUT : Récupérer les partages
            $totalShares = $post->shares ?? 0;

            // ✅ CORRECTION : Calculer reactions_by_type correctement
            $reactionsByType = $post->reactions()
                ->selectRaw('type, count(*) as count')
                ->groupBy('type')
                ->pluck('count', 'type')
                ->toArray();

            // ✅ CORRECTION : Structure compatible avec le frontend
            $stats = [
                'total_likes' => $totalLikes,
                'total_comments' => $totalComments,
                'total_views' => $totalViews,
                'total_shares' => $totalShares,  // ✅ AJOUTÉ : Les partages
                'reactions_by_type' => $reactionsByType,
                'engagement_rate' => $this->calculateEngagementRate($totalLikes, $totalComments, $totalViews,$totalShares),
                'top_posts' => []
            ];

            Log::info("✅ Statistiques calculées", [
                'total_likes' => $totalLikes,
                'total_comments' => $totalComments,
                'total_views' => $totalViews,
                'total_shares' => $totalShares  // ✅ AJOUTÉ dans le log
            ]);

            return [
                'success' => true,
                'data' => $stats
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur stats interaction", [
                'post_type' => $postType,
                'post_id' => $postId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération des statistiques'
            ];
        }
    }

    /**
     * ✅ CORRECTION : Incrémenter les vues d'un post
     */
    public function incrementViews(string $postType, int $postId, ?User $user = null): array
    {
        try {
            Log::info("👁️ Incrémentation vues", [
                'post_type' => $postType,
                'post_id' => $postId,
                'user_id' => $user?->id
            ]);

            // Éviter le spam de vues avec cache
            $cacheKey = "view_{$postType}_{$postId}_" . ($user ? $user->id : 'guest');
            if (Cache::has($cacheKey)) {
                Log::info("🚫 Vue déjà comptée (cache)", ['cache_key' => $cacheKey]);

                // ✅ CORRECTION : Retourner le nombre actuel de vues
                $model = $this->getModelByType($postType);
                if ($model) {
                    $post = $model::find($postId);
                    if ($post) {
                        return [
                            'success' => true,
                            'data' => [
                                'views' => $post->views ?? 0 // ✅ Retourner le nombre actuel
                            ]
                        ];
                    }
                }

                return [
                    'success' => true,
                    'data' => ['views' => 0]
                ];
            }

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

            // ✅ CORRECTION : Incrémenter les vues
            $post->increment('views');
            $newViews = $post->fresh()->views;

            // Cache pour éviter le spam (5 minutes = 300 secondes)
            Cache::put($cacheKey, true, 300);

            Log::info("✅ Vue incrémentée", [
                'post_id' => $postId,
                'new_views' => $newViews
            ]);

            return [
                'success' => true,
                'data' => [
                    'views' => $newViews // ✅ CORRECTION : Retourner le nouveau nombre
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur incrémentation vues", [
                'post_type' => $postType,
                'post_id' => $postId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de l\'incrémentation des vues'
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Vérifier la prévention du spam
     */
    public function checkSpamPrevention(User $user, string $action): bool
    {
        $cacheKey = "spam_{$action}_{$user->id}";
        $attempts = Cache::get($cacheKey, 0);

        // Limite : 10 actions par minute
        if ($attempts >= 10) {
            return false;
        }

        Cache::put($cacheKey, $attempts + 1, 60);
        return true;
    }

    /**
     * Obtenir les réactions utilisateur pour plusieurs éléments
     */
    public function getBatchUserReactions(User $user, string $reactableType, array $reactableIds): array
    {
        try {
            Log::info("📊 Récupération batch réactions utilisateur", [
                'user_id' => $user->id,
                'reactable_type' => $reactableType,
                'reactable_ids' => $reactableIds
            ]);

            if (!$this->isValidReactableType($reactableType)) {
                return [
                    'success' => false,
                    'error' => 'Type d\'élément non valide'
                ];
            }

            $reactions = Reaction::where('user_id', $user->id)
                ->where('reactable_type', $reactableType)
                ->whereIn('reactable_id', $reactableIds)
                ->get()
                ->map(function ($reaction) {
                    return [
                        'reactable_id' => $reaction->reactable_id,
                        'type' => $reaction->type,
                        'has_liked' => $reaction->type === 'like'
                    ];
                })
                ->toArray();

            Log::info("✅ Batch réactions récupérées", [
                'count' => count($reactions)
            ]);

            return [
                'success' => true,
                'data' => $reactions
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur batch réactions", [
                'user_id' => $user->id,
                'reactable_type' => $reactableType,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de la récupération des réactions'
            ];
        }
    }

    /**
     * ✅ NOUVEAU : Enregistrer un partage
     */
    public function recordShare(User $user, string $reactableType, int $reactableId): array
    {
        try {
            Log::info("📤 Enregistrement partage", [
                'user_id' => $user->id,
                'reactable_type' => $reactableType,
                'reactable_id' => $reactableId
            ]);

            $model = $this->getModelByType($reactableType);
            if (!$model) {
                return [
                    'success' => false,
                    'error' => 'Type de post non valide'
                ];
            }

            $post = $model::find($reactableId);
            if (!$post) {
                return [
                    'success' => false,
                    'error' => 'Post introuvable'
                ];
            }

            // Incrémenter le compteur de partages
            if ($post instanceof SocialMediaPost) {
                $newShares = $post->incrementShares();
            } else if ($post instanceof BlogPost) {
                $newShares = $post->incrementShares();
            } else {
                return [
                    'success' => false,
                    'error' => 'Type de post non supporté pour les partages'
                ];
            }

            // 🔔 NOUVELLE NOTIFICATION - Partage
            $this->createShareNotification($user, $reactableType, $reactableId);

            Log::info("✅ Partage enregistré", [
                'post_id' => $reactableId,
                'new_shares' => $newShares,
                'user_id' => $user->id
            ]);

            return [
                'success' => true,
                'data' => [
                    'shares' => $newShares
                ]
            ];

        } catch (\Exception $e) {
            Log::error("❌ Erreur enregistrement partage", [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => 'Erreur lors de l\'enregistrement du partage'
            ];
        }
    }

    /**
     * 🔔 NOUVELLE MÉTHODE : Créer notification pour partage
     */
    private function createShareNotification(User $user, string $reactableType, int $reactableId): void
    {
        try {
            $contentOwner = $this->getContentOwner($reactableType, $reactableId);

            if (!$contentOwner || $contentOwner->id === $user->id) {
                return;
            }

            $contentTitle = $this->getContentTitle($reactableType, $reactableId);
            $contentType = $this->getReadableContentType($reactableType);

            Notification::create([
                'user_id' => $contentOwner->id,
                'type' => 'user',
                'priority' => 'normal',
                'status' => 'unread',
                'title' => "Contenu partagé 📤",
                'message' => "{$user->name} a partagé votre {$contentType} \"{$contentTitle}\"",
                'data' => [
                    'actor_id' => $user->id,
                    'actor_name' => $user->name,
                    'content_type' => $contentType,
                    'content_id' => $reactableId,
                    'content_title' => $contentTitle
                ],
                'href' => $this->getContentUrl($reactableType, $reactableId),
                'category' => 'interaction',
                'tags' => ['share', $contentType]
            ]);

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur création notification partage", [
                'error' => $e->getMessage()
            ]);
        }
    }

    // ===== MÉTHODES PRIVÉES =====

    /**
     * Valider le type de modèle pour les réactions
     */
    private function isValidReactableType(string $type): bool
    {
        return in_array($type, [
            BlogPost::class,
            SocialMediaPost::class,
            Comment::class
        ]);
    }

    /**
     * Valider le type de modèle pour les commentaires
     */
    private function isValidCommentableType(string $type): bool
    {
        return in_array($type, [
            BlogPost::class,
            SocialMediaPost::class
        ]);
    }

    /**
     * ✅ CORRECTION : Obtenir le modèle par type string
     */
    private function getModelByType(string $type): ?string
    {
        $mapping = [
            'blog_post' => BlogPost::class,
            'social_media_post' => SocialMediaPost::class,
            'blog' => BlogPost::class,      // ✅ Alias pour compatibilité
            'social' => SocialMediaPost::class // ✅ Alias pour compatibilité
        ];

        return $mapping[$type] ?? null;
    }

    /**
     * Mettre à jour les compteurs de réactions
     */
    private function updateReactionCounters(string $reactableType, int $reactableId): void
    {
        try {
            $model = $this->getModelByTypeClass($reactableType);
            if ($model) {
                $post = $model::find($reactableId);
                if ($post) {
                    $likesCount = $post->reactions()->where('type', 'like')->count();
                    $post->update(['likes_count' => $likesCount]);
                }
            }
        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur mise à jour compteur réactions", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Mettre à jour les compteurs de commentaires
     */
    private function updateCommentCounters(string $commentableType, int $commentableId): void
    {
        try {
            $model = $this->getModelByTypeClass($commentableType);
            if ($model) {
                $post = $model::find($commentableId);
                if ($post) {
                    $commentsCount = $post->comments()->count();
                    $post->update(['comments_count' => $commentsCount]);
                }
            }
        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur mise à jour compteur commentaires", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtenir le modèle par classe
     */
    private function getModelByTypeClass(string $class): ?string
    {
        return in_array($class, [
            BlogPost::class,
            SocialMediaPost::class,
            Comment::class
        ]) ? $class : null;
    }

    /**
     * Calculer le taux d'engagement (avec partages)
     */
    private function calculateEngagementRate(int $likes, int $comments, int $views, int $shares = 0): float
    {
        if ($views === 0) {
            return 0.0;
        }

        return round((($likes + $comments + $shares) / $views) * 100, 2);
    }

    /**
     * Nettoyer le cache des réactions
     */
    private function clearReactionCache(string $reactableType, int $reactableId): void
    {
        $cacheKeys = [
            "reactions_{$reactableType}_{$reactableId}",
            "stats_{$reactableType}_{$reactableId}"
        ];

        foreach ($cacheKeys as $key) {
            Cache::forget($key);
        }
    }
}
