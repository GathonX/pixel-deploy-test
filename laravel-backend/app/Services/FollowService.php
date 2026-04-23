<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserFollow;
use App\Models\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FollowService
{
    /**
     * Suivre/Ne plus suivre un utilisateur
     */
    public function toggleFollow(int $followerId, int $followingId): array
    {
        // Vérifications de base
        if ($followerId === $followingId) {
            throw new \InvalidArgumentException('Un utilisateur ne peut pas se suivre lui-même');
        }

        $follower = User::findOrFail($followerId);
        $following = User::findOrFail($followingId);

        try {
            DB::beginTransaction();

            $result = $follower->toggleFollow($followingId);

            // 🔔 AMÉLIORATION : Notification SEULEMENT lors du follow (pas unfollow)
            if ($result['action'] === 'followed') {
                $this->createFollowNotification($follower, $following);
            }

            DB::commit();

            Log::info('Follow toggle completed', [
                'follower_id' => $followerId,
                'following_id' => $followingId,
                'action' => $result['action'],
                'success' => $result['success']
            ]);

            return [
                'success' => true,
                'action' => $result['action'],
                'is_following' => $result['is_following'],
                'follower' => [
                    'id' => $follower->id,
                    'name' => $follower->name,
                    'following_count' => $follower->getFollowingCount()
                ],
                'following' => [
                    'id' => $following->id,
                    'name' => $following->name,
                    'followers_count' => $following->getFollowersCount()
                ]
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Follow toggle failed', [
                'follower_id' => $followerId,
                'following_id' => $followingId,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * 🔔 MÉTHODE AMÉLIORÉE : Créer notification pour follow avec broadcast temps réel
     */
    private function createFollowNotification(User $follower, User $following): void
    {
        try {
            $notification = Notification::create([
                'user_id' => $following->id,
                'type' => 'user',
                'priority' => 'normal',
                'status' => 'unread',
                'title' => "Nouvel abonné 👥",
                'message' => "{$follower->name} vous suit maintenant",
                'data' => [
                    'follower_id' => $follower->id,
                    'follower_name' => $follower->name,
                    'follower_avatar' => $follower->avatar ?? '/placeholder.svg',
                    'follower_articles_count' => $follower->getArticlesCount(),
                    'action' => 'followed',
                    'interaction_type' => 'follow'
                ],
                'href' => "/blog/author/{$follower->id}",
                'category' => 'interaction',
                'tags' => ['follow', 'social', 'user']
            ]);

            Log::info("🔔 Notification follow créée", [
                'notification_id' => $notification->id,
                'follower_id' => $follower->id,
                'following_id' => $following->id,
                'follower_name' => $follower->name,
                'following_name' => $following->name
            ]);

            // 🔔 NOUVEAU : Broadcast temps réel (optionnel - si Laravel Broadcasting est configuré)
            try {
                // Si vous avez Laravel Broadcasting configuré, décommentez cette ligne :
                // broadcast(new \App\Events\NotificationCreated($notification))->toOthers();

                Log::info("🔔 Notification follow prête pour broadcast temps réel", [
                    'notification_id' => $notification->id,
                    'user_id' => $following->id
                ]);
            } catch (\Exception $broadcastError) {
                Log::warning("⚠️ Erreur broadcast notification follow", [
                    'error' => $broadcastError->getMessage(),
                    'notification_id' => $notification->id
                ]);
            }

        } catch (\Exception $e) {
            Log::warning("⚠️ Erreur création notification follow", [
                'follower_id' => $follower->id,
                'following_id' => $following->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Vérifier si un utilisateur en suit un autre
     */
    public function isFollowing(int $followerId, int $followingId): bool
    {
        return UserFollow::isFollowing($followerId, $followingId);
    }

    /**
     * Obtenir la liste des utilisateurs suivis par un utilisateur
     */
    public function getFollowing(int $userId, int $limit = 50): array
    {
        $following = UserFollow::where('follower_id', $userId)
            ->with('following:id,name,email,avatar')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($follow) {
                return [
                    'id' => $follow->following->id,
                    'name' => $follow->following->name,
                    'email' => $follow->following->email,
                    'avatar' => $follow->following->avatar ?? '/placeholder.svg',
                    'followed_at' => $follow->created_at->toISOString()
                ];
            });

        return $following->toArray();
    }

    /**
     * Obtenir la liste des followers d'un utilisateur
     */
    public function getFollowers(int $userId, int $limit = 50): array
    {
        $followers = UserFollow::where('following_id', $userId)
            ->with('follower:id,name,email,avatar')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function ($follow) {
                return [
                    'id' => $follow->follower->id,
                    'name' => $follow->follower->name,
                    'email' => $follow->follower->email,
                    'avatar' => $follow->follower->avatar ?? '/placeholder.svg',
                    'followed_at' => $follow->created_at->toISOString()
                ];
            });

        return $followers->toArray();
    }

    /**
     * Obtenir les statistiques de follow d'un utilisateur
     */
    public function getUserFollowStats(int $userId): array
    {
        $user = User::findOrFail($userId);

        return [
            'user_id' => $userId,
            'followers_count' => $user->getFollowersCount(),
            'following_count' => $user->getFollowingCount(),
            'articles_count' => $user->getArticlesCount()
        ];
    }

    /**
     * Obtenir l'état de follow entre deux utilisateurs
     */
    public function getFollowStatus(int $currentUserId, int $targetUserId): array
    {
        // ✅ AJOUT : Log de debug temporaire
        Log::info("getFollowStatus appelé:", [
            'current_user_id' => $currentUserId,
            'target_user_id' => $targetUserId
        ]);

        if ($currentUserId === $targetUserId) {
            Log::info("Même utilisateur détecté");
            return [
                'is_following' => false,
                'is_followed_by' => false,
                'can_follow' => false,
                'relationship' => 'none',  // ✅ AJOUT : relationship manquant
                'message' => 'Même utilisateur'
            ];
        }

        $isFollowing = $this->isFollowing($currentUserId, $targetUserId);
        $isFollowedBy = $this->isFollowing($targetUserId, $currentUserId);

        // ✅ AJOUT : Log des résultats
        Log::info("Résultats follow status:", [
            'current_user_id' => $currentUserId,
            'target_user_id' => $targetUserId,
            'is_following' => $isFollowing,
            'is_followed_by' => $isFollowedBy
        ]);

        $result = [
            'is_following' => $isFollowing,
            'is_followed_by' => $isFollowedBy,
            'can_follow' => true,
            'relationship' => $this->getRelationshipType($isFollowing, $isFollowedBy)
        ];

        // ✅ AJOUT : Log du résultat final
        Log::info("Résultat final getFollowStatus:", $result);

        return $result;
    }

    /**
     * Obtenir le type de relation entre deux utilisateurs
     */
    private function getRelationshipType(bool $isFollowing, bool $isFollowedBy): string
    {
        if ($isFollowing && $isFollowedBy) {
            return 'mutual';
        } elseif ($isFollowing) {
            return 'following';
        } elseif ($isFollowedBy) {
            return 'follower';
        } else {
            return 'none';
        }
    }

    /**
     * Obtenir la liste des utilisateurs suivis avec leur état de follow mutuel
     */
    public function getFollowingWithMutualStatus(int $userId): array
    {
        $following = $this->getFollowing($userId);

        return array_map(function ($user) use ($userId) {
            $followStatus = $this->getFollowStatus($userId, $user['id']);
            $user['is_mutual'] = $followStatus['relationship'] === 'mutual';
            $user['relationship'] = $followStatus['relationship'];
            return $user;
        }, $following);
    }

    /**
     * Suggérer des utilisateurs à suivre
     */
    public function getSuggestedUsers(int $userId, int $limit = 10): array
    {
        // Utilisateurs non suivis avec des articles publiés
        $suggested = User::whereNotIn('id', function ($query) use ($userId) {
                $query->select('following_id')
                      ->from('user_follows')
                      ->where('follower_id', $userId);
            })
            ->where('id', '!=', $userId)
            ->whereHas('blogPosts', function ($query) {
                $query->where('status', 'published');
            })
            ->withCount(['blogPosts as articles_count' => function ($query) {
                $query->where('status', 'published');
            }])
            ->orderBy('articles_count', 'desc')
            ->limit($limit)
            ->get(['id', 'name', 'email', 'avatar'])
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar ?? '/placeholder.svg',
                    'articles_count' => $user->articles_count
                ];
            });

        return $suggested->toArray();
    }
}
