// src/services/blogCalendarService.ts
import api from "./api";

export interface BlogCalendarPost {
  id: number;
  type: "blog" | "social"; // ✅ NOUVEAU : Type de contenu
  title: string;
  summary?: string;
  content: string;
  header_image?: string;
  slug?: string;
  platform?: "facebook" | "instagram" | "twitter" | "linkedin"; // ✅ NOUVEAU : Pour social media
  media_url?: string; // ✅ NOUVEAU : Pour social media
  status: "draft" | "scheduled" | "published";
  published_at?: string;
  scheduled_time?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  hashtags?: string[]; // ✅ NOUVEAU : Pour social media
  categories?: Array<{ id: number; name: string; slug: string }>;
  user?: {
    id: number;
    name: string;
  };
  views: number;
  likes: number;
  shares: number;
  comments?: number;
}

export interface BlogCalendarFilters {
  year?: number;
  month?: number;
  status?: string;
}

export interface BlogCalendarStats {
  totalPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  publishedPosts: number;
  byStatus: Record<string, number>;
  blogPosts?: number; // ✅ NOUVEAU : Nombre de posts blog
  socialPosts?: number; // ✅ NOUVEAU : Nombre de posts sociaux
  byPlatform?: Record<string, number>; // ✅ NOUVEAU : Stats par plateforme social
}

class BlogCalendarService {
  private readonly LOG_PREFIX = "📅 [BlogCalendarService]";

  /**
   * ✅ MODIFIÉ : Récupérer tous les contenus (blog + social media) pour le calendrier
   */
  async getCalendarPosts(
    filters: BlogCalendarFilters = {}
  ): Promise<BlogCalendarPost[]> {
    try {
      console.log(
        `${this.LOG_PREFIX} Récupération contenus calendrier (blog + social)`,
        filters
      );

      const params = new URLSearchParams();

      if (filters.year) params.append("year", filters.year.toString());
      if (filters.month) params.append("month", filters.month.toString());
      if (filters.status) params.append("status", filters.status);

      // ✅ BLOG UNIQUEMENT : Ce service est pour le calendrier blog
      params.append("type", "blog");

      // ✅ NOUVELLE ROUTE : /api/content/calendar au lieu de /blog/calendar
      const response = await api.get(`/content/calendar?${params.toString()}`);

      console.log("🔍 [DEBUG] Réponse API content calendar:", response.data);

      if (response.data.success) {
        const contents = response.data.data?.contents || [];
        const stats = response.data.data?.stats || {};

        console.log(
          `✅ ${this.LOG_PREFIX} ${contents.length} contenus récupérés`,
          stats
        );
        return contents;
      }

      return [];
    } catch (error) {
      console.error(`❌ ${this.LOG_PREFIX} Erreur:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les posts pour un mois spécifique
   */
  async getPostsForMonth(
    year: number,
    month: number
  ): Promise<BlogCalendarPost[]> {
    return this.getCalendarPosts({ year, month });
  }

  /**
   * Récupérer les posts pour une date spécifique
   */
  async getPostsForDate(date: Date): Promise<BlogCalendarPost[]> {
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // +1 car getMonth() retourne 0-11
      const day = date.getDate();

      const allPosts = await this.getPostsForMonth(year, month);

      // Filtrer par jour
      return allPosts.filter((post) => {
        const postDate = this.getPostDate(post);
        return postDate.getDate() === day;
      });
    } catch (error) {
      console.error(`❌ ${this.LOG_PREFIX} Erreur récupération jour:`, error);
      return [];
    }
  }

  /**
   * Obtenir la date d'affichage d'un post
   * Priorité: published_at (si scheduled/published) > created_at
   */
  private getPostDate(post: BlogCalendarPost): Date {
    // Pour les posts programmés ou publiés, utiliser published_at si disponible
    if (post.status === "scheduled" && post.published_at) {
      return new Date(post.published_at);
    }
    if (post.status === "published" && post.published_at) {
      return new Date(post.published_at);
    }

    // Par défaut, utiliser created_at
    return new Date(post.created_at);
  }

  /**
   * Obtenir les statistiques du calendrier blog
   */
  async getCalendarStats(
    year: number,
    month: number
  ): Promise<BlogCalendarStats> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération stats blog`, {
        year,
        month,
      });

      const posts = await this.getPostsForMonth(year, month);

      const stats: BlogCalendarStats = {
        totalPosts: posts.length,
        draftPosts: posts.filter((p) => p.status === "draft").length,
        scheduledPosts: posts.filter((p) => p.status === "scheduled").length,
        publishedPosts: posts.filter((p) => p.status === "published").length,
        byStatus: {
          draft: posts.filter((p) => p.status === "draft").length,
          scheduled: posts.filter((p) => p.status === "scheduled").length,
          published: posts.filter((p) => p.status === "published").length,
        },
      };

      console.log(`✅ ${this.LOG_PREFIX} Stats calculées:`, stats);
      return stats;
    } catch (error) {
      console.error(`❌ ${this.LOG_PREFIX} Erreur stats blog:`, error);
      return {
        totalPosts: 0,
        draftPosts: 0,
        scheduledPosts: 0,
        publishedPosts: 0,
        byStatus: { draft: 0, scheduled: 0, published: 0 },
      };
    }
  }

  /**
   * Formater une date pour l'affichage
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Extraire l'heure d'une date/time string
   */
  extractTime(dateTimeString: string | null): string | null {
    if (!dateTimeString) return null;

    try {
      const date = new Date(dateTimeString);
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return null;
    }
  }

  /**
   * Grouper les posts par date
   */
  groupPostsByDate(
    posts: BlogCalendarPost[]
  ): Record<string, BlogCalendarPost[]> {
    return posts.reduce((groups, post) => {
      const date = this.getPostDate(post).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(post);
      return groups;
    }, {} as Record<string, BlogCalendarPost[]>);
  }

  /**
   * Filtrer les posts par statut
   */
  getPostsByStatus(
    posts: BlogCalendarPost[],
    status: string
  ): BlogCalendarPost[] {
    return posts.filter((post) => post.status === status);
  }

  /**
   * Obtenir les posts pour un jour spécifique et un statut
   */
  getPostsForDay(
    posts: BlogCalendarPost[],
    day: number,
    month: number,
    year: number,
    status?: string
  ): BlogCalendarPost[] {
    return posts.filter((post) => {
      const postDate = this.getPostDate(post);
      const matchesDate =
        postDate.getDate() === day &&
        postDate.getMonth() === month &&
        postDate.getFullYear() === year;

      if (!matchesDate) return false;

      return status ? post.status === status : true;
    });
  }

  /**
   * Vérifier si c'est aujourd'hui
   */
  isToday(day: number, month: number, year: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }
}

export const blogCalendarService = new BlogCalendarService();
export default blogCalendarService;
