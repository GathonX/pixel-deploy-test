import api from './api';
import { adaptBlogPostForFrontend } from '@/data/blogData';
import { AxiosResponse } from 'axios';

// ===== INTERFACES BASÉES SUR LES DONNÉES BACKEND =====
export interface BlogPost {
  id: number;
  user_id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  header_image: string | null;
  published_at: string | null;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null; // ✅ AJOUTÉ : Date/heure de publication programmée (datetime)
  scheduled_time: string | null; // ✅ Heure de publication programmée (time)
  likes: number;
  views: number;
  shares?: number;
  is_ai_generated: boolean;
  generation_context: {
    domain: string;
    user_id: number;
    tasks_count: number;
    projects_count: number;
    generated_at: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  categories: BlogCategory[];
  // ✅ CORRECTION : Avatar optionnel
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string; // ✅ Rendu optionnel
  };
  comments: Comment[] | number;
  
  // Propriétés de compatibilité pour l'ancien format
  author?: {
    id: string | number;
    name: string;
    avatar?: string;
    bio?: string;
  };
  headerImage?: string;
  publishDate?: string;
  isAIGenerated?: boolean;
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  pivot?: {
    blog_post_id: number;
    category_id: number;
  };
}

export interface Comment {
  id: number;
  content: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  parent_id?: number;
  created_at: string;
  updated_at: string;
  likes: number;
}

export interface BlogFilters {
  page?: number;
  per_page?: number;
  status?: 'draft' | 'scheduled' | 'published' | 'all';
  user_id?: number;
  site_id?: string;
  category?: string;
  search?: string;
}

export interface BlogStatistics {
  total_posts: number;
  published: number;
  drafts: number;
  scheduled: number;
  total_likes: number;
  total_views: number;
  ai_generated_percentage: number;
  top_categories: Array<{
    name: string;
    count: number;
  }>;
  total_comments?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

interface LaravelPaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  message?: string;
}

// ===== SERVICE BLOG PRINCIPAL =====

class BlogService {
  private readonly LOG_PREFIX = '📝 [BlogService]';

  /**
   * ✅ CORRIGÉ : Récupérer un post par ID
   * AVANT: /posts/${id} (n'existe pas)
   * APRÈS: /blog/${id} (existe dans blog.php)
   */
  async getBlogPost(id: number): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération post ID: ${id}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.get(`/blog/${id}`);

      console.log("🔍 [DEBUG] API Response RAW:", JSON.stringify(response.data, null, 2));

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération du post');
      }

      // ✅ CORRECTION : Extraire le post depuis la structure correcte
      const postData = response.data.data.post || response.data.data;
      const adaptedPost = adaptBlogPostForFrontend(postData);
      console.log(`${this.LOG_PREFIX} Post récupéré: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération post:`, error);
      throw error;
    }
  }

  /**
   * ✅ CORRIGÉ : Récupérer un post par slug
   * AVANT: /posts/slug/${slug} (n'existe pas)
   * APRÈS: /public/blog/${slug} (existe dans blog.php)
   */
  async getBlogPostBySlug(slug: string): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération post slug: ${slug}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.get(`/public/blog/${slug}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération du post');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Post récupéré: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération post:`, error);
      throw error;
    }
  }

  /**
   * ✅ CORRIGÉ : Mettre à jour un post
   * AVANT: PUT /posts/${id} (n'existe pas)
   * APRÈS: PUT /blog/${id} (existe dans blog.php)
   */
  async updateBlogPost(id: number, data: {
    title: string;
    summary: string;
    content: string;
    header_image?: string;
    tags: string[];
    categories: string[];
  }): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Mise à jour post ID: ${id}`, data);
      const response: AxiosResponse<ApiResponse<any>> = await api.put(`/blog/${id}`, {
        ...data,
        categories: data.categories
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la mise à jour du post');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Post mis à jour: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur mise à jour post:`, error);
      throw error;
    }
  }

  /**
   * ✅ CORRECTION : Changer le statut d'un blog post
   * Utilise le bon endpoint /blog/${id}/status avec scheduled_at ET scheduled_time
   */
  async changeStatus(id: number, status: 'draft' | 'scheduled' | 'published', scheduledDateTime?: string): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Changement statut blog post ID: ${id} vers ${status}`);
      const payload: Record<string, unknown> = { status };

      if (status === 'scheduled' && scheduledDateTime) {
        // ✅ Extraire la date et l'heure du datetime ISO
        const dt = new Date(scheduledDateTime);
        payload.scheduled_at = dt.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        payload.scheduled_time = dt.toTimeString().slice(0, 5); // Format: HH:mm

        console.log(`${this.LOG_PREFIX} Programmation: Date=${payload.scheduled_at}, Heure=${payload.scheduled_time}`);
      }

      const response: AxiosResponse<ApiResponse<any>> = await api.post(`/blog/${id}/status`, payload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors du changement de statut');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Statut changé: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur changement statut:`, error);
      throw error;
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Dupliquer un blog post
   * Utilise déjà le bon endpoint /blog/${id}/duplicate
   */
  async duplicateBlogPost(id: number): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Duplication blog post ID: ${id}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.post(`/blog/${id}/duplicate`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la duplication');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Blog post dupliqué: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur duplication:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Créer un nouveau blog post manuellement
   */
  async createBlogPost(data: {
    title: string;
    summary: string;
    content: string;
    header_image?: string;
    tags?: string[];
    categories?: string[];
    status?: 'draft' | 'scheduled' | 'published';
    scheduled_at?: string;
    scheduled_time?: string;
  }): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Création blog post manuel:`, data.title);
      const response: AxiosResponse<ApiResponse<any>> = await api.post('/blog', data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la création du post');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Blog post créé avec succès: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur création blog post:`, error);
      throw error;
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Récupérer les statistiques des blog posts
   */
  async getStatistics(): Promise<BlogStatistics> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques blog...`);
      const response: AxiosResponse<ApiResponse<BlogStatistics>> = await api.get('/blog/statistics');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      const cleanStats: BlogStatistics = {
        total_posts: response.data.data.total_posts || 0,
        published: response.data.data.published || 0,
        drafts: response.data.data.drafts || 0,
        scheduled: response.data.data.scheduled || 0,
        total_likes: response.data.data.total_likes || 0,
        total_views: response.data.data.total_views || 0,
        ai_generated_percentage: response.data.data.ai_generated_percentage || 0,
        top_categories: response.data.data.top_categories || [],
        total_comments: response.data.data.total_comments || 0
      };

      console.log(`${this.LOG_PREFIX} Statistiques récupérées:`, cleanStats);
      return cleanStats;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques:`, error);
      throw error;
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Récupérer tous les posts
   */
  async getBlogPosts(filters: BlogFilters = {}): Promise<BlogPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération blog posts...`, filters);
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.user_id) params.append('user_id', filters.user_id.toString());
      if (filters.site_id) params.append('site_id', filters.site_id);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);

      const response: AxiosResponse<LaravelPaginatedResponse<any>> = await api.get(`/blog?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des posts');
      }

      const paginatedData = response.data.data;
      if (!paginatedData || !paginatedData.data || !Array.isArray(paginatedData.data)) {
        console.warn(`${this.LOG_PREFIX} Structure pagination Laravel invalide:`, response.data);
        return [];
      }

      const posts = paginatedData.data.map(adaptBlogPostForFrontend);
      console.log(`${this.LOG_PREFIX} ${posts.length} blog posts récupérés`);
      return posts;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération posts:`, error);
      return [];
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Récupérer les blog posts publics
   */
  async getPublicBlogPosts(filters: {
    category?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<BlogPost[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération blog posts publics...`, filters);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response: AxiosResponse<LaravelPaginatedResponse<any>> = await api.get(`/public/blog?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération');
      }

      const paginatedData = response.data.data;
      if (!paginatedData || !paginatedData.data || !Array.isArray(paginatedData.data)) {
        console.warn(`${this.LOG_PREFIX} Structure pagination Laravel invalide:`, response.data);
        return [];
      }

      const posts = paginatedData.data.map(adaptBlogPostForFrontend);
      console.log(`${this.LOG_PREFIX} ${posts.length} blog posts publics récupérés`);
      return posts;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération publics:`, error);
      return [];
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Récupérer un blog post public par slug
   */
  async getPublicBlogPost(slug: string): Promise<BlogPost> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération blog post public slug: ${slug}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.get(`/public/blog/${slug}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Blog post non trouvé');
      }

      const adaptedPost = adaptBlogPostForFrontend(response.data.data);
      console.log(`${this.LOG_PREFIX} Blog post public récupéré: ${adaptedPost.title}`);
      return adaptedPost;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération blog post public:`, error);
      throw error;
    }
  }

  /**
   * ✅ DÉJÀ CORRECT : Méthode de debug
   */
  async debugBackendResponse(endpoint: string): Promise<any> {
    try {
      const response = await api.get(endpoint);
      console.log(`🔍 [BlogService] Debug ${endpoint}:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`❌ [BlogService] Debug error ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * ✅ NOUVEAU : Supprimer un blog post
   */
  async deleteBlogPost(id: number): Promise<void> {
    try {
      console.log(`${this.LOG_PREFIX} Suppression blog post ID: ${id}`);
      const response: AxiosResponse<ApiResponse<any>> = await api.delete(`/blog/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la suppression');
      }

      console.log(`${this.LOG_PREFIX} Blog post ${id} supprimé avec succès`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suppression blog post:`, error);
      throw error;
    }
  }
}

export const blogService = new BlogService();
export default blogService;

/**
 * @deprecated Utilisez blogService.getBlogPosts()
 */
export const fetchBlogPosts = (filters?: BlogFilters): Promise<BlogPost[]> => {
  return blogService.getBlogPosts(filters);
};

/**
 * @deprecated Utilisez blogService.getBlogPost()
 */
export const fetchBlogPost = (id: number): Promise<BlogPost> => {
  return blogService.getBlogPost(id);
};