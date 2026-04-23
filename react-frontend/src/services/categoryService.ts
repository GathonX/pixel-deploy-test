// src/services/categoryService.ts - SERVICE GESTION DES CATÉGORIES
import api from './api';
import type { AxiosResponse } from 'axios';

// ✅ TYPES BASÉS SUR LES DONNÉES BACKEND RÉELLES
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Compteurs dynamiques
  blog_posts_count?: number;
  social_posts_count?: number;
  total_posts_count?: number;
}

export interface CategoryWithPosts extends Category {
  blog_posts?: Array<{
    id: number;
    title: string;
    slug: string;
    status: string;
    created_at: string;
  }>;
  social_posts?: Array<{
    id: number;
    platform: string;
    content: string;
    status: string;
    created_at: string;
  }>;
}

export interface CategoryFilters {
  is_active?: boolean;
  type?: 'blog' | 'social' | 'all';
  search?: string;
  per_page?: number;
  page?: number;
}

export interface CategoryStatistics {
  total_categories: number;
  active_categories: number;
  inactive_categories: number;
  most_used_categories: Array<{
    id: number;
    name: string;
    slug: string;
    total_posts: number;
    blog_posts: number;
    social_posts: number;
  }>;
  categories_by_type: {
    blog_only: number;
    social_only: number;
    both: number;
  };
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

// ===== SERVICE CATÉGORIES PRINCIPAL =====

class CategoryService {
  private readonly LOG_PREFIX = '🏷️ [CategoryService]';

  // ===== LISTE ET RÉCUPÉRATION =====

  /**
   * Récupérer toutes les catégories
   */
  async getCategories(filters: CategoryFilters = {}): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégories...`, filters);

      const params = new URLSearchParams();
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response: AxiosResponse<PaginatedResponse<Category>> = await api.get(`/categories?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des catégories');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data?.length || 0} catégories récupérées`);
      // ✅ CORRECTION : S'assurer que data est un array
      return Array.isArray(response.data.data) ? response.data.data : [];

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération catégories:`, error);
      throw error;
    }
  }

  /**
   * Récupérer une catégorie par ID avec ses posts
   */
  async getCategory(id: number): Promise<CategoryWithPosts> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégorie ID:`, id);

      const response: AxiosResponse<ApiResponse<CategoryWithPosts>> = await api.get(`/categories/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Catégorie non trouvée');
      }

      console.log(`${this.LOG_PREFIX} Catégorie récupérée:`, response.data.data.name);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération catégorie:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les posts d'une catégorie spécifique
   */
  async getCategoryPosts(
    id: number,
    filters: {
      type?: 'blog' | 'social' | 'all';
      status?: 'draft' | 'scheduled' | 'published' | 'all';
      per_page?: number;
      page?: number;
    } = {}
  ): Promise<{
    blog_posts: Array<any>;
    social_posts: Array<any>;
    total_count: number;
  }> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération posts catégorie ID:`, id, filters);

      const params = new URLSearchParams();
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.per_page) params.append('per_page', filters.per_page.toString());
      if (filters.page) params.append('page', filters.page.toString());

      const response: AxiosResponse<ApiResponse<{
        blog_posts: Array<any>;
        social_posts: Array<any>;
        total_count: number;
      }>> = await api.get(`/categories/${id}/posts?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des posts');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.total_count} posts récupérés pour catégorie`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération posts catégorie:`, error);
      throw error;
    }
  }

  // ===== CATÉGORIES POPULAIRES ET RECHERCHE =====

  /**
   * Récupérer les catégories populaires
   */
  async getPopularCategories(limit = 10): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégories populaires (limit: ${limit})...`);

      const response: AxiosResponse<ApiResponse<Category[]>> = await api.get(`/categories/popular?limit=${limit}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des catégories populaires');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} catégories populaires récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur catégories populaires:`, error);
      throw error;
    }
  }

  /**
   * Rechercher des catégories par nom
   */
  async searchCategories(query: string, limit = 20): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Recherche catégories:`, query);

      const response: AxiosResponse<ApiResponse<Category[]>> = await api.get(`/categories/search?q=${encodeURIComponent(query)}&limit=${limit}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la recherche');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} catégories trouvées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur recherche catégories:`, error);
      throw error;
    }
  }

  // ===== STATISTIQUES =====

  /**
   * Récupérer les statistiques des catégories
   */
  async getCategoryStatistics(): Promise<CategoryStatistics> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques catégories...`);

      const response: AxiosResponse<ApiResponse<CategoryStatistics>> = await api.get('/categories/statistics');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Statistiques catégories récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur statistiques catégories:`, error);
      throw error;
    }
  }

  // ===== CATÉGORIES PAR TYPE =====

  /**
   * Récupérer les catégories utilisées pour les blogs
   */
  async getBlogCategories(activeOnly = true): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégories blog...`);

      const filters: CategoryFilters = {
        type: 'blog',
        is_active: activeOnly
      };

      return this.getCategories(filters);

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur catégories blog:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les catégories utilisées pour les réseaux sociaux
   */
  async getSocialCategories(activeOnly = true): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégories social...`);

      const filters: CategoryFilters = {
        type: 'social',
        is_active: activeOnly
      };

      return this.getCategories(filters);

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur catégories social:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Récupérer les catégories publiques (sans authentification)
   * Cette méthode utilise l'API publique qui fonctionne
   */
  async getPublicCategories(limit?: number): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération catégories publiques...`, { limit });

      const params = new URLSearchParams();
      if (limit) params.append('per_page', limit.toString());

      const response: AxiosResponse<{
        success: boolean;
        data: {
          data: Category[]; // Structure pagination Laravel
          current_page: number;
          per_page: number;
          total: number;
        } | Category[]; // Fallback si pas de pagination
        message: string;
      }> = await api.get(`/public/categories?${params.toString()}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des catégories publiques');
      }

      // ✅ GESTION PAGINATION LARAVEL
      let categories: Category[] = [];
      if (response.data.data && typeof response.data.data === 'object' && 'data' in response.data.data) {
        // Structure pagination Laravel
        categories = response.data.data.data;
      } else if (Array.isArray(response.data.data)) {
        // Structure simple
        categories = response.data.data;
      }

      console.log(`${this.LOG_PREFIX} ${categories.length} catégories publiques récupérées`);
      return categories;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur catégories publiques:`, error);
      throw error;
    }
  }

  // ===== UTILITAIRES =====

  /**
   * Trouver une catégorie par son slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      console.log(`${this.LOG_PREFIX} Recherche catégorie par slug:`, slug);

      const categories = await this.getCategories({ search: slug });
      const category = categories.find(cat => cat.slug === slug);

      if (category) {
        console.log(`${this.LOG_PREFIX} Catégorie trouvée par slug:`, category.name);
        return category;
      }

      console.log(`${this.LOG_PREFIX} Aucune catégorie trouvée pour slug:`, slug);
      return null;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur recherche par slug:`, error);
      return null;
    }
  }

  /**
   * Vérifier si une catégorie existe
   */
  async categoryExists(name: string): Promise<boolean> {
    try {
      const categories = await this.searchCategories(name, 1);
      return categories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur vérification existence:`, error);
      return false;
    }
  }

  /**
   * Obtenir les suggestions de catégories basées sur des tags
   */
  async getSuggestedCategories(tags: string[]): Promise<Category[]> {
    try {
      console.log(`${this.LOG_PREFIX} Suggestions catégories pour tags:`, tags);

      // Rechercher pour chaque tag et combiner les résultats
      const suggestions: Category[] = [];
      const seen = new Set<number>();

      for (const tag of tags) {
        try {
          const results = await this.searchCategories(tag, 5);
          for (const category of results) {
            if (!seen.has(category.id)) {
              seen.add(category.id);
              suggestions.push(category);
            }
          }
        } catch (tagError) {
          console.warn(`${this.LOG_PREFIX} Erreur recherche tag "${tag}":`, tagError);
        }
      }

      console.log(`${this.LOG_PREFIX} ${suggestions.length} suggestions trouvées`);
      return suggestions.slice(0, 10); // Limiter à 10 suggestions

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur suggestions catégories:`, error);
      return [];
    }
  }

  // ===== MÉTHODES DE CACHE POUR OPTIMISATION =====

  private categoryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Récupérer les catégories avec cache
   */
  async getCategoriesWithCache(filters: CategoryFilters = {}): Promise<Category[]> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.categoryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`${this.LOG_PREFIX} Catégories récupérées depuis le cache`);
      return cached.data;
    }

    const categories = await this.getCategories(filters);
    this.categoryCache.set(cacheKey, {
      data: categories,
      timestamp: Date.now()
    });

    return categories;
  }

  /**
   * Vider le cache des catégories
   */
  clearCache(): void {
    this.categoryCache.clear();
    console.log(`${this.LOG_PREFIX} Cache catégories vidé`);
  }

  // ===== MÉTHODES BATCH POUR OPTIMISATION =====

  // CORRECTIONS POUR categoryService.ts

// ===== 1. REMPLACER LA MÉTHODE getCategoriesByIds (LIGNE 268-304) =====

/**
 * Récupérer plusieurs catégories par leurs IDs - VERSION CORRIGÉE
 */
async getCategoriesByIds(ids: number[]): Promise<Record<number, Category>> {
  try {
    console.log(`${this.LOG_PREFIX} Récupération batch catégories (fallback):`, ids);
    
    // ❌ Route /categories/batch n'existe pas - utiliser récupération individuelle
    const result: Record<number, Category> = {};
    for (const id of ids) {
      try {
        const category = await this.getCategory(id);
        result[id] = category;
      } catch (individualError) {
        console.warn(`${this.LOG_PREFIX} Erreur catégorie individuelle ${id}:`, individualError);
      }
    }
    
    console.log(`${this.LOG_PREFIX} ${Object.keys(result).length} catégories récupérées`);
    return result;

  } catch (error) {
    console.error(`${this.LOG_PREFIX} Erreur batch catégories:`, error);
    return {};
  }
}


}

// ===== EXPORT SINGLETON =====
export const categoryService = new CategoryService();
export default categoryService;

// ===== FONCTIONS UTILITAIRES COMPATIBILITÉ =====

/**
 * @deprecated Utilisez categoryService.getCategories() à la place
 */
export const fetchCategories = (filters?: CategoryFilters): Promise<Category[]> => {
  return categoryService.getCategories(filters);
};

/**
 * @deprecated Utilisez categoryService.getPopularCategories() à la place
 */
export const getPopularCategories = (limit?: number): Promise<Category[]> => {
  return categoryService.getPopularCategories(limit);
};