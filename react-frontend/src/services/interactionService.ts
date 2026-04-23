// src/services/interactionService.ts - SERVICE INTERACTIONS OPTIMISÉ
import api from "./api";
import type { AxiosResponse } from "axios";
import { dashboardSyncManager } from "@/hooks/useDashboardSync";

// ✅ NOUVEAU : Import du QueryClient pour invalider les notifications
import { QueryClient } from "@tanstack/react-query";

// Instance globale du QueryClient (sera initialisée depuis App.tsx)
let globalQueryClient: QueryClient | null = null;

// ✅ NOUVELLE FONCTION : Initialiser le QueryClient global
export const initializeInteractionQueryClient = (queryClient: QueryClient) => {
  globalQueryClient = queryClient;
};

// ✅ NOUVELLE FONCTION : Rafraîchir les notifications en temps réel
const refreshNotificationsRealTime = () => {
  if (globalQueryClient) {
    // Invalider toutes les requêtes de notifications pour forcer le rafraîchissement
    globalQueryClient.invalidateQueries({ queryKey: ["notifications"] });
    console.log(
      "🔔 [InteractionService] Notifications rafraîchies en temps réel"
    );
  } else {
    console.warn(
      "⚠️ [InteractionService] QueryClient non initialisé - impossible de rafraîchir les notifications"
    );
  }
};

// ✅ TYPES BASÉS SUR LES DONNÉES BACKEND RÉELLES (PRÉSERVÉS)
export interface Reaction {
  id: number;
  user_id: number;
  reactable_type: string;
  reactable_id: number;
  type: "like" | "love" | "laugh" | "angry" | "sad";
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Comment {
  id: number;
  user_id: number;
  commentable_type: string;
  commentable_id: number;
  content: string;
  likes_count: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  replies: Comment[];
}

export interface ReactionOptions {
  reactable_type: "blog_post" | "social_media_post" | "comment";
  reactable_id: number;
  type?: "like" | "love" | "laugh" | "angry" | "sad";
}

export interface CommentOptions {
  commentable_type: "blog_post" | "social_media_post";
  commentable_id: number;
  content: string;
  parent_id?: number;
}

export interface ViewOptions {
  post_type: "blog" | "social";
  post_id: number;
}

export interface UserReactions {
  user_reactions: string[];
  has_liked: boolean;
  has_loved: boolean;
  has_laughed?: boolean;
  has_angry?: boolean;
  has_sad?: boolean;
  total_reactions?: number;
}

export interface InteractionStatistics {
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_shares?: number;
  reactions_by_type: Record<string, number>;
  engagement_rate: number;
  top_posts: Array<{
    id: number;
    title: string;
    type: "blog" | "social";
    total_engagement: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface LaravelPaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
    path: string;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
  };
  message: string;
}

// ===== SERVICE INTERACTIONS AVEC NOTIFICATIONS TEMPS RÉEL =====

class InteractionService {
  private readonly LOG_PREFIX = "❤️ [InteractionService]";

  /**
   * ✅ PRÉSERVÉ : Vérifier si l'utilisateur est connecté
   */
  private isUserAuthenticated(): boolean {
    try {
      // Vérifier s'il y a un token ou une session active
      const token = localStorage.getItem("auth_token");
      const cookies = document.cookie;

      // Si on a un token OU un cookie de session Laravel
      return !!(
        token ||
        cookies.includes("laravel_session") ||
        cookies.includes("XSRF-TOKEN")
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * ✅ AMÉLIORÉ : Notifier le Dashboard ET rafraîchir les notifications
   */
  private notifyDashboard(
    entity: "blog_post" | "social_post" | "comment",
    entityId: number,
    action: "like" | "unlike" | "comment" | "uncomment" | "view" | "share",
    data?: Record<string, unknown>
  ): void {
    try {
      // ✅ NOUVELLE VÉRIFICATION : Seulement pour les utilisateurs connectés
      if (!this.isUserAuthenticated()) {
        console.log(
          `📡 [Dashboard] Notification ignorée - utilisateur non connecté`
        );
        return;
      }

      console.log(`📡 [Dashboard] Notification:`, { entity, entityId, action });

      // ✅ PRÉSERVÉ : Sync dashboard existant
      dashboardSyncManager.emitSyncEvent({
        type: "interaction",
        entity,
        entityId,
        action,
        data,
      });

      // ✅ NOUVEAU : Rafraîchir les notifications en temps réel
      refreshNotificationsRealTime();
    } catch (error) {
      console.warn(`⚠️ [Dashboard] Erreur notification:`, error);
      // Ne pas faire échouer l'interaction si la notification échoue
    }
  }

  // ===== RÉACTIONS (LIKES, LOVE, ANGRY, etc.) =====

  /**
   * ✅ AMÉLIORÉ : Toggle réaction avec notifications temps réel
   */
  async toggleReaction(options: ReactionOptions): Promise<{
    action: "added" | "removed";
    type: string;
    new_count: number;
  }> {
    try {
      console.log(`${this.LOG_PREFIX} Toggle réaction:`, options);

      const response: AxiosResponse<{
        success: boolean;
        data: {
          action: "added" | "removed";
          type: string;
          new_count: number;
        };
        message: string;
      }> = await api.post("/interactions/reaction", options);

      if (!response.data.success) {
        throw new Error(response.data.message || "Erreur lors de la réaction");
      }

      const result = response.data.data;
      console.log(`${this.LOG_PREFIX} Réaction ${result.action}:`, result.type);

      // ✅ AMÉLIORÉ : Notifier le Dashboard pour synchronisation temps réel
      this.notifyDashboard(
        options.reactable_type === "blog_post"
          ? "blog_post"
          : options.reactable_type === "social_media_post"
          ? "social_post"
          : "comment",
        options.reactable_id,
        result.action === "added" ? "like" : "unlike",
        {
          reaction_type: result.type,
          new_count: result.new_count,
        }
      );

      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur réaction:`, error);
      throw error;
    }
  }

  /**
   * ✅ PRÉSERVÉ : Like rapide avec notifications
   */
  async toggleLike(
    reactableType: "blog_post" | "social_media_post" | "comment",
    reactableId: number
  ): Promise<{
    action: "added" | "removed";
    type: string;
    new_count: number;
  }> {
    const result = await this.toggleReaction({
      reactable_type: reactableType,
      reactable_id: reactableId,
      type: "like",
    });

    // ✅ La notification est déjà faite dans toggleReaction
    return result;
  }

  /**
   * ✅ OPTIMISÉ : Récupérer les réactions d'un utilisateur (utilise TanStack Query pour le cache)
   */
  async getUserReactions(
    type: "blog_post" | "social_media_post" | "comment",
    id: number
  ): Promise<UserReactions> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération réactions utilisateur:`,
        type,
        id
      );

      const response: AxiosResponse<{
        success: boolean;
        data: {
          user_reactions: string[];
          has_liked: boolean;
          has_loved: boolean;
        };
        message: string;
      }> = await api.get(`/interactions/user-reactions/${type}/${id}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des réactions"
        );
      }

      const backendData = response.data.data;
      const adaptedReactions: UserReactions = {
        user_reactions: backendData.user_reactions,
        has_liked: backendData.has_liked,
        has_loved: backendData.has_loved,
        has_laughed: backendData.user_reactions.includes("laugh"),
        has_angry: backendData.user_reactions.includes("angry"),
        has_sad: backendData.user_reactions.includes("sad"),
        total_reactions: backendData.user_reactions.length,
      };

      console.log(`${this.LOG_PREFIX} Réactions utilisateur récupérées`);
      return adaptedReactions;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur réactions utilisateur:`, error);
      throw error;
    }
  }

  // ===== COMMENTAIRES =====

  /**
   * ✅ AMÉLIORÉ : Créer commentaire avec notifications temps réel
   */
  async createComment(options: CommentOptions): Promise<Comment> {
    try {
      console.log(`${this.LOG_PREFIX} Création commentaire:`, options);

      const response: AxiosResponse<{
        success: boolean;
        data: Comment;
        message: string;
      }> = await api.post("/interactions/comment", options);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de la création du commentaire"
        );
      }

      const comment = response.data.data;
      console.log(
        `${this.LOG_PREFIX} Commentaire créé avec succès:`,
        comment.id
      );

      // ✅ AMÉLIORÉ : Notifier le Dashboard ET rafraîchir notifications
      this.notifyDashboard(
        options.commentable_type === "blog_post" ? "blog_post" : "social_post",
        options.commentable_id,
        "comment",
        {
          comment_id: comment.id,
          content_preview: comment.content.substring(0, 100),
          is_reply: !!options.parent_id,
        }
      );

      return comment;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur création commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ PRÉSERVÉ : Répondre à un commentaire
   */
  async replyToComment(
    commentableType: "blog_post" | "social_media_post",
    commentableId: number,
    parentCommentId: number,
    content: string
  ): Promise<Comment> {
    const comment = await this.createComment({
      commentable_type: commentableType,
      commentable_id: commentableId,
      content,
      parent_id: parentCommentId,
    });

    // ✅ La notification est déjà faite dans createComment
    return comment;
  }

  /**
   * ✅ PRÉSERVÉ : Récupérer les commentaires d'un post avec pagination Laravel
   */
  async getComments(
    commentableType: "blog_post" | "social_media_post",
    commentableId: number,
    filters: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<Comment[]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération commentaires:`,
        commentableType,
        commentableId
      );

      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.per_page)
        params.append("per_page", filters.per_page.toString());

      const response: AxiosResponse<LaravelPaginatedResponse<Comment>> =
        await api.get(
          `/interactions/comments/${commentableType}/${commentableId}?${params.toString()}`
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des commentaires"
        );
      }

      const comments = response.data.data.data;

      if (!Array.isArray(comments)) {
        console.warn("🔍 [DEBUG] Comments data n'est pas un array:", comments);
        return [];
      }

      console.log(
        `${this.LOG_PREFIX} ${comments.length} commentaires récupérés`
      );
      return comments;
    } catch (error) {
      console.error(
        `${this.LOG_PREFIX} Erreur récupération commentaires:`,
        error
      );
      throw error;
    }
  }

  // ===== VUES =====

  /**
   * ✅ PRÉSERVÉ : Incrémenter le compteur de vues d'un post
   */
  async incrementView(options: ViewOptions): Promise<{ views: number }> {
    try {
      console.log(`${this.LOG_PREFIX} Incrémentation vue:`, options);

      const response: AxiosResponse<{
        success: boolean;
        data: { views: number };
        message: string;
      }> = await api.post("/interactions/view", options);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de l'incrémentation des vues"
        );
      }

      const result = response.data.data;
      console.log(`${this.LOG_PREFIX} Vue enregistrée:`, result.views);

      // ✅ NOUVEAU : Notifier le Dashboard
      this.notifyDashboard(
        options.post_type === "blog" ? "blog_post" : "social_post",
        options.post_id,
        "view",
        {
          new_views_count: result.views,
        }
      );

      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur vue:`, error);
      throw error;
    }
  }

  /**
   * ✅ PRÉSERVÉ : Incrémenter automatiquement la vue d'un blog post
   */
  async viewBlogPost(postId: number): Promise<{ views: number }> {
    return this.incrementView({
      post_type: "blog",
      post_id: postId,
    });
  }

  /**
   * ✅ PRÉSERVÉ : Incrémenter automatiquement la vue d'un post social media
   */
  async viewSocialPost(postId: number): Promise<{ views: number }> {
    return this.incrementView({
      post_type: "social",
      post_id: postId,
    });
  }

  // ===== PARTAGES =====

  /**
   * ✅ PRÉSERVÉ : Enregistrer un partage
   */
  async recordShare(
    reactableType: "blog_post" | "social_media_post",
    reactableId: number
  ): Promise<{
    shares: number;
  }> {
    try {
      console.log(
        `${this.LOG_PREFIX} Enregistrement partage:`,
        reactableType,
        reactableId
      );

      const response: AxiosResponse<{
        success: boolean;
        data: { shares: number };
        message: string;
      }> = await api.post("/interactions/share", {
        reactable_type: reactableType,
        reactable_id: reactableId,
      });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de l'enregistrement du partage"
        );
      }

      const result = response.data.data;
      console.log(`${this.LOG_PREFIX} Partage enregistré:`, result.shares);

      // ✅ NOUVEAU : Notifier le Dashboard
      this.notifyDashboard(
        reactableType === "blog_post" ? "blog_post" : "social_post",
        reactableId,
        "share",
        {
          new_shares_count: result.shares,
        }
      );

      return result;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur enregistrement partage:`, error);
      throw error;
    }
  }

  /**
   * ✅ PRÉSERVÉ : Partager un blog post
   */
  async shareBlogPost(postId: number): Promise<{ shares: number }> {
    return this.recordShare("blog_post", postId);
  }

  /**
   * ✅ PRÉSERVÉ : Partager un post social media
   */
  async shareSocialPost(postId: number): Promise<{ shares: number }> {
    return this.recordShare("social_media_post", postId);
  }

  // ===== STATISTIQUES D'INTERACTION =====

  /**
   * ✅ PRÉSERVÉ : Récupérer les statistiques d'interaction d'un post spécifique
   */
  async getPostStatistics(
    type: "blog_post" | "social_media_post",
    id: number
  ): Promise<InteractionStatistics> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération statistiques post:`,
        type,
        id
      );

      const response: AxiosResponse<{
        success: boolean;
        data: InteractionStatistics;
        message: string;
      }> = await api.get(`/interactions/${type}/${id}/statistics`);

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des statistiques"
        );
      }

      console.log(`${this.LOG_PREFIX} Statistiques post récupérées`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques post:`, error);
      throw error;
    }
  }

  // ===== UTILITAIRES D'INTERACTION (PRÉSERVÉS) =====

  async hasUserReacted(
    reactableType: "blog_post" | "social_media_post" | "comment",
    reactableId: number,
    reactionType?: "like" | "love" | "laugh" | "angry" | "sad"
  ): Promise<boolean> {
    try {
      const reactions = await this.getUserReactions(reactableType, reactableId);

      if (!reactionType) {
        return (reactions.total_reactions || 0) > 0;
      }

      switch (reactionType) {
        case "like":
          return reactions.has_liked;
        case "love":
          return reactions.has_loved;
        case "laugh":
          return reactions.has_laughed || false;
        case "angry":
          return reactions.has_angry || false;
        case "sad":
          return reactions.has_sad || false;
        default:
          return false;
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur vérification réaction:`, error);
      return false;
    }
  }

  async getTotalEngagement(
    type: "blog_post" | "social_media_post",
    id: number
  ): Promise<number> {
    try {
      const stats = await this.getPostStatistics(type, id);
      return (
        stats.total_likes +
        stats.total_comments +
        stats.total_views +
        (stats.total_shares || 0)
      );
    } catch (error) {
      console.error(
        `${this.LOG_PREFIX} Erreur calcul engagement total:`,
        error
      );
      return 0;
    }
  }

  // ===== MÉTHODES PUBLIQUES (PRÉSERVÉES) =====

  async getPublicPostStatistics(
    type: "blog_post" | "social_media_post",
    id: number
  ): Promise<InteractionStatistics> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération statistiques publiques:`,
        type,
        id
      );

      const response: AxiosResponse<{
        success: boolean;
        data: InteractionStatistics;
        message: string;
      }> = await api.get(`/public/interactions/${type}/${id}/statistics`);

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des statistiques publiques"
        );
      }

      console.log(`${this.LOG_PREFIX} Statistiques publiques récupérées`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques publiques:`, error);
      throw error;
    }
  }

  async getPublicComments(
    commentableType: "blog_post" | "social_media_post",
    commentableId: number,
    filters: {
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<Comment[]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération commentaires publics:`,
        commentableType,
        commentableId
      );

      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.per_page)
        params.append("per_page", filters.per_page.toString());

      const response: AxiosResponse<LaravelPaginatedResponse<Comment>> =
        await api.get(
          `/public/interactions/comments/${commentableType}/${commentableId}?${params.toString()}`
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des commentaires publics"
        );
      }

      const comments = response.data.data.data;

      if (!Array.isArray(comments)) {
        console.warn(
          "🔍 [DEBUG] Public comments data n'est pas un array:",
          comments
        );
        return [];
      }

      console.log(
        `${this.LOG_PREFIX} ${comments.length} commentaires publics récupérés`
      );
      return comments;
    } catch (error) {
      console.error(
        `${this.LOG_PREFIX} Erreur récupération commentaires publics:`,
        error
      );
      throw error;
    }
  }

  async getTopPosts(
    filters: {
      type?: "blog" | "social";
      period?: "week" | "month";
      limit?: number;
    } = {}
  ): Promise<
    Array<{
      id: number;
      title: string;
      type: "blog" | "social";
      total_engagement: number;
    }>
  > {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération top posts engageants...`,
        filters
      );

      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.period) params.append("period", filters.period);
      if (filters.limit) params.append("limit", filters.limit.toString());

      const response: AxiosResponse<{
        success: boolean;
        data: Array<{
          id: number;
          title: string;
          type: "blog" | "social";
          total_engagement: number;
        }>;
        message: string;
      }> = await api.get(`/public/interactions/top-posts?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Erreur lors de la récupération des top posts"
        );
      }

      console.log(
        `${this.LOG_PREFIX} ${response.data.data.length} top posts récupérés`
      );
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur top posts:`, error);
      throw error;
    }
  }

  // ===== MÉTHODES BATCH (PRÉSERVÉES) =====

  async getBatchPostStatistics(
    posts: Array<{
      type: "blog_post" | "social_media_post";
      id: number;
    }>
  ): Promise<Record<string, InteractionStatistics>> {
    if (posts.length === 0) return {};
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération batch statistiques pour ${posts.length} posts`
      );

      const response: AxiosResponse<{
        success: boolean;
        data: Record<string, InteractionStatistics | null>;
        message: string;
      }> = await api.post("/interactions/batch-statistics", { posts });

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      const results: Record<string, InteractionStatistics> = {};
      for (const [key, stats] of Object.entries(response.data.data)) {
        if (stats !== null) {
          results[key] = stats;
        }
      }

      console.log(
        `${this.LOG_PREFIX} ${Object.keys(results).length} statistiques batch récupérées`
      );
      return results;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur batch statistiques:`, error);
      return {};
    }
  }

  // ===== GESTION DES COMMENTAIRES (NOUVEAU) =====

  /**
   * ✅ NOUVEAU : Modifier un commentaire
   */
  async updateComment(
    commentId: number,
    content: string
  ): Promise<Comment> {
    try {
      console.log(`${this.LOG_PREFIX} Modification commentaire ${commentId}`);

      const response: AxiosResponse<{
        success: boolean;
        data: Comment;
        message: string;
      }> = await api.put(`/interactions/comments/${commentId}`, { content });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de la modification du commentaire"
        );
      }

      console.log(`${this.LOG_PREFIX} Commentaire ${commentId} modifié`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur modification commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Supprimer un commentaire
   */
  async deleteComment(commentId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression commentaire ${commentId}`);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.delete(`/interactions/comments/${commentId}`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors de la suppression du commentaire"
        );
      }

      console.log(`${this.LOG_PREFIX} Commentaire ${commentId} supprimé`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Masquer un commentaire
   */
  async hideComment(commentId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Masquage commentaire ${commentId}`);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.post(`/interactions/comments/${commentId}/hide`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors du masquage du commentaire"
        );
      }

      console.log(`${this.LOG_PREFIX} Commentaire ${commentId} masqué`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur masquage commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Démasquer un commentaire
   */
  async unhideComment(commentId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Démasquage commentaire ${commentId}`);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.post(`/interactions/comments/${commentId}/unhide`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors du démasquage du commentaire"
        );
      }

      console.log(`${this.LOG_PREFIX} Commentaire ${commentId} démasqué`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur démasquage commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Signaler un commentaire
   */
  async reportComment(
    commentId: number,
    reason: string
  ): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Signalement commentaire ${commentId}`);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.post(`/interactions/comments/${commentId}/report`, { reason });

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors du signalement du commentaire"
        );
      }

      console.log(`${this.LOG_PREFIX} Commentaire ${commentId} signalé`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur signalement commentaire:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Bloquer un utilisateur
   */
  async blockUser(userId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Blocage utilisateur ${userId}`);

      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await api.post(`/users/${userId}/block`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Erreur lors du blocage de l'utilisateur"
        );
      }

      console.log(`${this.LOG_PREFIX} Utilisateur ${userId} bloqué`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur blocage utilisateur:`, error);
      throw error;
    }
  }
}

// ===== EXPORT SINGLETON =====
export const interactionService = new InteractionService();
export default interactionService;

// ===== FONCTIONS UTILITAIRES COMPATIBILITÉ (PRÉSERVÉES) =====

/**
 * @deprecated Utilisez interactionService.toggleLike() à la place
 */
export const toggleLike = (
  type: "blog_post" | "social_media_post",
  id: number
): Promise<any> => {
  return interactionService.toggleLike(type, id);
};

/**
 * @deprecated Utilisez interactionService.createComment() à la place
 */
export const addComment = (options: CommentOptions): Promise<Comment> => {
  return interactionService.createComment(options);
};
