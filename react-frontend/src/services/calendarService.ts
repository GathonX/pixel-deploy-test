// src/services/calendarService.ts
import api from './api';
import { SocialMediaPost } from './socialMediaService';

export interface CalendarPost {
  id: number;
  platform: string;
  content: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'draft' | 'scheduled' | 'published';
  images?: string[];
  tags?: string[];
  created_at: string;
}

export interface CalendarFilters {
  year?: number;
  month?: number;
  platform?: string;
  status?: string;
}

class CalendarService {
  
  /**
   * Récupérer tous les posts pour le calendrier
   */
  async getCalendarPosts(filters: CalendarFilters = {}): Promise<CalendarPost[]> {
  try {
    console.log("📅 [CalendarService] Récupération posts calendrier", filters);
    
    const params = new URLSearchParams();
    
    // ✅ DEBUG : Tester sans filtres d'abord
    // if (filters.year) params.append('year', filters.year.toString());
    // if (filters.month) params.append('month', filters.month.toString());
    if (filters.platform) params.append('platform', filters.platform);
    if (filters.status) params.append('status', filters.status);
    
    // Par défaut, récupérer plus de posts pour le calendrier
    params.append('per_page', '200');
    
    const response = await api.get(`/social?${params.toString()}`);
    
    console.log("🔍 [DEBUG] Réponse API brute:", response.data);
    
    if (response.data.success) {
      let posts = [];
      
      // ✅ DEBUG : Vérifier la structure de réponse
      if (response.data.data && response.data.data.data) {
        // Structure paginée Laravel
        posts = response.data.data.data;
        console.log("🔍 [DEBUG] Structure paginée détectée");
      } else if (Array.isArray(response.data.data)) {
        // Structure tableau direct
        posts = response.data.data;
        console.log("🔍 [DEBUG] Structure tableau direct détectée");
      } else {
        console.log("🔍 [DEBUG] Structure inconnue:", typeof response.data.data);
      }
      
      console.log("🔍 [DEBUG] Posts bruts récupérés:", posts.length, posts);
      
      // Transformer les posts pour le calendrier
      const calendarPosts: CalendarPost[] = posts.map((post: SocialMediaPost) => {
        // ✅ CORRECTION : Priorité published_at pour les posts programmés, puis created_at
        let dateToUse = post.created_at; // Par défaut
        
        if (post.status === 'scheduled' && post.published_at) {
          // Pour les posts programmés, utiliser published_at
          dateToUse = post.published_at;
        } else if (post.status === 'published' && post.published_at) {
          // Pour les posts publiés, utiliser published_at
          dateToUse = post.published_at;
        }
        
        console.log("🔍 [DEBUG] Post transformé:", {
          id: post.id,
          status: post.status,
          created_at: post.created_at,
          published_at: post.published_at,
          dateToUse
        });
        
        return {
          id: post.id,
          platform: post.platform,
          content: post.content,
          scheduled_date: dateToUse,
          scheduled_time: this.extractTime(dateToUse),
          status: post.status,
          images: post.images,
          tags: post.tags,
          created_at: post.created_at
        };
      });
      
      console.log("✅ [CalendarService] Posts transformés:", calendarPosts.length);
      return calendarPosts;
    }
    
    return [];
  } catch (error) {
    console.error("❌ [CalendarService] Erreur:", error);
    throw error;
  }
}

  /**
   * Récupérer les posts pour un mois spécifique
   */
  async getPostsForMonth(year: number, month: number): Promise<CalendarPost[]> {
    return this.getCalendarPosts({ year, month });
  }

  /**
   * Récupérer les posts pour une date spécifique
   */
  async getPostsForDate(date: Date): Promise<CalendarPost[]> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // +1 car getMonth() retourne 0-11
      const day = date.getDate();
      
      const allPosts = await this.getPostsForMonth(year, month);
      
      // Filtrer par jour
      return allPosts.filter(post => {
        const postDate = new Date(post.scheduled_date);
        return postDate.getDate() === day;
      });
    } catch (error) {
      console.error("❌ [CalendarService] Erreur récupération jour:", error);
      return [];
    }
  }

  /**
   * Récupérer les posts par plateforme pour une période
   */
  async getPostsByPlatform(platform: string, year: number, month: number): Promise<CalendarPost[]> {
    return this.getCalendarPosts({ year, month, platform });
  }

  /**
   * Programmer un post à une date spécifique
   */
  async schedulePost(postId: number, scheduledDate: string, scheduledTime?: string): Promise<boolean> {
    try {
      console.log("📅 [CalendarService] Programmation post:", { postId, scheduledDate, scheduledTime });
      
      const payload: any = {
        status: 'scheduled',
        scheduled_at: scheduledDate
      };
      
      if (scheduledTime) {
        payload.scheduled_time = scheduledTime;
      }
      
      const response = await api.post(`/social/${postId}/status`, payload);
      
      if (response.data.success) {
        console.log("✅ [CalendarService] Post programmé avec succès");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("❌ [CalendarService] Erreur programmation:", error);
      throw error;
    }
  }

  /**
 * Déplacer un post dans le calendrier
 */
async movePost(postId: number, newDate: Date, newTime?: string): Promise<boolean> {
  try {
    console.log("📅 [CalendarService] Déplacement post:", { postId, newDate: newDate.toISOString(), newTime });
    
    // ✅ CORRECTION : Envoyer la date/heure complète
    const scheduledDateTime = newDate.toISOString().slice(0, 19).replace('T', ' '); // Format: "2025-07-15 12:33:00"
    
    const payload = {
      status: 'scheduled',
      scheduled_at: scheduledDateTime
    };
    
    console.log("📅 [CalendarService] Payload envoyé:", payload);
    
    const response = await api.post(`/social/${postId}/status`, payload);
    
    if (response.data.success) {
      console.log("✅ [CalendarService] Post déplacé avec succès");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("❌ [CalendarService] Erreur déplacement:", error);
    throw error;
  }
}

  /**
   * Extraire l'heure d'une date/time string
   */
  private extractTime(dateTimeString: string | null): string | null {
    if (!dateTimeString) return null;
    
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return null;
    }
  }

  /**
   * Formater une date pour l'affichage
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Grouper les posts par date
   */
  groupPostsByDate(posts: CalendarPost[]): Record<string, CalendarPost[]> {
    return posts.reduce((groups, post) => {
      const date = new Date(post.scheduled_date).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(post);
      return groups;
    }, {} as Record<string, CalendarPost[]>);
  }

  /**
   * Obtenir les statistiques du calendrier
   */
  async getCalendarStats(year: number, month: number): Promise<{
    totalPosts: number;
    scheduledPosts: number;
    publishedPosts: number;
    byPlatform: Record<string, number>;
  }> {
    try {
      const posts = await this.getPostsForMonth(year, month);
      
      const stats = {
        totalPosts: posts.length,
        scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        byPlatform: {} as Record<string, number>
      };

      // Compter par plateforme
      posts.forEach(post => {
        stats.byPlatform[post.platform] = (stats.byPlatform[post.platform] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("❌ [CalendarService] Erreur stats:", error);
      return {
        totalPosts: 0,
        scheduledPosts: 0,
        publishedPosts: 0,
        byPlatform: {}
      };
    }
  }
}

export const calendarService = new CalendarService();
export default calendarService;