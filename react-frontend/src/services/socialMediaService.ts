// src/services/socialMediaService.ts - SERVICE SOCIAL MEDIA AVEC API BACKEND
import api from './api';
import type { AxiosResponse } from 'axios';

// ===== TYPES BASÉS SUR LES DONNÉES BACKEND RÉELLES =====
export interface SocialMediaPost {
  id: number;
  user_id: number;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  content: string;
  images: string[];
  video: string | null;
  published_at: string | null;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_time: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  is_ai_generated: boolean;
  generation_context: {
    domain: string;
    user_id: number;
    platform: string;
    tasks_count: number;
    projects_count: number;
    generated_at: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  categories: SocialMediaCategory[];
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface SocialMediaCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  pivot?: {
    social_media_post_id: number;
    category_id: number;
  };
}

export interface SocialMediaPlatform {
  key: string;
  name: string;
  character_limit: number;
  supports_images: boolean;
  supports_video: boolean;
  max_images: number;
  hashtag_limit: number;
}

export interface SocialFilters {
  status?: 'all' | 'draft' | 'scheduled' | 'published';
  platform?: string;
  category?: string;
  per_page?: number;
  page?: number;
  search?: string;
  site_id?: string;
}

export interface SocialStatistics {
  total_posts: number;
  by_platform: Record<string, number>;
  by_status: {
    published: number;
    drafts: number;
    scheduled: number;
  };
  total_engagement: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  ai_generated_percentage: number;
  top_platforms: Array<{
    platform: string;
    count: number;
    engagement: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// ===== INTERFACES POUR GÉNÉRATION =====
export interface SocialPostGenerationRequest {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin';
  status?: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string;
  categories?: string[];
  tags?: string[];
}

// ===== SERVICE SOCIAL MEDIA PRINCIPAL =====

class SocialMediaService {
  private readonly LOG_PREFIX = '📱 [SocialMediaService]';

  // ===== LISTE ET RÉCUPÉRATION =====

  /**
   * Récupérer la liste des posts social media de l'utilisateur
   */
  async getSocialPosts(filters: SocialFilters = {}): Promise<SocialMediaPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération social posts...`, filters);

      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.category) params.append('category', filters.category);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.site_id) params.append('site_id', filters.site_id);

      const url = `/social?${params.toString()}`;
      const response: AxiosResponse<any> = await api.get(url);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      // ✅ CORRECTION : Récupérer les posts depuis la structure paginée
      let posts: SocialMediaPost[];
      
      if (response.data.data && response.data.data.data) {
        // Structure paginée Laravel : { data: { data: [...], current_page, ... } }
        posts = response.data.data.data;
      } else if (Array.isArray(response.data.data)) {
        // Structure tableau direct : { data: [...] }
        posts = response.data.data;
      } else {
        console.error(`${this.LOG_PREFIX} Format de réponse inattendu:`, response.data);
        posts = [];
      }

      console.log(`${this.LOG_PREFIX} ${posts.length} social posts récupérés`);
      return posts;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un post social media par ID
   */
  async getSocialPost(id: number): Promise<SocialMediaPost> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération social post ID:`, id);

      const response: AxiosResponse<ApiResponse<SocialMediaPost>> = await api.get(`/social/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Post social media non trouvé');
      }

      console.log(`${this.LOG_PREFIX} Social post récupéré:`, response.data.data.platform);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération social post:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les posts par plateforme
   */
  async getPostsByPlatform(platform: string, filters: {
    status?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<SocialMediaPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération posts ${platform}...`, filters);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response: AxiosResponse<PaginatedResponse<SocialMediaPost>> = await api.get(`/social/platforms/${platform}/posts?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} posts ${platform} récupérés`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération ${platform}:`, error);
      throw error;
    }
  }

  // ===== CRÉATION ET GÉNÉRATION =====

  /**
   * ✅ AJOUTÉ : Générer un post social media avec IA
   */
  async generateSocialPost(request: SocialPostGenerationRequest): Promise<SocialMediaPost> {
    try {
      console.log(`${this.LOG_PREFIX} Génération post social ${request.platform}...`, request);

      const response: AxiosResponse<ApiResponse<SocialMediaPost>> = await api.post('/social/generate', request);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la génération');
      }

      console.log(`${this.LOG_PREFIX} Post social généré avec succès:`, response.data.data.id);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur génération:`, error);
      throw error;
    }
  }

  // ===== MODIFICATION =====

  /**
   * Mettre à jour un post social media
   */
  async updateSocialPost(id: number, updates: Partial<{
    content: string;
    images: string[];
    video: string;
    tags: string[];
    categories: string[];
  }>): Promise<SocialMediaPost> {
    try {
      console.log(`${this.LOG_PREFIX} Mise à jour social post ID:`, id, updates);

      const response: AxiosResponse<ApiResponse<SocialMediaPost>> = await api.put(`/social/${id}`, updates);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la mise à jour');
      }

      console.log(`${this.LOG_PREFIX} Social post mis à jour avec succès`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur mise à jour:`, error);
      throw error;
    }
  }

  /**
   * Changer le statut d'un post social media
   */
  async changeStatus(id: number, status: 'draft' | 'scheduled' | 'published', scheduledDateTime?: string): Promise<SocialMediaPost> {
    try {
      console.log(`${this.LOG_PREFIX} Changement statut social post ID:`, id, 'vers', status);

      const payload: Record<string, unknown> = { status };
      
      // ✅ CORRECTION : Pour scheduled, envoyer scheduled_at (date complète)
      if (status === 'scheduled' && scheduledDateTime) {
        // Le backend attend scheduled_at pour la date complète
        payload.scheduled_at = scheduledDateTime;
        console.log(`${this.LOG_PREFIX} Date/heure programmée:`, scheduledDateTime);
      }

      const response: AxiosResponse<ApiResponse<SocialMediaPost>> = await api.post(`/social/${id}/status`, payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors du changement de statut');
      }

      console.log(`${this.LOG_PREFIX} Statut changé avec succès`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur changement statut:`, error);
      throw error;
    }
  }

  /**
   * Dupliquer un post social media
   */
  async duplicateSocialPost(id: number): Promise<SocialMediaPost> {
    try {
      console.log(`${this.LOG_PREFIX} Duplication social post ID:`, id);

      const response: AxiosResponse<ApiResponse<SocialMediaPost>> = await api.post(`/social/${id}/duplicate`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la duplication');
      }

      console.log(`${this.LOG_PREFIX} Social post dupliqué avec succès:`, response.data.data.id);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur duplication:`, error);
      throw error;
    }
  }

  // ===== SUPPRESSION =====

  /**
   * ✅ AJOUTÉ : Supprimer un post social media
   */
  async deleteSocialPost(id: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression social post ID:`, id);

      const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/social/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la suppression');
      }

      console.log(`${this.LOG_PREFIX} Social post supprimé avec succès`);

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression:`, error);
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de partages
   */
  async sharePost(id: number): Promise<{ shares: number }> {
    try {
      console.log(`${this.LOG_PREFIX} Partage social post ID:`, id);

      const response: AxiosResponse<ApiResponse<{ shares: number }>> = await api.post(`/social/${id}/share`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors du partage');
      }

      console.log(`${this.LOG_PREFIX} Partage enregistré avec succès`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur partage:`, error);
      throw error;
    }
  }

  // ===== PLATEFORMES ET STATISTIQUES =====

  /**
   * Récupérer la liste des plateformes supportées
   */
  async getPlatforms(): Promise<SocialMediaPlatform[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération plateformes...`);

      const response: AxiosResponse<ApiResponse<SocialMediaPlatform[]>> = await api.get('/social/platforms');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des plateformes');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} plateformes récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur plateformes:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques générales social media
   */
  async getStatistics(): Promise<SocialStatistics> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques social media...`);

      const response: AxiosResponse<ApiResponse<SocialStatistics>> = await api.get('/social/statistics');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Statistiques récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'une plateforme spécifique
   */
  async getPlatformStatistics(platform: string): Promise<SocialStatistics> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques ${platform}...`);

      const response: AxiosResponse<ApiResponse<SocialStatistics>> = await api.get(`/social/statistics/${platform}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Statistiques ${platform} récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques ${platform}:`, error);
      throw error;
    }
  }

  // ===== POSTS PUBLICS (sans authentification) =====

  /**
   * Récupérer les posts social media publics
   */
  async getPublicSocialPosts(filters: {
    platform?: string;
    category?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<SocialMediaPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération social posts publics...`, filters);

      const params = new URLSearchParams();
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.category) params.append('category', filters.category);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response: AxiosResponse<PaginatedResponse<SocialMediaPost>> = await api.get(`/public/social?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} social posts publics récupérés`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération publics:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les posts tendance
   */
  async getTrendingPosts(limit = 10): Promise<SocialMediaPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération posts tendance...`);

      const response: AxiosResponse<ApiResponse<SocialMediaPost[]>> = await api.get(`/public/social/trending?limit=${limit}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des tendances');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} posts tendance récupérés`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur posts tendance:`, error);
      throw error;
    }
  }

}

// ===== EXPORT SINGLETON =====
export const socialMediaService = new SocialMediaService();
export default socialMediaService;

// ===== FONCTIONS UTILITAIRES COMPATIBILITÉ =====

/**
 * @deprecated Utilisez socialMediaService.getSocialPosts() à la place
 */
export const getPosts = (filters?: SocialFilters): Promise<SocialMediaPost[]> => {
  return socialMediaService.getSocialPosts(filters);
};

/**
 * @deprecated Utilisez socialMediaService.getSocialPost() à la place
 */
export const getPost = (id: number): Promise<SocialMediaPost> => {
  return socialMediaService.getSocialPost(id);
};