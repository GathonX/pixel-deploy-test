import api from './api';

export interface ReportData {
  reportable_type: 'blog_post' | 'comment' | 'social_media_post';
  reportable_id: number;
  reason?: string;
  description?: string;
}

export interface BlockUserData {
  blocked_user_id: number;
  reason?: string;
}

export interface HideContentData {
  hideable_type: 'blog_post' | 'comment' | 'social_media_post';
  hideable_id: number;
}

export interface PreferenceData {
  preferable_type: 'blog_post' | 'social_media_post';
  preferable_id: number;
  preference: 'interested' | 'not_interested';
}

class ModerationService {
  /**
   * Signaler un contenu (post, commentaire, etc.)
   */
  async reportContent(data: ReportData) {
    try {
      const response = await api.post('/reports', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du signalement:', error);
      throw error;
    }
  }

  /**
   * Bloquer un utilisateur
   */
  async blockUser(data: BlockUserData) {
    try {
      const response = await api.post('/users/block', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du blocage:', error);
      throw error;
    }
  }

  /**
   * Débloquer un utilisateur
   */
  async unblockUser(blockedUserId: number) {
    try {
      const response = await api.post('/users/unblock', {
        blocked_user_id: blockedUserId
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors du déblocage:', error);
      throw error;
    }
  }

  /**
   * Récupérer la liste des utilisateurs bloqués
   */
  async getBlockedUsers() {
    try {
      const response = await api.get('/users/blocked');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs bloqués:', error);
      throw error;
    }
  }

  /**
   * Masquer un contenu
   */
  async hideContent(data: HideContentData) {
    try {
      const response = await api.post('/content/hide', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du masquage:', error);
      throw error;
    }
  }

  /**
   * Afficher un contenu précédemment masqué
   */
  async unhideContent(data: HideContentData) {
    try {
      const response = await api.post('/content/unhide', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'affichage:', error);
      throw error;
    }
  }

  /**
   * Récupérer les contenus masqués
   */
  async getHiddenContents(type?: 'blog_post' | 'comment' | 'social_media_post') {
    try {
      const params = type ? { type } : {};
      const response = await api.get('/content/hidden', { params });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des contenus masqués:', error);
      throw error;
    }
  }

  /**
   * Définir une préférence pour un contenu (Ça m'intéresse / Ça ne m'intéresse pas)
   */
  async setContentPreference(data: PreferenceData) {
    try {
      const response = await api.post('/content/preference', data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la définition de la préférence:', error);
      throw error;
    }
  }

  /**
   * Supprimer une préférence
   */
  async removeContentPreference(preferableType: string, preferableId: number) {
    try {
      const response = await api.delete('/content/preference', {
        data: {
          preferable_type: preferableType,
          preferable_id: preferableId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de la préférence:', error);
      throw error;
    }
  }

  /**
   * Récupérer les préférences de l'utilisateur
   */
  async getUserPreferences() {
    try {
      const response = await api.get('/content/preferences');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des préférences:', error);
      throw error;
    }
  }

  /**
   * Supprimer un post (seulement si c'est le propriétaire)
   */
  async deletePost(postType: 'blog_post' | 'social_media_post', postId: number) {
    try {
      const endpoint = postType === 'blog_post' ? '/blog' : '/social-media';
      const response = await api.delete(`${endpoint}/${postId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression du post:', error);
      throw error;
    }
  }

  /**
   * Supprimer un commentaire (seulement si c'est le propriétaire)
   */
  async deleteComment(commentId: number) {
    try {
      const response = await api.delete(`/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression du commentaire:', error);
      throw error;
    }
  }

  /**
   * Modifier un commentaire
   */
  async updateComment(commentId: number, content: string) {
    try {
      const response = await api.put(`/comments/${commentId}`, { content });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la modification du commentaire:', error);
      throw error;
    }
  }

  /**
   * Générer le code d'intégration pour un post
   */
  async getEmbedCode(postType: 'blog_post' | 'social_media_post', postId: number) {
    try {
      const response = await api.get(`/embed/${postType}/${postId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la génération du code d\'intégration:', error);
      throw error;
    }
  }
}

export const moderationService = new ModerationService();
