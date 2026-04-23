// src/services/weeklyGenerationService.ts
// ⚠️ SYSTÈME MIGRÉ VERS /api/features/
// Ce service est conservé pour compatibilité temporaire

import api from "./api";
import type { AxiosResponse } from "axios";

// ===== TYPES SIMPLIFIÉS =====

export interface GenerationResponse {
  success: boolean;
  message: string;
  generated: boolean;
  data?: {
    blog_posts?: any[];
    social_posts?: any[];
    errors?: string[];
  };
  error?: string;
}

export interface GenerationHistory {
  total_generated: number;
  last_generation_date: string;
  weekly_stats: {
    blog_posts: number;
    social_posts: number;
  };
}

// ===== SERVICE SIMPLIFIÉ =====

class WeeklyGenerationService {
  private readonly LOG_PREFIX = "🤖 [WeeklyGenerationService]";

  /**
   * ⚠️ DÉPRÉCIÉ : Utiliser /api/features/generate-remaining à la place
   * Conservé pour compatibilité temporaire
   */
  async startProgressiveGeneration(
    pageType: "blog" | "social_media" | "both",
    priority?: "high" | "normal"
  ): Promise<GenerationResponse> {
    console.warn(
      `${this.LOG_PREFIX} DÉPRÉCIÉ: Utilisez /api/features/generate-remaining`
    );

    try {
      // Redirection vers le nouveau système features
      const response: AxiosResponse<any> = await api.post(
        "/features/generate-remaining",
        {
          feature_key: pageType === "both" ? "blog" : pageType,
        }
      );

      return {
        success: response.data.success || false,
        message: response.data.message || "Génération démarrée via features",
        generated: response.data.posts_generated > 0,
        data: {},
      };
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} Erreur redirection features:`, error);
      return {
        success: false,
        message: error.response?.data?.message || "Erreur génération",
        generated: false,
        error: error.message,
      };
    }
  }

  /**
   * ✅ CONSERVÉ : Vérifier si utilisateur a posts cette semaine
   */
  async hasPostsThisWeek(): Promise<{ has_posts: boolean; count: number }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        data: { has_posts: boolean; count: number };
        message: string;
      }> = await api.get("/content-generation/posts-this-week");

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      console.error(
        `${this.LOG_PREFIX} Erreur vérification posts semaine:`,
        error
      );

      // Valeur par défaut en cas d'erreur
      return {
        has_posts: false,
        count: 0,
      };
    }
  }

  /**
   * ✅ CONSERVÉ : Obtenir historique des générations
   */
  async getGenerationHistory(): Promise<GenerationHistory> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération historique générations`);

      const response: AxiosResponse<{
        success: boolean;
        data: GenerationHistory;
        message: string;
      }> = await api.get("/content-generation/generation-history");

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      return response.data.data;
    } catch (error: any) {
      console.error(
        `${this.LOG_PREFIX} Erreur récupération historique:`,
        error
      );

      // Valeur par défaut
      return {
        total_generated: 0,
        last_generation_date: "",
        weekly_stats: {
          blog_posts: 0,
          social_posts: 0,
        },
      };
    }
  }

  /**
   * ✅ CONSERVÉ : Marquer génération comme vue par l'utilisateur
   */
  async markGenerationAsSeen(): Promise<void> {
    try {
      await api.post("/content-generation/mark-seen");
      console.log(`${this.LOG_PREFIX} Génération marquée comme vue`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur marquage vu:`, error);
      // Non-critique, ne pas throw
    }
  }

  /**
   * ✅ NOUVEAU : Vérifier statut génération via features
   */
  async getFeatureGenerationStatus(
    featureKey: "blog" | "social_media"
  ): Promise<{
    has_remaining: boolean;
    posts_remaining: number;
    can_generate_now: boolean;
    next_generation_time?: string;
  }> {
    try {
      const response = await api.get(
        `/features/generation-status?feature_key=${featureKey}`
      );

      return {
        has_remaining: response.data.has_remaining || false,
        posts_remaining: response.data.posts_remaining || 0,
        can_generate_now: response.data.can_generate_now || false,
        next_generation_time: response.data.next_generation_time,
      };
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} Erreur statut features:`, error);

      return {
        has_remaining: false,
        posts_remaining: 0,
        can_generate_now: false,
      };
    }
  }

  /**
   * ✅ NOUVEAU : Générer posts restants via features
   */
  async generateRemainingPosts(featureKey: "blog" | "social_media"): Promise<{
    success: boolean;
    message: string;
    posts_generated: number;
    posts_remaining: number;
    wait_minutes?: number;
  }> {
    try {
      console.log(`${this.LOG_PREFIX} Génération via features:`, featureKey);

      const response = await api.post("/features/generate-remaining", {
        feature_key: featureKey,
      });

      return {
        success: response.data.success || false,
        message: response.data.message || "Génération terminée",
        posts_generated: response.data.posts_generated || 0,
        posts_remaining: response.data.posts_remaining || 0,
        wait_minutes: response.data.wait_minutes,
      };
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} Erreur génération features:`, error);

      return {
        success: false,
        message: error.response?.data?.message || "Erreur génération",
        posts_generated: 0,
        posts_remaining: 0,
        wait_minutes: error.response?.data?.wait_minutes,
      };
    }
  }

  // ===== MÉTHODES DÉPRÉCIÉES (pour compatibilité) =====

  /**
   * @deprecated Utiliser getFeatureGenerationStatus() à la place
   */
  async checkWeeklyGenerationNeed(): Promise<any> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: checkWeeklyGenerationNeed()`);
    return { needs_generation: false, reason: "Migré vers features" };
  }

  /**
   * @deprecated Utiliser generateRemainingPosts() à la place
   */
  async startWeeklyGeneration(): Promise<GenerationResponse> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: startWeeklyGeneration()`);
    return { success: false, message: "Migré vers features", generated: false };
  }

  /**
   * @deprecated Utiliser generateRemainingPosts() à la place
   */
  async generateTodayPost(): Promise<GenerationResponse> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: generateTodayPost()`);
    return { success: false, message: "Migré vers features", generated: false };
  }

  /**
   * @deprecated Non utilisé dans le nouveau système
   */
  async detectFirstVisitAndGenerate(): Promise<GenerationResponse> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: detectFirstVisitAndGenerate()`);
    return { success: false, message: "Migré vers features", generated: false };
  }

  /**
   * @deprecated Non utilisé dans le nouveau système
   */
  async getProgressiveGenerationStatus(): Promise<any> {
    console.warn(
      `${this.LOG_PREFIX} DÉPRÉCIÉ: getProgressiveGenerationStatus()`
    );
    return { in_progress: false, posts_created: 0, posts_remaining: 0 };
  }

  /**
   * @deprecated Non utilisé dans le nouveau système
   */
  async cancelProgressiveGeneration(): Promise<any> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: cancelProgressiveGeneration()`);
    return { success: false, message: "Non disponible" };
  }

  /**
   * @deprecated Non utilisé dans le nouveau système
   */
  async forceImmediateGeneration(): Promise<GenerationResponse> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: forceImmediateGeneration()`);
    return { success: false, message: "Migré vers features", generated: false };
  }

  /**
   * @deprecated Non utilisé dans le nouveau système
   */
  async queueWeeklyPosts(): Promise<any> {
    console.warn(`${this.LOG_PREFIX} DÉPRÉCIÉ: queueWeeklyPosts()`);
    return { success: false, message: "Migré vers features" };
  }
}

// ===== EXPORT SINGLETON =====

export const weeklyGenerationService = new WeeklyGenerationService();
export default weeklyGenerationService;
