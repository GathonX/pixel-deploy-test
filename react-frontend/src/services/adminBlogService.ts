import api from './api';
import { AxiosResponse } from 'axios';

// Interface pour les utilisateurs
export interface User {
  id: number;
  name: string;
  email: string;
}

// Interface pour les articles admin
export interface AdminBlogPost {
  id: number;
  user_id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  header_image: string | null;
  published_at: string | null;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_time: string | null;
  likes: number;
  views: number;
  shares: number;
  comments_count?: number; // ✅ AJOUTÉ : Nombre de commentaires
  is_ai_generated: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// Interface pour les statistiques admin
export interface AdminBlogStatistics {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  authors_count: number;
  categories_count: number;
  recent_posts: AdminBlogPost[];
  most_viewed: AdminBlogPost[];
}

// Interface pour les filtres
export interface AdminBlogFilters {
  page?: number;
  per_page?: number;
  status?: 'draft' | 'scheduled' | 'published' | 'all';
  user_id?: number;
  category?: string;
  search?: string;
}

// Interface pour les commentaires
export interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  user: {
    id: number | null;
    name: string;
    email: string;
  };
  replies_count: number;
  is_anonymous: boolean;
  display_name: string;
}

// Interface pour les données de commentaires avec stats du post
export interface CommentsData {
  comments: Comment[];
  post_stats: {
    likes: number;
    views: number;
    comments_count: number;
  };
}

// Interface pour créer un article
export interface CreateBlogPostData {
  title: string;
  summary: string;
  content: string;
  header_image?: string;
  tags?: string[];
  categories?: string[];
  status?: 'draft' | 'scheduled' | 'published';
  scheduled_at?: string;
  scheduled_time?: string;
  author_id?: number; // Permet de créer pour un autre utilisateur
}

// ✅ NOUVEAU : Interface pour les informations projet admin
export interface AdminProjectInfo {
  id: number;
  user_id: number;
  business_name: string | null;
  business_description: string | null;
  business_ideas: string[] | null;
  target_audience: string[] | null;
  keywords: string[] | null;
  industry: string | null;
  content_goals: string | null;
  tone_of_voice: string;
  content_themes: string[] | null;
  auto_generation_enabled: boolean;
  posts_per_week: number;
  last_objective_generated_at: string | null;
  current_week_identifier: string | null;
  created_at: string;
  updated_at: string;
}

// ✅ NOUVEAU : Interface pour créer/modifier les infos projet admin
export interface AdminProjectInfoData {
  business_name?: string;
  business_description?: string;
  business_ideas?: string[];
  target_audience?: string[];
  keywords?: string[];
  industry?: string;
  content_goals?: string;
  tone_of_voice?: string;
  content_themes?: string[];
  auto_generation_enabled?: boolean;
  posts_per_week?: number;
}

// ✅ NOUVEAU : Interface pour objectif hebdomadaire admin
export interface AdminWeeklyObjective {
  id: number;
  admin_project_info_id: number;
  user_id: number;
  week_identifier: string;
  week_start_date: string;
  week_end_date: string;
  objective_text: string;
  daily_topics: string[] | null;
  keywords_focus: string[] | null;
  is_generated: boolean;
  posts_generated_count: number;
  posts_target_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface LaravelPaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url?: string;
    next_page_url?: string;
  };
  message?: string;
}

class AdminBlogService {
  private readonly LOG_PREFIX = '🔧 [AdminBlogService]';

  /**
   * Récupérer tous les articles (admin)
   */
  async getArticles(filters: AdminBlogFilters = {}): Promise<LaravelPaginatedResponse<AdminBlogPost>> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération articles admin...`, filters);
      const params = new URLSearchParams();
      
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.user_id) params.append('user_id', filters.user_id.toString());
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response: AxiosResponse<LaravelPaginatedResponse<AdminBlogPost>> = await api.get(`/admin/blog?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des articles');
      }

      console.log(`${this.LOG_PREFIX} Articles récupérés:`, response.data.data.data.length);
      return response.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération articles:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un article par ID
   */
  async getArticle(id: number): Promise<AdminBlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération article ID: ${id}`);
      const response: AxiosResponse<ApiResponse<AdminBlogPost>> = await api.get(`/admin/blog/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Article non trouvé');
      }

      console.log(`${this.LOG_PREFIX} Article récupéré:`, response.data.data.title);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération article:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouvel article
   */
  async createArticle(data: CreateBlogPostData): Promise<AdminBlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Création article:`, data.title);
      const response: AxiosResponse<ApiResponse<AdminBlogPost>> = await api.post('/admin/blog', data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la création de l\'article');
      }

      console.log(`${this.LOG_PREFIX} Article créé avec succès:`, response.data.data.title);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur création article:`, error);
      throw error;
    }
  }

  /**
   * Modifier un article
   */
  async updateArticle(id: number, data: Partial<CreateBlogPostData>): Promise<AdminBlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Modification article ID: ${id}`);
      const response: AxiosResponse<ApiResponse<AdminBlogPost>> = await api.put(`/admin/blog/${id}`, data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la modification de l\'article');
      }

      console.log(`${this.LOG_PREFIX} Article modifié avec succès:`, response.data.data.title);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur modification article:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un article
   */
  async deleteArticle(id: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression article ID: ${id}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.delete(`/admin/blog/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la suppression de l\'article');
      }

      console.log(`${this.LOG_PREFIX} Article supprimé avec succès`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression article:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(): Promise<AdminBlogStatistics> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques...`);
      const response: AxiosResponse<ApiResponse<AdminBlogStatistics>> = await api.get('/admin/blog/statistics');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Statistiques récupérées`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération statistiques:`, error);
      throw error;
    }
  }

  /**
   * Upload d'image
   */
  async uploadImage(file: File): Promise<{path: string, filename: string, url: string}> {
    try {
      console.log(`${this.LOG_PREFIX} Upload image:`, file.name);
      const formData = new FormData();
      formData.append('image', file);

      const response: AxiosResponse<ApiResponse<{path: string, filename: string, url: string}>> = await api.post('/admin/blog/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de l\'upload de l\'image');
      }

      console.log(`${this.LOG_PREFIX} Image uploadée:`, response.data.data.url);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur upload image:`, error);
      throw error;
    }
  }

  /**
   * Récupérer la liste des utilisateurs
   */
  async getUsers(): Promise<User[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération utilisateurs...`);
      const response: AxiosResponse<ApiResponse<User[]>> = await api.get('/admin/blog/users');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des utilisateurs');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} utilisateurs récupérés`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération utilisateurs:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les commentaires d'un article avec stats du post
   */
  async getComments(postId: number): Promise<CommentsData> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération commentaires article ${postId}...`);
      const response: AxiosResponse<ApiResponse<CommentsData>> = await api.get(`/admin/blog/${postId}/comments`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des commentaires');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.comments?.length || 0} commentaires récupérés`, {
        post_stats: response.data.data.post_stats
      });
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération commentaires:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un commentaire
   */
  async deleteComment(commentId: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression commentaire ${commentId}...`);
      const response: AxiosResponse<ApiResponse<any>> = await api.delete(`/admin/blog/comments/${commentId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la suppression du commentaire');
      }

      console.log(`${this.LOG_PREFIX} Commentaire supprimé avec succès`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression commentaire:`, error);
      throw error;
    }
  }

  // ========================================
  // ✅ NOUVELLES MÉTHODES ADMIN PROJECT INFO
  // ========================================

  /**
   * ✅ Récupérer les informations projet admin
   */
  async getAdminProjectInfo(): Promise<AdminProjectInfo | null> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération infos projet admin...`);
      const response: AxiosResponse<ApiResponse<AdminProjectInfo | null>> = await api.get('/admin/project-info');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      console.log(`${this.LOG_PREFIX} Infos projet récupérées`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération infos projet:`, error);
      throw error;
    }
  }

  /**
   * ✅ Créer ou mettre à jour les informations projet admin
   */
  async saveAdminProjectInfo(data: AdminProjectInfoData): Promise<AdminProjectInfo> {
    try {
      console.log(`${this.LOG_PREFIX} Sauvegarde infos projet admin...`, data);
      const response: AxiosResponse<ApiResponse<AdminProjectInfo>> = await api.post('/admin/project-info', data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la sauvegarde');
      }

      console.log(`${this.LOG_PREFIX} Infos projet sauvegardées avec succès`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur sauvegarde infos projet:`, error);
      throw error;
    }
  }

  /**
   * ✅ Récupérer l'objectif de la semaine courante
   */
  async getCurrentWeekObjective(): Promise<AdminWeeklyObjective | null> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération objectif semaine courante...`);
      const response: AxiosResponse<ApiResponse<AdminWeeklyObjective | null>> = await api.get('/admin/weekly-objective/current');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      console.log(`${this.LOG_PREFIX} Objectif récupéré`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération objectif:`, error);
      throw error;
    }
  }

  /**
   * ✅ Générer l'objectif hebdomadaire admin
   */
  async generateWeeklyObjective(): Promise<AdminWeeklyObjective> {
    try {
      console.log(`${this.LOG_PREFIX} Génération objectif hebdomadaire...`);
      const response: AxiosResponse<ApiResponse<AdminWeeklyObjective>> = await api.post('/admin/weekly-objective/generate');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la génération');
      }

      console.log(`${this.LOG_PREFIX} Objectif généré avec succès`);
      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur génération objectif:`, error);
      throw error;
    }
  }

  /**
   * ✅ Générer les posts hebdomadaires admin (PROGRESSIF: 1er post immédiat + reste en arrière-plan)
   */
  async generateWeeklyPosts(): Promise<{
    posts_count?: number;
    objective?: AdminWeeklyObjective;
    status?: string;
    message?: string;
    job_id?: string;
    first_post?: any;
  }> {
    try {
      console.log(`${this.LOG_PREFIX} Génération posts hebdomadaires admin...`);
      const response: AxiosResponse<any> = await api.post('/admin/generate-weekly-posts');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la génération des posts');
      }

      // ✅ Mode progressif (1er post immédiat + job_id pour le reste)
      if (response.data.status === 'processing' && response.data.job_id) {
        console.log(`${this.LOG_PREFIX} Premier post créé, génération arrière-plan:`, response.data.job_id);
        return {
          status: 'processing',
          message: response.data.message || 'Premier post créé, génération en cours...',
          job_id: response.data.job_id,
          first_post: response.data.data?.first_post
        };
      }

      // Mode synchrone complet (avec data)
      console.log(`${this.LOG_PREFIX} Posts générés avec succès:`, response.data.data?.posts_count);
      return response.data.data || {};
    } catch (error: any) {
      console.error(`${this.LOG_PREFIX} Erreur génération posts:`, error);

      // ✅ FIX: Gérer spécifiquement l'erreur 409 (génération déjà en cours)
      if (error.response?.status === 409) {
        return {
          status: 'already_processing',
          message: error.response?.data?.message || 'Une génération est déjà en cours. Veuillez patienter...'
        };
      }

      throw error;
    }
  }

  /**
   * ✅ Vérifier l'état de génération
   */
  async getGenerationStatus(): Promise<{
    has_project_info: boolean;
    has_objective_this_week: boolean;
    posts_generated_this_week: number;
    can_generate: boolean;
  }> {
    try {
      console.log(`${this.LOG_PREFIX} Vérification état génération...`);
      const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/generation-status');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la vérification');
      }

      return response.data.data;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur vérification état:`, error);
      throw error;
    }
  }
}

export const adminBlogService = new AdminBlogService();
export default adminBlogService;