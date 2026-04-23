// src/services/analyticsService.ts - SERVICE ANALYTICS DASHBOARD UTILISATEUR

import api from './api';
import type { AxiosResponse } from 'axios';

// ✅ TYPES TYPESCRIPT STRICTS (BASÉS SUR LE SERVICE BACKEND)
export interface DashboardStats {
  blog_stats: BlogStats;
  social_stats: SocialStats;
  engagement_stats: EngagementStats;
  content_stats: ContentStats;
  time_stats: TimeStats;
  growth_stats: GrowthStats;
}

export interface BlogStats {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  avg_views_per_post: number;
  avg_reading_time: string;
}

export interface SocialStats {
  total_posts: number;
  published_posts: number;
  total_views: number;
  total_likes: number;
  total_shares: number;
  platforms: Record<string, number>;
}

export interface EngagementStats {
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  engagement_rate: number;
  total_interactions: number;
}

export interface ContentStats {
  total_content_pieces: number;
  blog_posts: number;
  social_posts: number;
  ai_generated_content: number;
  human_written_content: number;
  ai_percentage: number;
}

export interface TimeStats {
  posts_this_week: number;
  posts_this_month: number;
  views_this_week: number;
  views_this_month: number;
}

export interface GrowthStats {
  views_growth_percentage: number;
  followers_count: number;
  following_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

// ✅ SERVICE PRINCIPAL
class AnalyticsService {
  private readonly LOG_PREFIX = '📊 [AnalyticsService]';

  /**
   * Récupérer les statistiques complètes du dashboard utilisateur
   */
  async getDashboardStats(siteId?: string): Promise<DashboardStats> {
    try {
      console.log(`${this.LOG_PREFIX} Récupération statistiques dashboard...`);

      const params = siteId ? `?site_id=${siteId}` : '';
      const response: AxiosResponse<ApiResponse<DashboardStats>> = await api.get(`/dashboard-user/stats${params}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques');
      }

      console.log(`${this.LOG_PREFIX} Statistiques récupérées:`, {
        blog_posts: response.data.data.blog_stats.total_posts,
        social_posts: response.data.data.social_stats.total_posts,
        total_views: response.data.data.engagement_stats.total_views,
        engagement_rate: response.data.data.engagement_stats.engagement_rate
      });

      return response.data.data;

    } catch (error) {
      console.error(`${this.LOG_PREFIX} Erreur récupération statistiques:`, error);
      throw error;
    }
  }

  /**
   * Formater les statistiques pour l'affichage dans DashboardStats
   */
  formatStatsForDashboard(stats: DashboardStats): Array<{
    title: string;
    value: string;
    change: string;
    icon: string;
    iconBgColor: string;
    iconColor: string;
    subtitle?: string;
  }> {
    const { blog_stats, engagement_stats, time_stats, growth_stats } = stats;

    return [
      {
        title: "Vues des Articles",
        value: this.formatNumber(blog_stats.total_views),
        change: this.formatGrowthPercentage(growth_stats.views_growth_percentage),
        icon: "Eye",
        iconBgColor: "bg-blue-50",
        iconColor: "text-blue-600"
      },
      {
        title: "Taux d'Engagement",
        value: `${engagement_stats.engagement_rate}%`,
        change: "Basé sur interactions",
        icon: "TrendingUp",
        iconBgColor: "bg-green-50",
        iconColor: "text-green-600"
      },
      {
        title: "Articles Publiés",
        value: blog_stats.published_posts.toString(),
        change: `${time_stats.posts_this_month} ce mois-ci`,
        icon: "Calendar",
        iconBgColor: "bg-purple-50",
        iconColor: "text-purple-600",
        subtitle: "Blog & Réseaux sociaux"
      },
      {
        title: "Temps Moyen de Lecture",
        value: blog_stats.avg_reading_time,
        change: "Basé sur contenu publié",
        icon: "Clock",
        iconBgColor: "bg-amber-50",
        iconColor: "text-amber-600"
      },
      {
        title: "Commentaires",
        value: this.formatNumber(engagement_stats.total_comments),
        change: "Toutes plateformes",
        icon: "MessageSquare",
        iconBgColor: "bg-indigo-50",
        iconColor: "text-indigo-600"
      },
      {
        title: "Vues Cette Semaine",
        value: this.formatNumber(time_stats.views_this_week),
        change: `${time_stats.posts_this_week} posts cette semaine`,
        icon: "Users",
        iconBgColor: "bg-rose-50",
        iconColor: "text-rose-600"
      },
      {
        title: "Total Interactions",
        value: this.formatNumber(engagement_stats.total_interactions),
        change: "Likes + Commentaires + Partages",
        icon: "CreditCard",
        iconBgColor: "bg-emerald-50",
        iconColor: "text-emerald-600"
      },
      {
        title: "Contenu IA",
        value: `${stats.content_stats.ai_percentage}%`,
        change: `${stats.content_stats.ai_generated_content} posts générés`,
        icon: "BarChart",
        iconBgColor: "bg-cyan-50",
        iconColor: "text-cyan-600",
        subtitle: "vs Humain"
      }
    ];
  }

  /**
   * Formater les nombres avec séparateurs
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  }

  /**
   * Formater le pourcentage de croissance
   */
  private formatGrowthPercentage(percentage: number): string {
    if (percentage === 0) {
      return "Stable";
    }
    const sign = percentage > 0 ? '+' : '';
    return `${sign}${percentage}% cette semaine`;
  }

  /**
   * Vérifier si les données sont valides
   */
  validateStats(stats: DashboardStats): boolean {
    return !!(
      stats.blog_stats &&
      stats.social_stats &&
      stats.engagement_stats &&
      stats.content_stats &&
      stats.time_stats &&
      stats.growth_stats
    );
  }

  /**
   * Obtenir un résumé rapide des performances
   */
  getPerformanceSummary(stats: DashboardStats): {
    totalContent: number;
    totalViews: number;
    avgEngagement: number;
    topMetric: {
      name: string;
      value: string;
      trend: 'up' | 'down' | 'stable';
    };
  } {
    return {
      totalContent: stats.content_stats.total_content_pieces,
      totalViews: stats.engagement_stats.total_views,
      avgEngagement: stats.engagement_stats.engagement_rate,
      topMetric: {
        name: "Croissance des vues",
        value: `${stats.growth_stats.views_growth_percentage}%`,
        trend: stats.growth_stats.views_growth_percentage > 0 ? 'up' : 
               stats.growth_stats.views_growth_percentage < 0 ? 'down' : 'stable'
      }
    };
  }
}

// ✅ EXPORT DE L'INSTANCE
export const analyticsService = new AnalyticsService();
export default analyticsService;