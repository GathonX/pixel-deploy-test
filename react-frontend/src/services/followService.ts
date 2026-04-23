// src/services/followService.ts - AVEC NOTIFICATIONS TEMPS RÉEL

import api from "./api";

// ✅ NOUVEAU : Import du QueryClient pour invalider les notifications
import { QueryClient } from "@tanstack/react-query";

// Instance globale du QueryClient (partagée avec interactionService)
let globalQueryClient: QueryClient | null = null;

// ✅ NOUVELLE FONCTION : Initialiser le QueryClient global
export const initializeFollowQueryClient = (queryClient: QueryClient) => {
  globalQueryClient = queryClient;
};

// ✅ NOUVELLE FONCTION : Rafraîchir les notifications en temps réel
const refreshNotificationsRealTime = () => {
  if (globalQueryClient) {
    // Invalider toutes les requêtes de notifications pour forcer le rafraîchissement
    globalQueryClient.invalidateQueries({ queryKey: ["notifications"] });
    console.log("🔔 [FollowService] Notifications rafraîchies en temps réel");
  } else {
    console.warn(
      "⚠️ [FollowService] QueryClient non initialisé - impossible de rafraîchir les notifications"
    );
  }
};

export interface FollowStatus {
  is_following: boolean;
  is_followed_by: boolean;
  can_follow: boolean;
  relationship: "mutual" | "following" | "follower" | "none";
  message?: string;
}

export interface FollowToggleResponse {
  success: boolean;
  message: string;
  data: {
    action: "followed" | "unfollowed";
    is_following: boolean;
    follower: {
      id: number;
      name: string;
      following_count: number;
    };
    following: {
      id: number;
      name: string;
      followers_count: number;
    };
  };
}

export interface FollowUser {
  id: number;
  name: string;
  email: string;
  avatar: string;
  followed_at: string;
  is_mutual?: boolean;
  relationship?: string;
  articles_count?: number;
}

export interface FollowStats {
  user_id: number;
  followers_count: number;
  following_count: number;
  articles_count: number;
}

export interface FollowListResponse {
  success: boolean;
  data: {
    following?: FollowUser[];
    followers?: FollowUser[];
    suggestions?: FollowUser[];
    total: number;
  };
}

export interface FollowStatsResponse {
  success: boolean;
  data: FollowStats;
}

export interface BatchStatusResponse {
  success: boolean;
  data: Record<string, FollowStatus>;
}

export class FollowService {
  private readonly LOG_PREFIX = "👥 [FollowService]";

  /**
   * ✅ AMÉLIORÉ : Suivre/Ne plus suivre un utilisateur avec notifications temps réel
   */
  async toggleFollow(userId: number): Promise<FollowToggleResponse> {
    try {
      console.log(`${this.LOG_PREFIX} Toggle follow pour utilisateur:`, userId);

      const response = await api.post("/follow/toggle", {
        user_id: userId,
      });

      const result = response.data;
      console.log(`${this.LOG_PREFIX} Toggle follow réussi:`, {
        action: result.data.action,
        followersCount: result.data.following.followers_count,
      });

      // 🔔 NOUVEAU : Rafraîchir les notifications en temps réel
      if (result.data.action === "followed") {
        console.log(
          `${this.LOG_PREFIX} Follow détecté - rafraîchissement notifications`
        );
        refreshNotificationsRealTime();
      }

      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur toggle follow:`, error);
      throw error;
    }
  }

  /**
   * Vérifier le statut de follow d'un utilisateur
   */
  async checkFollowStatus(userId: number): Promise<FollowStatus> {
    try {
      console.log(`${this.LOG_PREFIX} Vérification statut follow:`, userId);

      const response = await api.get(`/follow/status/${userId}`);
      const result = response.data.data;

      console.log(`${this.LOG_PREFIX} Statut follow récupéré:`, {
        userId,
        isFollowing: result.is_following,
        relationship: result.relationship,
      });

      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur check follow status:`, error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des utilisateurs suivis
   */
  async getFollowing(limit: number = 50): Promise<FollowUser[]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération utilisateurs suivis, limite:`,
        limit
      );

      const response = await api.get("/follow/following", {
        params: { limit },
      });

      const following = response.data.data.following || [];
      console.log(
        `${this.LOG_PREFIX} ${following.length} utilisateurs suivis récupérés`
      );

      return following;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur get following:`, error);
      throw error;
    }
  }

  /**
   * Obtenir la liste des followers
   */
  async getFollowers(limit: number = 50): Promise<FollowUser[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération followers, limite:`, limit);

      const response = await api.get("/follow/followers", {
        params: { limit },
      });

      const followers = response.data.data.followers || [];
      console.log(`${this.LOG_PREFIX} ${followers.length} followers récupérés`);

      return followers;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur get followers:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de follow
   */
  async getFollowStats(): Promise<FollowStats> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques follow`);

      const response = await api.get("/follow/stats");
      const stats = response.data.data;

      console.log(`${this.LOG_PREFIX} Statistiques récupérées:`, {
        followers: stats.followers_count,
        following: stats.following_count,
        articles: stats.articles_count,
      });

      return stats;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur get follow stats:`, error);
      throw error;
    }
  }

  /**
   * Obtenir des suggestions d'utilisateurs à suivre
   */
  async getSuggestions(limit: number = 10): Promise<FollowUser[]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération suggestions, limite:`,
        limit
      );

      const response = await api.get("/follow/suggestions", {
        params: { limit },
      });

      const suggestions = response.data.data.suggestions || [];
      console.log(
        `${this.LOG_PREFIX} ${suggestions.length} suggestions récupérées`
      );

      return suggestions;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur get suggestions:`, error);
      throw error;
    }
  }

  /**
   * Obtenir le statut de follow pour plusieurs utilisateurs
   */
  async getBatchStatus(
    userIds: number[]
  ): Promise<Record<string, FollowStatus>> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération batch status pour:`,
        userIds
      );

      const response = await api.post("/follow/batch-status", {
        user_ids: userIds,
      });

      const statuses = response.data.data;
      console.log(
        `${this.LOG_PREFIX} Batch status récupéré pour ${
          Object.keys(statuses).length
        } utilisateurs`
      );

      return statuses;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur batch status:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Méthode utilitaire pour vérifier si un utilisateur peut être suivi
   */
  async canFollowUser(userId: number): Promise<boolean> {
    try {
      const status = await this.checkFollowStatus(userId);
      return status.can_follow && !status.is_following;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur can follow user:`, error);
      return false;
    }
  }

  /**
   * ✅ NOUVEAU : Méthode utilitaire pour obtenir le nombre de followers d'un utilisateur
   */
  async getUserFollowersCount(userId: number): Promise<number> {
    try {
      const stats = await this.getFollowStats();
      return stats.followers_count;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur get followers count:`, error);
      return 0;
    }
  }
}

// ===== EXPORT SINGLETON =====
export const followService = new FollowService();
export default followService;
