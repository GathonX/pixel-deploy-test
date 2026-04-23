// src/services/agentNotificationService.ts - Service pour les notifications d'agent intelligent

import {
  UniversalNotification,
  AgentSuggestionNotificationData,
  AgentInsightNotificationData,
  AgentAlertNotificationData
} from '@/types/notifications';
import notificationService from './notificationService';

class AgentNotificationService {
  private baseUrl = '/api/notifications';

  /**
   * Créer une suggestion d'agent
   */
  async createSuggestion(data: {
    title: string;
    message: string;
    suggestionType: 'optimization' | 'strategy' | 'analytics' | 'workflow' | 'business';
    currentPage: string;
    context: Record<string, any>;
    confidenceScore: number;
    expectedImpact: 'low' | 'medium' | 'high';
    actionUrl?: string;
    actionLabel?: string;
  }): Promise<UniversalNotification> {
    const suggestionData: AgentSuggestionNotificationData = {
      suggestion_id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      suggestion_type: data.suggestionType,
      current_page: data.currentPage,
      context: data.context,
      confidence_score: data.confidenceScore,
      expected_impact: data.expectedImpact,
      action_required: !!data.actionUrl,
      action_url: data.actionUrl,
      action_label: data.actionLabel || 'Voir plus',
    };

    const notification: Omit<UniversalNotification, 'id' | 'created_at'> = {
      type: 'agent_suggestion',
      priority: data.expectedImpact === 'high' ? 'high' : data.expectedImpact === 'medium' ? 'normal' : 'low',
      status: 'unread',
      title: `💡 ${data.title}`,
      message: data.message,
      data: suggestionData,
      href: data.actionUrl,
      iconColor: '#3b82f6',
      iconBgColor: '#dbeafe',
      tags: [data.suggestionType, 'agent'],
      showBadge: true,
      persistent: false,
    };

    return this.sendNotification(notification);
  }

  /**
   * Créer un insight d'agent
   */
  async createInsight(data: {
    title: string;
    message: string;
    insightType: 'performance' | 'trend' | 'opportunity' | 'risk' | 'achievement';
    domain: 'business' | 'technical' | 'analytics' | 'marketing' | 'finance';
    metrics: Record<string, number>;
    trendDirection: 'up' | 'down' | 'stable' | 'volatile';
    recommendation: string;
    canAutofix?: boolean;
    autofixAction?: string;
  }): Promise<UniversalNotification> {
    const insightData: AgentInsightNotificationData = {
      insight_id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      insight_type: data.insightType,
      domain: data.domain,
      data_source: ['user_activity', 'system_metrics'],
      metrics: data.metrics,
      trend_direction: data.trendDirection,
      recommendation: data.recommendation,
      can_autofix: data.canAutofix || false,
      autofix_action: data.autofixAction,
    };

    const getInsightEmoji = (type: string) => {
      switch (type) {
        case 'performance': return '📊';
        case 'trend': return '📈';
        case 'opportunity': return '🎯';
        case 'risk': return '⚠️';
        case 'achievement': return '🏆';
        default: return '🔍';
      }
    };

    const getInsightPriority = (type: string, trend: string) => {
      if (type === 'risk' || (type === 'performance' && trend === 'down')) return 'high';
      if (type === 'opportunity' || type === 'achievement') return 'normal';
      return 'low';
    };

    const notification: Omit<UniversalNotification, 'id' | 'created_at'> = {
      type: 'agent_insight',
      priority: getInsightPriority(data.insightType, data.trendDirection),
      status: 'unread',
      title: `${getInsightEmoji(data.insightType)} ${data.title}`,
      message: data.message,
      data: insightData,
      iconColor: '#10b981',
      iconBgColor: '#d1fae5',
      tags: [data.insightType, data.domain, 'agent'],
      showBadge: true,
      persistent: data.insightType === 'risk',
    };

    return this.sendNotification(notification);
  }

  /**
   * Créer une alerte d'agent
   */
  async createAlert(data: {
    title: string;
    message: string;
    alertType: 'quota_warning' | 'performance_drop' | 'security_concern' | 'system_issue' | 'deadline_approaching';
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedFeature?: string;
    currentValue?: number;
    thresholdValue?: number;
    resolutionSteps: string[];
    autoResolutionAvailable?: boolean;
    deadline?: string;
  }): Promise<UniversalNotification> {
    const alertData: AgentAlertNotificationData = {
      alert_id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert_type: data.alertType,
      severity: data.severity,
      affected_feature: data.affectedFeature,
      current_value: data.currentValue,
      threshold_value: data.thresholdValue,
      resolution_steps: data.resolutionSteps,
      auto_resolution_available: data.autoResolutionAvailable || false,
      escalation_required: data.severity === 'critical',
      deadline: data.deadline,
    };

    const getAlertEmoji = (type: string) => {
      switch (type) {
        case 'quota_warning': return '📊';
        case 'performance_drop': return '⚠️';
        case 'security_concern': return '🔒';
        case 'system_issue': return '⚙️';
        case 'deadline_approaching': return '⏰';
        default: return '🚨';
      }
    };

    const notification: Omit<UniversalNotification, 'id' | 'created_at'> = {
      type: 'agent_alert',
      priority: data.severity === 'critical' ? 'urgent' : data.severity === 'high' ? 'high' : 'normal',
      status: 'unread',
      title: `${getAlertEmoji(data.alertType)} ${data.title}`,
      message: data.message,
      data: alertData,
      iconColor: data.severity === 'critical' ? '#ef4444' : '#f59e0b',
      iconBgColor: data.severity === 'critical' ? '#fef2f2' : '#fef3c7',
      tags: [data.alertType, data.severity, 'agent'],
      showBadge: true,
      persistent: data.severity === 'critical' || data.severity === 'high',
    };

    return this.sendNotification(notification);
  }

  /**
   * Générer des suggestions contextuelles automatiques
   */
  async generateContextualSuggestions(page: string, context: Record<string, any>) {
    const suggestions = this.getPageSuggestions(page, context);

    for (const suggestion of suggestions) {
      // Vérifier si cette suggestion n'a pas déjà été envoyée récemment
      const shouldSend = await this.shouldSendSuggestion(suggestion.id, page);

      if (shouldSend) {
        await this.createSuggestion(suggestion);

        // Marquer comme envoyée pour éviter le spam
        this.markSuggestionSent(suggestion.id, page);
      }
    }
  }

  /**
   * Obtenir les suggestions pour une page donnée
   */
  private getPageSuggestions(page: string, context: Record<string, any>) {
    const baseSuggestions = {
      'dashboard': [
        {
          id: 'dashboard-analytics-review',
          title: 'Analyse des métriques',
          message: 'Votre trafic a augmenté de 15% cette semaine. Voulez-vous analyser les sources ?',
          suggestionType: 'analytics' as const,
          currentPage: page,
          context,
          confidenceScore: 0.85,
          expectedImpact: 'medium' as const,
          actionUrl: '/dashboard/analytics',
          actionLabel: 'Voir l\'analyse'
        },
        {
          id: 'dashboard-content-optimization',
          title: 'Optimisation du contenu',
          message: 'Je peux suggérer des améliorations pour vos contenus les plus performants.',
          suggestionType: 'optimization' as const,
          currentPage: page,
          context,
          confidenceScore: 0.75,
          expectedImpact: 'high' as const,
          actionUrl: '/dashboard/default-blog',
          actionLabel: 'Optimiser'
        }
      ],
      'default': [
        {
          id: 'general-workflow',
          title: 'Optimisation du workflow',
          message: 'Je peux vous aider à automatiser certaines tâches répétitives.',
          suggestionType: 'workflow' as const,
          currentPage: page,
          context,
          confidenceScore: 0.70,
          expectedImpact: 'medium' as const,
        }
      ]
    };

    return baseSuggestions[page as keyof typeof baseSuggestions] || baseSuggestions.default;
  }

  /**
   * Vérifier si une suggestion doit être envoyée
   */
  private async shouldSendSuggestion(suggestionId: string, page: string): Promise<boolean> {
    const lastSent = localStorage.getItem(`agent_suggestion_${suggestionId}_${page}`);
    if (!lastSent) return true;

    const lastSentTime = new Date(lastSent).getTime();
    const now = new Date().getTime();
    const hoursSinceLastSent = (now - lastSentTime) / (1000 * 60 * 60);

    // Attendre au moins 24 heures avant de renvoyer la même suggestion
    return hoursSinceLastSent >= 24;
  }

  /**
   * Marquer une suggestion comme envoyée
   */
  private markSuggestionSent(suggestionId: string, page: string) {
    localStorage.setItem(`agent_suggestion_${suggestionId}_${page}`, new Date().toISOString());
  }

  /**
   * Envoyer une notification à l'API
   */
  private async sendNotification(notification: Omit<UniversalNotification, 'id' | 'created_at'>): Promise<UniversalNotification> {
    try {
      // En production, ceci ferait un appel API
      // Pour l'instant, on simule avec le service local
      const fullNotification: UniversalNotification = {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      // Ajouter à la liste locale des notifications
      notificationService.addLocalNotification(fullNotification);

      return fullNotification;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de notification d\'agent:', error);
      throw error;
    }
  }

  /**
   * Nettoyer les anciennes suggestions
   */
  cleanupOldSuggestions() {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('agent_suggestion_'));
    const now = new Date().getTime();

    keys.forEach(key => {
      const timestamp = localStorage.getItem(key);
      if (timestamp) {
        const age = (now - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
        // Supprimer les suggestions de plus de 7 jours
        if (age > 7) {
          localStorage.removeItem(key);
        }
      }
    });
  }
}

const agentNotificationService = new AgentNotificationService();
export default agentNotificationService;