import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Search,
  Filter,
  CheckCheck,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  User,
  Settings,
  AlertTriangle,
  Mail,
  ShoppingCart,
  Ticket,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Crown,
  Zap,
  MoreHorizontal,
  Archive,
  Star,
  StarOff,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useNotificationSystem } from "@/hooks/useNotifications";
import { UniversalNotification, NotificationType } from "@/types/notifications";
import notificationService from "@/services/notificationService";

// Configuration des icônes par type
const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  order: ShoppingCart,
  ticket: Ticket,
  payment: CreditCard,
  payment_request: DollarSign,
  feature_approved: CheckCircle,
  feature_rejected: XCircle,
  feature_expiring: Calendar,
  feature_expired: AlertTriangle,
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
  feature_expiring: "Expirations imminentes",
  feature_expired: "Fonctionnalités expirées",
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

const PRIORITY_COLORS = {
  high: "bg-red-50 border-red-200 text-red-800",
  medium: "bg-orange-50 border-orange-200 text-orange-800",
  low: "bg-blue-50 border-blue-200 text-blue-800",
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // État local
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<NotificationType | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "read" | "unread">("all");
  const [sortBy, setSortBy] = useState<"date" | "type" | "priority">("date");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "compact">("list");

  // Hook de notifications
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  } = useNotificationSystem();

  // Notifications filtrées et triées
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = notifications.filter((notification) => {
      // Filtre par recherche
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtre par type
      const matchesType = selectedType === "all" || notification.type === selectedType;

      // Filtre par statut
      const matchesStatus = 
        selectedStatus === "all" ||
        (selectedStatus === "read" && notification.status === "read") ||
        (selectedStatus === "unread" && notification.status === "unread");

      return matchesSearch && matchesType && matchesStatus;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "type":
          return a.type.localeCompare(b.type);
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = (a.data?.priority as keyof typeof priorityOrder) || "low";
          const bPriority = (b.data?.priority as keyof typeof priorityOrder) || "low";
          return priorityOrder[bPriority] - priorityOrder[aPriority];
        default:
          return 0;
      }
    });

    return filtered;
  }, [notifications, searchTerm, selectedType, selectedStatus, sortBy]);

  // Statistiques
  const stats = useMemo(() => {
    const byType = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const urgent = notifications.filter(n => 
      n.type === "feature_expired" || 
      (n.type === "feature_expiring" && n.data?.days_remaining <= 1)
    ).length;

    return { byType, urgent, total: notifications.length };
  }, [notifications]);

  // Actions groupées
  const handleBulkAction = (action: "markRead" | "delete" | "archive") => {
    selectedNotifications.forEach((id) => {
      switch (action) {
        case "markRead":
          markAsRead(id);
          break;
        case "delete":
          deleteNotification(id);
          break;
        default:
          break;
      }
    });
    setSelectedNotifications([]);
  };

  // Sélection/déselection
  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredAndSortedNotifications.map(n => n.id);
    setSelectedNotifications(allIds);
  };

  const deselectAll = () => {
    setSelectedNotifications([]);
  };

  // Fonction de redirection intelligente selon le type de notification
  const handleNotificationClick = (notification: UniversalNotification) => {
    // Marquer comme lue si pas encore lue
    if (notification.status === "unread") {
      markAsRead(notification.id);
    }

    // Si une href est définie, l'utiliser
    if (notification.href && notification.href !== "#") {
      navigate(notification.href);
      return;
    }

    // Sinon, redirection intelligente selon le type
    switch (notification.type) {
      case "order":
        navigate("/dashboard");
        break;

      case "ticket":
        // Redirection vers le ticket spécifique
        if (notification.data?.ticket_id) {
          navigate(`/tickets/${notification.data.ticket_id}`);
        } else {
          navigate("/dashboard/tickets");
        }
        break;

      case "payment":
      case "payment_request":
        // Redirection vers l'historique des paiements
        if (notification.data?.payment_id) {
          navigate(`/dashboard/payment-history?payment=${notification.data.payment_id}`);
        } else {
          navigate("/dashboard/payment-history");
        }
        break;

      case "feature_approved":
      case "feature_rejected":
      case "feature_expiring":
      case "feature_expired":
        // Redirection vers la gestion des fonctionnalités
        if (notification.data?.feature_id) {
          navigate(`/features?highlight=${notification.data.feature_id}`);
        } else {
          navigate("/features");
        }
        break;

      case "user":
        // Redirection vers le profil ou les interactions sociales
        if (notification.data?.user_id) {
          navigate(`/profile?user=${notification.data.user_id}`);
        } else {
          navigate("/mon-actualite"); // Page des interactions sociales
        }
        break;

      case "system":
      case "security":
        // Redirection vers les paramètres/sécurité
        navigate("/dashboard/settings");
        break;

      case "marketing":
      case "email":
        // Redirection vers le blog ou marketing
        navigate("/dashboard/default-blog");
        break;

      case "project":
        navigate("/dashboard");
        break;

      case "admin":
        // Redirection vers l'admin si accessible
        navigate("/admin/dashboard");
        break;

      default:
        // Par défaut, redirection vers le workspace
        navigate("/workspace");
        break;
    }
  };

  // Composant de notification individuelle
  const NotificationCard: React.FC<{ notification: UniversalNotification; isSelected: boolean }> = ({
    notification,
    isSelected,
  }) => {
    const IconComponent = TYPE_ICONS[notification.type] || Bell;
    const isUnread = notification.status === "unread";
    const notificationAge = Date.now() - new Date(notification.created_at).getTime();
    const isNew = notificationAge < 60 * 60 * 1000; // < 1 heure
    const isRecent = notificationAge < 24 * 60 * 60 * 1000; // < 24 heures

    const priority = (notification.data?.priority as keyof typeof PRIORITY_COLORS) || "low";

    return (
      <Card 
        className={cn(
          "group cursor-pointer transition-all duration-200 hover:shadow-md relative",
          isUnread && "border-l-4 border-l-blue-500 bg-blue-50/50",
          isSelected && "ring-2 ring-blue-500 bg-blue-50",
          isNew && isUnread && "animate-pulse"
        )}
      >
        {/* Zone cliquable pour redirection */}
        <div 
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => handleNotificationClick(notification)}
          title="Cliquer pour accéder aux détails"
        />

        <CardContent className="p-4 relative z-20">
          <div className="flex items-start gap-4">
            {/* Checkbox de sélection */}
            <div className="flex-shrink-0 mt-1">
              <div 
                className={cn(
                  "w-4 h-4 rounded border-2 transition-colors relative z-30",
                  isSelected 
                    ? "bg-blue-500 border-blue-500" 
                    : "border-gray-300 hover:border-blue-400"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNotificationSelection(notification.id);
                }}
              >
                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            {/* Icône */}
            <div className="flex-shrink-0">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-transform",
                  isUnread && "ring-2 ring-blue-200 scale-110"
                )}
                style={{
                  backgroundColor: notification.iconBgColor || "#f3f4f6",
                  color: notification.iconColor || "#6b7280",
                }}
              >
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <h3 className={cn(
                  "text-sm font-medium line-clamp-2 hover:text-blue-600 transition-colors flex items-center",
                  isUnread ? "text-gray-900 font-semibold" : "text-gray-700"
                )}>
                  {notification.title}
                  {/* Indicateur de lien cliquable */}
                  <span className="ml-2 text-xs text-blue-500 opacity-70 group-hover:opacity-100 transition-opacity">↗</span>
                </h3>
                
                <div className="flex items-center gap-2 ml-2">
                  {/* Badge de nouveauté */}
                  {isNew && isUnread && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      NOUVEAU
                    </Badge>
                  )}
                  
                  {/* Badge de priorité */}
                  <Badge 
                    className={cn("text-xs", PRIORITY_COLORS[priority])}
                    variant="outline"
                  >
                    {priority.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <p className={cn(
                "text-sm line-clamp-2 mb-3",
                isUnread ? "text-gray-700" : "text-gray-500"
              )}>
                {notification.message}
              </p>

              {/* Métadonnées */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {notificationService.formatRelativeTime(notification.created_at)}
                  </span>
                  
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[notification.type]}
                  </Badge>
                </div>

                {/* Actions rapides */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-30">
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
                      <Eye className="w-3 h-3" />
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
                    title="Supprimer la notification"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>

                  {/* Bouton de redirection explicite */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNotificationClick(notification);
                    }}
                    title="Voir les détails"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Indicateur non lu */}
            {isUnread && (
              <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <SidebarProvider>
      <DashboardLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-gray-600 mt-1">
                Gérez toutes vos notifications en un seul endroit
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {unreadCount} non lues
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Non lues</p>
                    <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Urgentes</p>
                    <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Lues</p>
                    <p className="text-2xl font-bold text-green-600">{stats.total - unreadCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et actions */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Filtres */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  {/* Recherche */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher une notification..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filtre type */}
                  <Select value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {Object.entries(TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Filtre statut */}
                  <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="unread">Non lues</SelectItem>
                      <SelectItem value="read">Lues</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tri */}
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="priority">Priorité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions groupées */}
                {selectedNotifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {selectedNotifications.length} sélectionnées
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("markRead")}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Marquer lues
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("delete")}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAll}
                    >
                      Désélectionner
                    </Button>
                  </div>
                )}

                {/* Actions globales */}
                <div className="flex items-center gap-2">
                  {filteredAndSortedNotifications.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                    >
                      Tout sélectionner
                    </Button>
                  )}
                  
                  {unreadCount > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => markAllAsRead()}
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      Tout marquer lu
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des notifications */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {filteredAndSortedNotifications.length} notification(s)
                  {selectedType !== "all" && ` - ${TYPE_LABELS[selectedType]}`}
                </span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-500px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <span>Chargement des notifications...</span>
                  </div>
                ) : filteredAndSortedNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
                    <p className="text-sm text-center max-w-md">
                      {searchTerm || selectedType !== "all" || selectedStatus !== "all"
                        ? "Aucune notification ne correspond à vos critères de recherche."
                        : "Vous êtes à jour ! Aucune notification pour le moment."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y space-y-0 p-4">
                    {filteredAndSortedNotifications.map((notification) => (
                      <div key={notification.id} className="py-2 first:pt-0 last:pb-0">
                        <NotificationCard
                          notification={notification}
                          isSelected={selectedNotifications.includes(notification.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default NotificationsPage;