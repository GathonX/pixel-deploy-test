// src/services/userService.ts - SERVICE GESTION DES UTILISATEURS
import api from './api';
import type { AxiosResponse } from 'axios';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  website?: string;        // ✅ AJOUTÉ ICI - ligne après 'address'
  language?: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  // Statistiques additionnelles
  articles_count?: number;
  followers_count?: number;
  following_count?: number;
  total_likes?: number;
  total_views?: number;
  total_comments?: number;
}

export interface UserStats {
  articles: {
    total: number;
    published: number;
    drafts: number;
    scheduled: number;
  };
  engagement: {
    total_likes: number;
    total_views: number;
    total_comments: number;
    avg_likes_per_article: number;
  };
  social: {
    followers_count: number;
    following_count: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

class UserService {
  private readonly LOG_PREFIX = '👤 [UserService]';

  /**
   * Récupérer un utilisateur par ID (AUTHENTIFIÉ)
   */
  async getUser(id: number): Promise<User> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération utilisateur ID:`, id);

      const response: AxiosResponse<ApiResponse<User>> = await api.get(`/users/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Utilisateur non trouvé');
      }

      console.log(`${this.LOG_PREFIX} Utilisateur récupéré:`, response.data.data.name);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération utilisateur:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Récupérer un utilisateur public par ID (SANS AUTHENTIFICATION)
   */
  async getPublicUser(id: number): Promise<User> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération utilisateur public ID:`, id);

      const response: AxiosResponse<ApiResponse<User>> = await api.get(`/public/users/${id}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Utilisateur non trouvé');
      }

      console.log(`${this.LOG_PREFIX} Utilisateur public récupéré:`, response.data.data.name);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération utilisateur public:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques d'un utilisateur
   */
  async getUserStats(id: number): Promise<UserStats> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération stats utilisateur ID:`, id);

      const response: AxiosResponse<ApiResponse<UserStats>> = await api.get(`/users/${id}/stats`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Stats utilisateur récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur stats utilisateur:`, error);
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Récupérer les statistiques publiques d'un utilisateur
   */
  async getPublicUserStats(id: number): Promise<UserStats> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération stats publiques utilisateur ID:`, id);

      const response: AxiosResponse<ApiResponse<UserStats>> = await api.get(`/public/users/${id}/stats`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Stats publiques utilisateur récupérées`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur stats publiques utilisateur:`, error);
      throw error;
    }
  }

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query: string, limit = 20): Promise<User[]> {
    try {
      console.log(`${this.LOG_PREFIX} Recherche utilisateurs:`, query);

      const response: AxiosResponse<ApiResponse<User[]>> = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=${limit}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la recherche');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} utilisateurs trouvés`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur recherche utilisateurs:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les auteurs populaires
   */
  async getPopularAuthors(limit = 10): Promise<User[]> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération auteurs populaires...`);

      const response: AxiosResponse<ApiResponse<User[]>> = await api.get(`/users/popular-authors?limit=${limit}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des auteurs');
      }

      console.log(`${this.LOG_PREFIX} ${response.data.data.length} auteurs populaires récupérés`);
      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur auteurs populaires:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      console.log(`${this.LOG_PREFIX} Mise à jour du profil...`);

      const response: AxiosResponse<{ message: string; user: User }> = await api.put('/profile', userData);

      console.log(`${this.LOG_PREFIX} Profil mis à jour avec succès`);
      return response.data.user;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur mise à jour profil:`, error);
      throw error;
    }
  }
}

export const userService = new UserService();
export default userService;