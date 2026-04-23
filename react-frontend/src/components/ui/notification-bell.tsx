// src/components/ui/notification-bell.tsx - MISE À JOUR AVEC SYSTÈME D'EXPIRATION
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Filter,
  MoreHorizontal,
  ShoppingCart,
  Ticket,
  CreditCard,
  User,
  Settings,
  AlertTriangle,
  Mail,
  Zap,
  DollarSign,
  CheckCircle,
  XCircle,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Calendar,
  Clock,
  Crown,
  Bot,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificationSystem } from "@/hooks/useNotifications";
import { UniversalNotification, NotificationType } from "@/types/notifications";
import notificationService from "@/services/notificationService";

// ===== CONFIGURATION DES ICÔNES PAR TYPE =====
const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  order: ShoppingCart,
  ticket: Ticket,
  payment: CreditCard,
  payment_request: DollarSign,
  feature_approved: CheckCircle,
  feature_rejected: XCircle,
  feature_expiring: Calendar, // ✅ NOUVEAU : Icône calendrier pour expiration imminente
  feature_expired: AlertTriangle, // ✅ NOUVEAU : Icône alerte pour fonctionnalité expirée
  agent_suggestion: Lightbulb, // 🤖 NOUVEAU : Suggestions de l'agent
  agent_insight: Bot, // 🤖 NOUVEAU : Insights de l'agent
  agent_alert: AlertCircle, // 🤖 NOUVEAU : Alertes de l'agent
  user: User,
  system: Settings,
  marketing: Mail,
  security: AlertTriangle,
  funnel: Zap,
  email: Mail,
  project: Settings,
  admin: Bell,
  custom: Bell,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  order: "Commandes",
  ticket: "Support",
  payment: "Paiements",
  payment_request: "Demandes de paiement",
  feature_approved: "Fonctionnalité approuvée",
  feature_rejected: "Fonctionnalité rejetée",
  feature_expiring: "Expirations imminentes", // ✅ NOUVEAU
  feature_expired: "Fonctionnalités expirées", // ✅ NOUVEAU
  agent_suggestion: "Suggestions IA", // 🤖 NOUVEAU
  agent_insight: "Insights IA", // 🤖 NOUVEAU
  agent_alert: "Alertes IA", // 🤖 NOUVEAU
  user: "Interactions",
  system: "Système",
  marketing: "Marketing",
  security: "Sécurité",
  funnel: "Funnel",
  email: "Emails",
  project: "Projets",
  admin: "Admin",
  custom: "Autres",
};

// ✅ NOUVEAU : Couleurs spécifiques pour les notifications d'expiration
const getExpirationColors = (notification: UniversalNotification) => {
  if (notification.type === "feature_expired") {
    return {
      bgColor: "#fef2f2", // red-50
      borderColor: "#fecaca", // red-200
      textColor: "#dc2626", // red-600
    };
  }

  if (notification.type === "feature_expiring") {
    const daysRemaining = notification.data?.days_remaining;

    if (daysRemaining <= 1) {
      return {
        bgColor: "#fef2f2", // red-50
        borderColor: "#fecaca", // red-200
        textColor: "#dc2626", // red-600
      };
    }

    if (daysRemaining <= 3) {
      return {
        bgColor: "#fff7ed", // orange-50
        borderColor: "#fed7aa", // orange-200
        textColor: "#ea580c", // orange-600
      };
    }

    return {
      bgColor: "#eff6ff", // blue-50
      borderColor: "#bfdbfe", // blue-200
      textColor: "#2563eb", // blue-600
    };
  }

  return null;
};

// ===== COMPOSANT PRINCIPAL =====
interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  maxDisplayed?: number;
  enableInfiniteScroll?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  showBadge = true,
  maxDisplayed = 50, // Augmenté de 5 à 50 pour afficher plus de notifications
  enableInfiniteScroll = true,
}) => {
  const [selectedType, setSelectedType] = useState<NotificationType | "all">(
    "all"
  );
  
  // ✅ NOUVEAU : Détecter si on est en mode admin
  const location = useLocation();
  const isAdminMode = location.pathname.startsWith('/admin');

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotificationSystem();

  // Filtrer les notifications par type sélectionné
  const filteredNotifications =
    selectedType === "all"
      ? notifications
      : notifications.filter((n) => n.type === selectedType);

  // Limiter l'affichage seulement si infinite scroll est désactivé
  const displayedNotifications = enableInfiniteScroll 
    ? filteredNotifications 
    : filteredNotifications.slice(0, maxDisplayed);

  // Grouper par type pour les compteurs
  const notificationsByType = notifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ✅ NOUVEAU : Statistiques d'expiration
  const expirationStats = {
    expiring: notifications.filter((n) => n.type === "feature_expiring").length,
    expired: notifications.filter((n) => n.type === "feature_expired").length,
    urgent: notifications.filter(
      (n) => n.type === "feature_expiring" && n.data?.days_remaining <= 1
    ).length,
  };

  // Gérer le marquage global comme lu
  const handleMarkAllAsRead = () => {
    const typeToMark = selectedType === "all" ? undefined : selectedType;
    markAllAsRead(typeToMark);
  };

  // ✅ NOUVEAU : Action de renouvellement rapide
  const handleQuickRenew = (featureId: number) => {
    // Rediriger vers la page de renouvellement
    window.location.href = `/features?renew=${featureId}`;
  };

  // Composant pour une notification individuelle
  const NotificationItem: React.FC<{ notification: UniversalNotification }> = ({
    notification,
  }) => {
    // 🔔 Utiliser l'icône dynamique de la notification
    const IconComponent =
      notification.icon || TYPE_ICONS[notification.type] || Bell;

    // Debug unknown types
    if (!notification.icon && !TYPE_ICONS[notification.type]) {
      console.warn(`🔔 [NotificationBell] Type inconnu dans notification: "${notification.type}"`);
    }
    const isUnread = notification.status === "unread";

    // ✅ NOUVEAU : Couleurs spéciales pour l'expiration
    const expirationColors = getExpirationColors(notification);

    // 🔔 Gestion du clic sur notification
    const handleNotificationClick = () => {
      if (isUnread) {
        markAsRead(notification.id);
      }
    };

    // ✅ NOUVEAU : Badge spécial pour expiration
    const getExpirationBadge = () => {
      if (notification.type === "feature_expired") {
        return (
          <Badge variant="destructive" className="text-xs">
            Expirée
          </Badge>
        );
      }

      if (notification.type === "feature_expiring") {
        const days = notification.data?.days_remaining;
        if (days === 0) {
          return (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Expire aujourd'hui
            </Badge>
          );
        }
        if (days === 1) {
          return (
            <Badge variant="destructive" className="text-xs animate-pulse">
              Expire demain
            </Badge>
          );
        }
        if (days <= 3) {
          return (
            <Badge
              variant="outline"
              className="text-xs border-orange-500 text-orange-600"
            >
              {days}j restants
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className="text-xs border-blue-500 text-blue-600"
          >
            {days}j restants
          </Badge>
        );
      }

      return null;
    };

    return (
      <div
        className={cn(
          "group flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer",
          isUnread && "bg-blue-50/50",
          expirationColors && {
            backgroundColor: expirationColors.bgColor,
            borderLeft: `3px solid ${expirationColors.borderColor}`,
          }
        )}
        onClick={handleNotificationClick}
      >
        {/* Icône dynamique */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor:
              expirationColors?.borderColor ||
              notification.iconBgColor ||
              "#f3f4f6",
            color:
              expirationColors?.textColor ||
              notification.iconColor ||
              "#6b7280",
          }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          {notification.href && notification.href !== "#" ? (
            <Link
              to={notification.href}
              className="block hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <h4
                className={cn(
                  "text-sm font-medium line-clamp-1 transition-colors",
                  isUnread ? "font-semibold text-gray-900" : "font-normal text-gray-700"
                )}
              >
                {notification.title}
              </h4>
              <p className={cn(
                "text-sm line-clamp-2 mt-1 transition-colors",
                isUnread ? "text-gray-700" : "text-gray-500"
              )}>
                {notification.message}
              </p>
            </Link>
          ) : (
            <>
              <h4
                className={cn(
                  "text-sm font-medium line-clamp-1 transition-colors",
                  isUnread ? "font-semibold text-gray-900" : "font-normal text-gray-700"
                )}
              >
                {notification.title}
              </h4>
              <p className={cn(
                "text-sm line-clamp-2 mt-1 transition-colors",
                isUnread ? "text-gray-700" : "text-gray-500"
              )}>
                {notification.message}
              </p>
            </>
          )}

          {/* Métadonnées */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {notificationService.formatRelativeTime(notification.created_at)}
            </span>

            {/* ✅ NOUVEAU : Badge d'expiration */}
            <div className="flex items-center gap-2">
              {getExpirationBadge()}

              {/* Tags existants avec style adaptatif */}
              {notification.tags && notification.tags.length > 0 && (
                <div className="flex gap-1">
                  {notification.tags.slice(0, 2).map((tag, index) => (
                    <Badge
                      key={index}
                      variant={isUnread ? "default" : "secondary"}
                      className={cn(
                        "text-xs px-1 py-0 h-5 transition-colors",
                        isUnread && "bg-blue-100 text-blue-700 border-blue-200"
                      )}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* ✅ NOUVEAU : Bouton renouvellement rapide */}
              {(notification.type === "feature_expiring" ||
                notification.type === "feature_expired") &&
                notification.data?.can_renew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickRenew(notification.data.feature_id);
                    }}
                    title="Renouveler"
                  >
                    <Crown className="w-3 h-3" />
                  </Button>
                )}

              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(notification.id);
                  }}
                  title="Marquer comme lu"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Indicateur non lu */}
        {isUnread && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
        )}
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative h-8 w-8 p-0", className)}
        >
          <Bell className="w-4 h-4" />
          {showBadge && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
          {/* ✅ NOUVEAU : Badge d'urgence pour expirations */}
          {expirationStats.urgent > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              !
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 max-h-[80vh] p-0" // Augmenté de 70vh à 80vh
        sideOffset={5}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nouvelles
              </Badge>
            )}
            {/* ✅ NOUVEAU : Alerte expirations urgentes */}
            {expirationStats.urgent > 0 && (
              <Badge variant="destructive" className="text-xs animate-pulse">
                {expirationStats.urgent} urgentes
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Filtre par type */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Filter className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setSelectedType("all")}
                    className={selectedType === "all" ? "bg-gray-100" : ""}
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Toutes ({notifications.length})
                  </DropdownMenuItem>

                  {/* ✅ NOUVEAU : Filtres rapides pour expirations */}
                  {(expirationStats.expiring > 0 ||
                    expirationStats.expired > 0) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs text-red-600">
                        Expirations
                      </DropdownMenuLabel>

                      {expirationStats.expiring > 0 && (
                        <DropdownMenuItem
                          onClick={() => setSelectedType("feature_expiring")}
                          className={
                            selectedType === "feature_expiring"
                              ? "bg-gray-100"
                              : ""
                          }
                        >
                          <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                          Expirent bientôt ({expirationStats.expiring})
                        </DropdownMenuItem>
                      )}

                      {expirationStats.expired > 0 && (
                        <DropdownMenuItem
                          onClick={() => setSelectedType("feature_expired")}
                          className={
                            selectedType === "feature_expired"
                              ? "bg-gray-100"
                              : ""
                          }
                        >
                          <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                          Expirées ({expirationStats.expired})
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {Object.entries(notificationsByType)
                    .filter(
                      ([type]) =>
                        !["feature_expiring", "feature_expired"].includes(type)
                    )
                    .map(([type, count]) => {
                      const IconComponent =
                        TYPE_ICONS[type as NotificationType] || Bell;

                      // Debug unknown types
                      if (!TYPE_ICONS[type as NotificationType]) {
                        console.warn(`🔔 [NotificationBell] Type inconnu: "${type}"`);
                      }

                      return (
                        <DropdownMenuItem
                          key={type}
                          onClick={() =>
                            setSelectedType(type as NotificationType)
                          }
                          className={selectedType === type ? "bg-gray-100" : ""}
                        >
                          <IconComponent className="w-4 h-4 mr-2" />
                          {TYPE_LABELS[type as NotificationType] || type} ({count})
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Actions globales */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleMarkAllAsRead}>
                    <CheckCheck className="w-4 h-4 mr-2" />
                    {selectedType === "all"
                      ? "Tout marquer comme lu"
                      : `Marquer ${TYPE_LABELS[selectedType]} comme lu`}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={refresh}>
                    <Bell className="w-4 h-4 mr-2" />
                    Actualiser
                  </DropdownMenuItem>
                  {/* ✅ NOUVEAU : Lien direct vers les fonctionnalités */}
                  {(expirationStats.expiring > 0 ||
                    expirationStats.expired > 0) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => (window.location.href = "/features")}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Gérer mes fonctionnalités
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Liste des notifications */}
        <ScrollArea className="max-h-[60vh] min-h-[200px]" // Hauteur plus flexible et responsive
          type="auto" // Affiche la scrollbar seulement quand nécessaire
        >
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p>Chargement des notifications...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Aucune notification</p>
              <p className="text-sm">
                {selectedType === "all"
                  ? "Vous êtes à jour !"
                  : `Aucune notification ${TYPE_LABELS[selectedType]}`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer avec compteur de notifications */}
        {filteredNotifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50/50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {displayedNotifications.length} sur {filteredNotifications.length} notifications
                {selectedType !== "all" && ` (${TYPE_LABELS[selectedType]})`}
              </p>
              <Link
                to={isAdminMode ? "/admin/notifications" : "/notifications"}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Voir tout
              </Link>
            </div>
            {/* Indicateur de scroll si nécessaire */}
            {filteredNotifications.length > displayedNotifications.length && (
              <div className="mt-2 text-center">
                <p className="text-xs text-orange-600 animate-pulse">
                  ⬆️ Faites défiler pour voir plus de notifications
                </p>
              </div>
            )}
          </div>
        )}

        {/* ✅ NOUVEAU : Message informatif pour les expirations */}
        {(selectedType === "feature_expiring" ||
          selectedType === "feature_expired") &&
          displayedNotifications.length > 0 && (
            <div className="p-3 border-t bg-red-50/50">
              <p className="text-xs text-red-600">
                💡 Renouvelez vos fonctionnalités pour continuer à les utiliser
              </p>
            </div>
          )}

        {/* Message informatif pour les interactions */}
        {selectedType === "user" && displayedNotifications.length > 0 && (
          <div className="p-3 border-t bg-blue-50/50">
            <p className="text-xs text-blue-600">
              💡 Interactions de vos contenus (likes, commentaires, abonnés)
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
