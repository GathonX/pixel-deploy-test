// src/types/notifications.ts - TYPES CORRIGÉS AVEC SYSTÈME D'EXPIRATION

import React from "react";

// ===== TYPES DE NOTIFICATIONS SUPPORTÉS =====
export type NotificationType =
  | "order"
  | "ticket"
  | "payment"
  | "payment_request"
  | "feature_approved"
  | "feature_rejected"
  | "purchase_approved"
  | "purchase_rejected"
  | "feature_expiring" // ✅ NOUVEAU : Fonctionnalité expire bientôt
  | "feature_expired" // ✅ NOUVEAU : Fonctionnalité expirée
  | "agent_suggestion" // 🤖 NOUVEAU : Suggestion de l'agent intelligent
  | "agent_insight" // 🤖 NOUVEAU : Insight proactif de l'agent
  | "agent_alert" // 🤖 NOUVEAU : Alerte critique de l'agent
  | "user"
  | "system"
  | "marketing"
  | "security"
  | "funnel"
  | "email"
  | "project"
  | "admin"
  | "custom";

// ===== PRIORITÉS DE NOTIFICATIONS =====
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// ===== STATUTS DE NOTIFICATIONS =====
export type NotificationStatus = "unread" | "read" | "archived" | "deleted";

// ===== ACTIONS POSSIBLES =====
export interface NotificationAction {
  id: string;
  label: string;
  icon?: React.ElementType;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  onClick: () => void | Promise<void>;
}

// ===== INTERFACE UNIVERSELLE =====
export interface UniversalNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;

  // Contenu principal
  title: string;
  message: string;
  excerpt?: string;

  // Métadonnées visuelles
  icon?: React.ElementType;
  iconColor?: string;
  iconBgColor?: string;
  avatar?: string;

  // Données contextuelles
  data: Record<string, any>;

  // Navigation et actions
  href?: string;
  actions?: NotificationAction[];

  // Timestamps
  created_at: string;
  read_at?: string;
  expires_at?: string;

  // Groupement et catégories
  category?: string;
  tags?: string[];

  // Affichage
  showBadge?: boolean;
  showAvatar?: boolean;
  persistent?: boolean;
}

// ===== DONNÉES SPÉCIFIQUES PAR TYPE =====

// ✅ Notifications de commandes
export interface OrderNotificationData {
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  status: string;
  funnel_id?: number;
  payment_method?: string;
  [key: string]: any;
}

// ✅ Notifications de tickets
export interface TicketNotificationData {
  ticket_id: number;
  message_id: number;
  sender: "user" | "admin";
  sender_name: string;
  excerpt: string;
  [key: string]: any;
}

// ✅ Notifications de paiements
export interface PaymentNotificationData {
  payment_id: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "pending" | "refunded";
  method: string;
  customer_email: string;
  proof_urls?: string[];
  [key: string]: any;
}

// ✅ Notifications de demande de paiement
export interface PaymentRequestNotificationData {
  user_name: string;
  feature_name: string;
  amount: number;
  ticket_id: number;
  activation_request_id: number;
  proof_urls?: string[];
  [key: string]: any;
}

// ✅ Notifications d'approbation de fonctionnalité
export interface FeatureApprovedNotificationData {
  feature_name: string;
  amount: number;
  [key: string]: any;
}

// ✅ Notifications de rejet de fonctionnalité
export interface FeatureRejectedNotificationData {
  feature_name: string;
  reason: string;
  feature_id: number;
  [key: string]: any;
}

// ✅ NOUVEAU : Notifications d'expiration de fonctionnalité
export interface FeatureExpiringNotificationData {
  feature_id: number;
  feature_key: string;
  feature_name: string;
  expires_at: string;
  days_remaining: number;
  can_renew: boolean;
  reminder_type: "7_days_before" | "3_days_before" | "1_days_before";
  [key: string]: any;
}

// ✅ NOUVEAU : Notifications de fonctionnalité expirée
export interface FeatureExpiredNotificationData {
  feature_id: number;
  feature_key: string;
  feature_name: string;
  expired_at: string;
  can_renew: boolean;
  notification_type: "expired";
  [key: string]: any;
}

// 🤖 NOUVEAU : Notifications de l'agent intelligent - Suggestions
export interface AgentSuggestionNotificationData {
  suggestion_id: string;
  suggestion_type: 'optimization' | 'strategy' | 'analytics' | 'workflow' | 'business';
  current_page: string;
  context: Record<string, any>;
  confidence_score: number;
  expected_impact: 'low' | 'medium' | 'high';
  action_required: boolean;
  action_url?: string;
  action_label?: string;
  insights_data?: Record<string, any>;
  [key: string]: any;
}

// 🤖 NOUVEAU : Notifications de l'agent intelligent - Insights
export interface AgentInsightNotificationData {
  insight_id: string;
  insight_type: 'performance' | 'trend' | 'opportunity' | 'risk' | 'achievement';
  domain: 'business' | 'technical' | 'analytics' | 'marketing' | 'finance';
  data_source: string[];
  metrics: Record<string, number>;
  trend_direction: 'up' | 'down' | 'stable' | 'volatile';
  recommendation: string;
  can_autofix: boolean;
  autofix_action?: string;
  [key: string]: any;
}

// 🤖 NOUVEAU : Notifications de l'agent intelligent - Alertes
export interface AgentAlertNotificationData {
  alert_id: string;
  alert_type: 'quota_warning' | 'performance_drop' | 'security_concern' | 'system_issue' | 'deadline_approaching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_feature?: string;
  current_value?: number;
  threshold_value?: number;
  resolution_steps: string[];
  auto_resolution_available: boolean;
  escalation_required: boolean;
  deadline?: string;
  [key: string]: any;
}

// Notifications utilisateur
export interface UserNotificationData {
  user_id: number;
  user_name: string;
  user_email: string;
  action: string;
  ip_address?: string;
  [key: string]: any;
}

// Notifications système
export interface SystemNotificationData {
  level: "info" | "warning" | "error" | "success";
  component?: string;
  error_code?: string;
  details?: string;
  [key: string]: any;
}

// Notifications marketing
export interface MarketingNotificationData {
  campaign_id: string;
  campaign_name: string;
  type: "email" | "sms" | "push";
  recipients_count: number;
  open_rate?: number;
  click_rate?: number;
  [key: string]: any;
}

// ===== FILTRES ET RECHERCHE =====
export interface NotificationFilters {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  statuses?: NotificationStatus[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

// ===== STATISTIQUES =====
export interface NotificationStats {
  total: number;
  unread: number;
  byType: Partial<Record<NotificationType, number>>;
  byPriority: Partial<Record<NotificationPriority, number>>;
  last24Hours: number;
  last7Days: number;
}

// ===== RÉPONSES API =====
export interface NotificationApiResponse {
  success: boolean;
  message: string;
  data: UniversalNotification[];
  meta?: {
    total: number;
    unread: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}

export interface NotificationStatsResponse {
  success: boolean;
  message?: string;
  data: NotificationStats;
}

// ===== UTILITAIRES DE CRÉATION =====
export interface CreateNotificationRequest {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  data: Record<string, any>;
  href?: string;
  expires_at?: string;
  category?: string;
  tags?: string[];
}

// ===== CONFIGURATION D'AFFICHAGE =====
export interface NotificationDisplayConfig {
  maxItems: number;
  groupByType: boolean;
  showTimestamp: boolean;
  showActions: boolean;
  autoMarkAsRead: boolean;
  autoDeleteAfterDays?: number;
  enableSound: boolean;
  enableDesktopNotifications: boolean;
}

// ===== ÉVÉNEMENTS ET CALLBACKS =====
export interface NotificationEvents {
  onNotificationReceived?: (notification: UniversalNotification) => void;
  onNotificationRead?: (notification: UniversalNotification) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  onNotificationClicked?: (notification: UniversalNotification) => void;
}

// ===== CONFIGURATION GLOBALE =====
export interface NotificationSystemConfig {
  display: NotificationDisplayConfig;
  events: NotificationEvents;
  apiEndpoint: string;
  websocketUrl?: string;
  enableRealtime: boolean;
  enablePersistence: boolean;
}

// ===== UTILITAIRES D'EXPIRATION =====
export interface ExpirationUtilities {
  /**
   * Formatage des jours restants
   */
  formatDaysRemaining: (days: number) => string;

  /**
   * Obtenir la couleur selon les jours restants
   */
  getExpirationColor: (days: number) => {
    border: string;
    background: string;
    text: string;
  };

  /**
   * Obtenir la priorité selon les jours restants
   */
  getExpirationPriority: (days: number) => NotificationPriority;

  /**
   * Vérifier si une notification d'expiration doit être envoyée
   */
  shouldSendExpirationNotification: (daysRemaining: number) => boolean;
}
