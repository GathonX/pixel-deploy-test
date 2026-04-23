// src/services/notificationService.ts - MISE À JOUR POUR INTERACTIONS SOCIALES

import api from "./api";
import {
  UniversalNotification,
  NotificationFilters,
  NotificationStats,
  NotificationApiResponse,
  NotificationStatsResponse,
  CreateNotificationRequest,
  NotificationType,
  NotificationPriority,
} from "@/types/notifications";
import {
  ShoppingCart,
  Ticket,
  CreditCard,
  User,
  AlertTriangle,
  Mail,
  Bell,
  Settings,
  Zap,
  CheckCircle,
  XCircle,
  DollarSign,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";

// ===== CONFIGURATION MISE À JOUR AVEC INTERACTIONS SOCIALES =====
const NOTIFICATION_CONFIG = {
  // ✅ EXISTANTS PRÉSERVÉS
  order: {
    icon: ShoppingCart,
    iconColor: "#10b981",
    iconBgColor: "#ecfdf5",
    defaultPriority: "high" as NotificationPriority,
  },
  ticket: {
    icon: Ticket,
    iconColor: "#3b82f6",
    iconBgColor: "#eff6ff",
    defaultPriority: "normal" as NotificationPriority,
  },
  payment: {
    icon: CreditCard,
    iconColor: "#8b5cf6",
    iconBgColor: "#f3e8ff",
    defaultPriority: "high" as NotificationPriority,
  },

  // 🔔 INTERACTIONS SOCIALES - TYPE "USER" AVEC SOUS-CATÉGORIES
  user: {
    icon: User,
    iconColor: "#06b6d4",
    iconBgColor: "#f0f9ff",
    defaultPriority: "normal" as NotificationPriority,
  },

  system: {
    icon: Settings,
    iconColor: "#64748b",
    iconBgColor: "#f8fafc",
    defaultPriority: "normal" as NotificationPriority,
  },
  marketing: {
    icon: Mail,
    iconColor: "#f59e0b",
    iconBgColor: "#fefbeb",
    defaultPriority: "low" as NotificationPriority,
  },
  payment_request: {
    icon: DollarSign,
    iconColor: "#f59e0b",
    iconBgColor: "#fefbeb",
    defaultPriority: "high" as NotificationPriority,
  },
  feature_approved: {
    icon: CheckCircle,
    iconColor: "#10b981",
    iconBgColor: "#ecfdf5",
    defaultPriority: "high" as NotificationPriority,
  },
  feature_rejected: {
    icon: XCircle,
    iconColor: "#ef4444",
    iconBgColor: "#fef2f2",
    defaultPriority: "high" as NotificationPriority,
  },
  purchase_approved: {
    icon: CheckCircle,
    iconColor: "#10b981",
    iconBgColor: "#ecfdf5",
    defaultPriority: "high" as NotificationPriority,
  },
  purchase_rejected: {
    icon: XCircle,
    iconColor: "#ef4444",
    iconBgColor: "#fef2f2",
    defaultPriority: "high" as NotificationPriority,
  },
  security: {
    icon: AlertTriangle,
    iconColor: "#ef4444",
    iconBgColor: "#fef2f2",
    defaultPriority: "urgent" as NotificationPriority,
  },
  funnel: {
    icon: Zap,
    iconColor: "#8b5cf6",
    iconBgColor: "#f3e8ff",
    defaultPriority: "normal" as NotificationPriority,
  },
  email: {
    icon: Mail,
    iconColor: "#06b6d4",
    iconBgColor: "#f0f9ff",
    defaultPriority: "low" as NotificationPriority,
  },
  project: {
    icon: Bell,
    iconColor: "#f59e0b",
    iconBgColor: "#fefbeb",
    defaultPriority: "normal" as NotificationPriority,
  },
  admin: {
    icon: Bell,
    iconColor: "#7c3aed",
    iconBgColor: "#f5f3ff",
    defaultPriority: "high" as NotificationPriority,
  },
  custom: {
    icon: Bell,
    iconColor: "#6b7280",
    iconBgColor: "#f9fafb",
    defaultPriority: "normal" as NotificationPriority,
  },
};

// 🔔 NOUVELLE CONFIGURATION : Icônes spécifiques par tag d'interaction
const INTERACTION_ICONS: Record<string, React.ElementType> = {
  // Réactions
  like: Heart,
  love: Heart,
  laugh: MessageCircle,
  angry: MessageCircle,
  sad: MessageCircle,
  reaction: Heart,

  // Actions sociales
  comment: MessageCircle,
  reply: MessageCircle,
  share: Share2,
  follow: UserPlus,
  unfollow: Users,

  // Types de contenu
  article: Bell,
  blog_post: Bell,
  social_post: MessageCircle,
  post: MessageCircle,
};

// 🔔 NOUVELLE FONCTION : Obtenir l'icône pour une notification d'interaction
function getInteractionIcon(
  notification: Pick<UniversalNotification, "type" | "tags" | "category">
): React.ElementType {
  // Si c'est une notification "user" (interactions sociales)
  if (
    notification.type === "user" &&
    notification.tags &&
    notification.tags.length > 0
  ) {
    // Chercher d'abord dans les tags
    for (const tag of notification.tags) {
      if (INTERACTION_ICONS[tag]) {
        return INTERACTION_ICONS[tag];
      }
    }

    // Fallback: vérifier la catégorie
    if (notification.category === "interaction") {
      return MessageCircle; // Icône par défaut pour interactions
    }
  }

  // Retourner l'icône par défaut du type
  return NOTIFICATION_CONFIG[notification.type]?.icon || Bell;
}

// 🔔 NOUVELLE FONCTION : Obtenir les couleurs pour une notification d'interaction
function getInteractionColors(
  notification: Pick<UniversalNotification, "type" | "tags" | "category">
): { iconColor: string; iconBgColor: string } {
  if (
    notification.type === "user" &&
    notification.tags &&
    notification.tags.length > 0
  ) {
    // Couleurs spécifiques par type d'interaction
    if (
      notification.tags.includes("like") ||
      notification.tags.includes("love")
    ) {
      return { iconColor: "#ef4444", iconBgColor: "#fef2f2" }; // Rouge pour likes
    }
    if (
      notification.tags.includes("comment") ||
      notification.tags.includes("reply")
    ) {
      return { iconColor: "#3b82f6", iconBgColor: "#eff6ff" }; // Bleu pour commentaires
    }
    if (notification.tags.includes("follow")) {
      return { iconColor: "#10b981", iconBgColor: "#ecfdf5" }; // Vert pour follows
    }
    if (notification.tags.includes("share")) {
      return { iconColor: "#8b5cf6", iconBgColor: "#f3e8ff" }; // Violet pour partages
    }
  }

  // Couleurs par défaut du type
  const config = NOTIFICATION_CONFIG[notification.type];
  return {
    iconColor: config?.iconColor || "#6b7280",
    iconBgColor: config?.iconBgColor || "#f9fafb",
  };
}

// ===== SERVICE PRINCIPAL MISE À JOUR =====
class NotificationService {
  /**
   * ✅ MÉTHODE MISE À JOUR : Récupérer toutes les notifications
   */
  async getNotifications(
    filters?: NotificationFilters
  ): Promise<NotificationApiResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.types?.length) {
          params.append("types", filters.types.join(","));
        }
        if (filters.priorities?.length) {
          params.append("priorities", filters.priorities.join(","));
        }
        if (filters.statuses?.length) {
          params.append("statuses", filters.statuses.join(","));
        }
        if (filters.dateFrom) {
          params.append("date_from", filters.dateFrom);
        }
        if (filters.dateTo) {
          params.append("date_to", filters.dateTo);
        }
        if (filters.searchQuery) {
          params.append("search", filters.searchQuery);
        }
      }

      const queryString = params.toString();
      const url = queryString
        ? `/notifications?${queryString}`
        : "/notifications";

      console.log('🔄 [NotificationService] Requête notifications:', url);
      const response = await api.get(url);
      console.log('✅ [NotificationService] Notifications reçues:', response.data);

      // ✅ NOUVEAU : Adapter les données backend vers frontend avec interactions
      return {
        success: true,
        message: "Notifications récupérées",
        data: this.adaptBackendNotifications(
          response.data.data || response.data || []
        ),
        meta: response.data.meta,
      };
    } catch (error: any) {
      console.error("❌ [NotificationService] Erreur récupération notifications:", {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.config?.url,
        code: error?.code
      });
      
      // Si c'est une erreur d'authentification, retourner une liste vide
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log('🔐 [NotificationService] Non authentifié, retour liste vide');
        return {
          success: false,
          message: "Non authentifié",
          data: [],
          meta: { total: 0, unread: 0, current_page: 1, last_page: 1, per_page: 10 }
        };
      }
      
      // Fallback vers notifications locales pour les autres erreurs
      const localNotifications = this.getLocalNotifications();
      console.log('📱 [NotificationService] Utilisation notifications locales:', localNotifications.length);
      return {
        success: false,
        message: "Erreur de connexion - utilisation des données locales",
        data: localNotifications,
        meta: {
          total: localNotifications.length,
          unread: localNotifications.filter(n => n.status === 'unread').length,
          current_page: 1,
          last_page: 1,
          per_page: localNotifications.length
        }
      };
    }
  }

  /**
   * 🔔 MÉTHODE MISE À JOUR : Adapter les notifications backend avec support interactions
   */
  private adaptBackendNotifications(
    backendNotifications: any[]
  ): UniversalNotification[] {
    return backendNotifications.map((notification) => {
      // Parse data if it's a string
      let parsedData = notification.data;
      if (typeof notification.data === "string") {
        try {
          parsedData = JSON.parse(notification.data);
        } catch (e) {
          parsedData = {};
        }
      }

      // Parse tags if it's a string
      let parsedTags = notification.tags;
      if (typeof notification.tags === "string") {
        try {
          parsedTags = JSON.parse(notification.tags);
        } catch (e) {
          parsedTags = [];
        }
      }

      const adaptedNotification: UniversalNotification = {
        id: notification.id?.toString() || `notif-${Date.now()}`,
        type: notification.type || "custom",
        priority: notification.priority || "normal",
        status: notification.status || "unread",
        title: notification.title || "Notification",
        message: notification.message || "",
        excerpt: notification.message?.substring(0, 50) || "",
        data: parsedData,
        href: notification.href || "#",
        created_at: notification.created_at || new Date().toISOString(),
        read_at: notification.read_at || null,
        showBadge: notification.show_badge !== false,
        category: notification.category || "general",
        tags: Array.isArray(parsedTags) ? parsedTags : [],

        // 🔔 NOUVEAUX CHAMPS : Icônes dynamiques pour interactions
        icon: getInteractionIcon({
          type: notification.type,
          tags: Array.isArray(parsedTags) ? parsedTags : [],
          category: notification.category,
        } as Pick<UniversalNotification, "type" | "tags" | "category">),
        iconColor: getInteractionColors({
          type: notification.type,
          tags: Array.isArray(parsedTags) ? parsedTags : [],
          category: notification.category,
        } as Pick<UniversalNotification, "type" | "tags" | "category">)
          .iconColor,
        iconBgColor: getInteractionColors({
          type: notification.type,
          tags: Array.isArray(parsedTags) ? parsedTags : [],
          category: notification.category,
        } as Pick<UniversalNotification, "type" | "tags" | "category">)
          .iconBgColor,
      };

      return adaptedNotification;
    });
  }

  /**
   * 🔔 NOUVELLE MÉTHODE : Créer notification d'interaction locale (pour test)
   */
  createInteractionNotification(data: {
    actorName: string;
    contentTitle: string;
    contentType: "article" | "post" | "commentaire";
    interactionType: "like" | "comment" | "follow" | "share";
    href?: string;
  }): UniversalNotification {
    const id = `local-interaction-${Date.now()}`;

    const messageMap = {
      like: `${data.actorName} a aimé votre ${data.contentType} "${data.contentTitle}"`,
      comment: `${data.actorName} a commenté votre ${data.contentType} "${data.contentTitle}"`,
      follow: `${data.actorName} vous suit maintenant`,
      share: `${data.actorName} a partagé votre ${data.contentType} "${data.contentTitle}"`,
    };

    const titleMap = {
      like: "Nouveau like ❤️",
      comment: "Nouveau commentaire 💬",
      follow: "Nouvel abonné 👥",
      share: "Contenu partagé 📤",
    };

    const notification: UniversalNotification = {
      id,
      type: "user",
      priority: "normal",
      status: "unread",
      title: titleMap[data.interactionType],
      message: messageMap[data.interactionType],
      excerpt: messageMap[data.interactionType].substring(0, 50),
      data: {
        actor_name: data.actorName,
        content_title: data.contentTitle,
        content_type: data.contentType,
        interaction_type: data.interactionType,
      },
      href: data.href || "#",
      created_at: new Date().toISOString(),
      read_at: null,
      showBadge: true,
      category: "interaction",
      tags: [data.interactionType, data.contentType],
      icon: getInteractionIcon({
        type: "user",
        tags: [data.interactionType],
        category: "interaction",
      }),
      iconColor: getInteractionColors({
        type: "user",
        tags: [data.interactionType],
        category: "interaction",
      }).iconColor,
      iconBgColor: getInteractionColors({
        type: "user",
        tags: [data.interactionType],
        category: "interaction",
      }).iconBgColor,
    };

    // Sauvegarder localement
    this.addLocalNotification(notification);

    return notification;
  }

  /**
   * ✅ INCHANGÉES : Autres méthodes existantes
   */
  async getNotificationStats(): Promise<NotificationStatsResponse> {
    try {
      const response = await api.get("/notifications/stats");
      return response.data;
    } catch (error) {
      console.error("Erreur statistiques notifications:", error);
      // 🔧 CORRIGÉ : Utiliser des objets partiels compatibles avec les types
      return {
        success: false,
        message: "Erreur de connexion",
        data: {
          total: 0,
          unread: 0,
          byType: {} as Partial<Record<NotificationType, number>>,
          byPriority: {} as Partial<Record<NotificationPriority, number>>,
          last24Hours: 0,
          last7Days: 0,
        },
      };
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      console.log('🔄 [NotificationService] Récupération unread count...');
      const response = await api.get("/notifications/unread-count");
      console.log('✅ [NotificationService] Unread count reçu:', response.data);
      return response.data.count || 0;
    } catch (error: any) {
      console.warn("❌ [NotificationService] API unread count erreur:", {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        url: error?.config?.url,
        code: error?.code
      });
      
      // Si c'est une erreur d'authentification, retourner 0 au lieu des données locales
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        console.log('🔐 [NotificationService] Non authentifié, retour 0');
        return 0;
      }
      
      // Pour les autres erreurs, utiliser les données locales
      const localCount = this.getLocalUnreadCount();
      console.log('📱 [NotificationService] Utilisation count local:', localCount);
      return localCount;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.post(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.warn("API non disponible, marquage local");
      this.markLocalAsRead(notificationId);
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await api.post("/notifications/mark-all-read");
    } catch (error) {
      console.warn("API non disponible, marquage local");
      const notifications = this.getLocalNotifications();
      notifications.forEach((n) => {
        if (n.status === "unread") {
          this.markLocalAsRead(n.id);
        }
      });
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (error) {
      console.warn("API non disponible, suppression locale");
      this.deleteLocalNotification(notificationId);
    }
  }

  async createNotification(
    notification: CreateNotificationRequest
  ): Promise<UniversalNotification> {
    try {
      const response = await api.post("/notifications", notification);
      return this.adaptBackendNotifications([response.data.data])[0];
    } catch (error) {
      console.warn("API non disponible, création locale");
      return this.createLocalNotification(notification);
    }
  }

  // ===== MÉTHODES LOCALES INCHANGÉES =====
  private addLocalNotification(notification: UniversalNotification): void {
    try {
      const notifications = this.getLocalNotifications();
      notifications.unshift(notification);
      localStorage.setItem(
        "local-notifications",
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error("Erreur ajout notification locale:", error);
    }
  }

  private createLocalNotification(
    data: CreateNotificationRequest
  ): UniversalNotification {
    const notification: UniversalNotification = {
      id: `local-${Date.now()}`,
      type: data.type,
      priority: data.priority || "normal",
      status: "unread",
      title: data.title,
      message: data.message,
      excerpt: data.message.substring(0, 50),
      icon: this.getNotificationConfig(data.type).icon,
      iconColor: this.getNotificationConfig(data.type).iconColor,
      iconBgColor: this.getNotificationConfig(data.type).iconBgColor,
      data: data.data || {},
      href: data.href || "#",
      created_at: new Date().toISOString(),
      read_at: null,
      showBadge: true,
      category: data.category || "general",
      tags: data.tags || [],
    };

    this.addLocalNotification(notification);
    return notification;
  }

  getLocalNotifications(): UniversalNotification[] {
    try {
      const stored = localStorage.getItem("local-notifications");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Erreur lecture notifications locales:", error);
      return [];
    }
  }

  getLocalUnreadCount(): number {
    const notifications = this.getLocalNotifications();
    return notifications.filter((n) => n.status === "unread").length;
  }

  markLocalAsRead(notificationId: string): void {
    try {
      const notifications = this.getLocalNotifications();
      const updated = notifications.map((n) =>
        n.id === notificationId
          ? { ...n, status: "read" as const, read_at: new Date().toISOString() }
          : n
      );
      localStorage.setItem("local-notifications", JSON.stringify(updated));
    } catch (error) {
      console.error("Erreur marquage notification locale:", error);
    }
  }

  deleteLocalNotification(notificationId: string): void {
    try {
      const notifications = this.getLocalNotifications();
      const filtered = notifications.filter((n) => n.id !== notificationId);
      localStorage.setItem("local-notifications", JSON.stringify(filtered));
    } catch (error) {
      console.error("Erreur suppression notification locale:", error);
    }
  }

  // ===== UTILITAIRES =====
  formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "À l'instant";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}j`;
    } else {
      return time.toLocaleDateString("fr-FR");
    }
  }

  getNotificationConfig(type: NotificationType) {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.custom;
  }

  groupNotificationsByType(
    notifications: UniversalNotification[]
  ): Record<NotificationType, UniversalNotification[]> {
    return notifications.reduce((groups, notification) => {
      if (!groups[notification.type]) {
        groups[notification.type] = [];
      }
      groups[notification.type].push(notification);
      return groups;
    }, {} as Record<NotificationType, UniversalNotification[]>);
  }
}

// ===== EXPORT SINGLETON =====
const notificationService = new NotificationService();
export default notificationService;
