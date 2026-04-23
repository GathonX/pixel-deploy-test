// src/hooks/useNotifications.ts - HOOKS REACT POUR NOTIFICATIONS
// ✅ Synchronisé avec votre structure existante + support commandes

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import notificationService from '@/services/notificationService';
import { 
  UniversalNotification, 
  NotificationFilters, 
  NotificationStats,
  NotificationType,
  CreateNotificationRequest,
  OrderNotificationData
} from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';

// ===== CLÉS DE CACHE (Synchronisé avec votre structure) =====
const QUERY_KEYS = {
  notifications: ['notifications'] as const,
  notificationStats: ['notifications', 'stats'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
} as const;

// ===== HOOK PRINCIPAL POUR LES NOTIFICATIONS =====
export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, filters],
    queryFn: async () => {
      try {
        // ✅ CORRECTION : Appeler l'API en priorité
        console.log('🔔 [useNotifications] Appel API pour récupérer les notifications...');
        return await notificationService.getNotifications(filters);
      } catch (error) {
        console.warn('🔔 [useNotifications] Erreur API, utilisation des données locales:', error);
        // Fallback vers les données locales si API échoue
        const localNotifications = notificationService.getLocalNotifications();
        return {
          success: true,
          message: 'Notifications locales récupérées (API indisponible)',
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
    },
    refetchInterval: 30000, // ✅ Réactiver le polling toutes les 30 secondes
    staleTime: 5000, // ✅ Réduire pour actualiser plus souvent
    enabled: true,
    retry: 1 // ✅ Une seule tentative avant fallback
  });
}

// ===== HOOK POUR LES STATISTIQUES =====
export function useNotificationStats() {
  return useQuery({
    queryKey: QUERY_KEYS.notificationStats,
    queryFn: async () => {
      try {
        return await notificationService.getNotificationStats();
      } catch (error) {
        console.warn('Statistiques API non disponibles');
        // Fallback local
        const localNotifications = notificationService.getLocalNotifications();
        const stats = {
          total: localNotifications.length,
          unread: localNotifications.filter(n => n.status === 'unread').length,
          byType: localNotifications.reduce((acc, n) => {
            acc[n.type] = (acc[n.type] || 0) + 1;
            return acc;
          }, {} as Record<NotificationType, number>),
          byPriority: localNotifications.reduce((acc, n) => {
            acc[n.priority] = (acc[n.priority] || 0) + 1;
            return acc;
          }, {} as any),
          last24Hours: localNotifications.filter(n => 
            Date.now() - new Date(n.created_at).getTime() < 24 * 60 * 60 * 1000
          ).length,
          last7Days: localNotifications.filter(n => 
            Date.now() - new Date(n.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
          ).length
        };
        return { success: true, data: stats };
      }
    },
    refetchInterval: false, // Désactivé temporairement pour éviter les boucles
  });
}

// ===== HOOK POUR LE NOMBRE DE NON LUES =====
export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: async () => {
      try {
        // ✅ CORRECTION : Appeler l'API en priorité
        console.log('🔔 [useUnreadCount] Appel API pour compter les notifications non lues...');
        const count = await notificationService.getUnreadCount();
        console.log('🔔 [useUnreadCount] Count reçu:', count);
        return count || 0;
      } catch (error) {
        console.warn('🔔 [useUnreadCount] Erreur API, utilisation du count local:', error);
        // Fallback vers le count local si API échoue
        return notificationService.getLocalUnreadCount();
      }
    },
    refetchInterval: 30000, // ✅ Réactiver le polling toutes les 30 secondes
    staleTime: 5000, // ✅ Réduire pour actualiser plus souvent
    retry: 1, // ✅ Une tentative avant fallback
    enabled: true
  });
}

// ===== HOOK POUR MARQUER COMME LUE =====
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        return await notificationService.markAsRead(notificationId);
      } catch (error) {
        console.warn('API non disponible, marquage local');
        notificationService.markLocalAsRead(notificationId);
        return { id: notificationId } as UniversalNotification;
      }
    },
    onSuccess: () => {
      // Invalider les caches pour actualiser l'UI
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationStats });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de marquer la notification comme lue",
        variant: "destructive"
      });
      console.error('Erreur marquer comme lue:', error);
    }
  });
}

// ===== HOOK POUR MARQUER TOUTES COMME LUES =====
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (type?: NotificationType) => {
      try {
        return await notificationService.markAllAsRead(type);
      } catch (error) {
        console.warn('API non disponible pour marquage global');
        throw error;
      }
    },
    onSuccess: (data, type) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationStats });
      
      toast({
        title: "Notifications marquées",
        description: type 
          ? `Toutes les notifications ${type} ont été marquées comme lues`
          : "Toutes les notifications ont été marquées comme lues"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de marquer les notifications comme lues",
        variant: "destructive"
      });
      console.error('Erreur marquer toutes comme lues:', error);
    }
  });
}

// ===== HOOK POUR SUPPRIMER UNE NOTIFICATION =====
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        return await notificationService.deleteNotification(notificationId);
      } catch (error) {
        console.warn('API non disponible, suppression locale');
        notificationService.deleteLocalNotification(notificationId);
        return { success: true, message: 'Notification supprimée localement' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationStats });
      
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée avec succès"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive"
      });
      console.error('Erreur suppression notification:', error);
    }
  });
}

// ===== ✅ NOUVEAU : HOOK POUR CRÉER UNE NOTIFICATION DE COMMANDE =====
export function useCreateOrderNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderData: OrderNotificationData) => {
      try {
        // Essayer d'abord l'API
        const request: CreateNotificationRequest = {
          type: 'order',
          priority: 'high',
          title: '🎉 Nouvelle commande reçue !',
          message: `${orderData.customer_name} a passé une commande de ${orderData.amount}€`,
          data: orderData,
          href: `/dashboard`,
          category: 'sales',
          tags: ['order', 'sales', 'revenue']
        };
        
        return await notificationService.createNotification(request);
      } catch (error) {
        console.warn('API non disponible, création locale');
        // Fallback : créer localement
        notificationService.addOrderNotificationLocally(orderData);
        return notificationService.createOrderNotification(orderData);
      }
    },
    onSuccess: (notification) => {
      // Actualiser les caches
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationStats });
      
      console.log('🔔 Notification de commande créée:', notification);
      
      // Optionnel : Toast de confirmation
      toast({
        title: "Nouvelle commande !",
        description: `Commande ${(notification.data as OrderNotificationData).order_number} reçue`,
      });
    },
    onError: (error) => {
      console.error('Erreur création notification commande:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la notification de commande",
        variant: "destructive"
      });
    }
  });
}

// ===== HOOK POUR CRÉER UNE NOTIFICATION GÉNÉRALE =====
export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (request: CreateNotificationRequest) => 
      notificationService.createNotification(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notificationStats });
      
      toast({
        title: "Notification créée",
        description: "La notification a été créée avec succès"
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la notification",
        variant: "destructive"
      });
      console.error('Erreur création notification:', error);
    }
  });
}

// ===== HOOK POUR FILTRER LES NOTIFICATIONS =====
export function useNotificationFilters() {
  const [filters, setFilters] = useState<NotificationFilters>({});
  
  const updateFilter = useCallback((key: keyof NotificationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useCallback(() => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof NotificationFilters];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters: hasActiveFilters()
  };
}

// ===== HOOK POUR LES NOTIFICATIONS PAR TYPE =====
export function useNotificationsByType(type: NotificationType) {
  const filters: NotificationFilters = { types: [type] };
  
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, 'by-type', type],
    queryFn: () => notificationService.getNotifications(filters),
    refetchInterval: 30000,
  });
}

// ===== ✅ HOOK SPÉCIALISÉ POUR LES NOTIFICATIONS DE COMMANDES =====
export function useOrderNotifications() {
  return useNotificationsByType('order');
}

// ===== HOOK COMPOSITE POUR L'UTILISATION COMPLÈTE =====
export function useNotificationSystem() {
  const notifications = useNotifications();
  const stats = useNotificationStats();
  const unreadCount = useUnreadNotificationsCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const deleteNotification = useDeleteNotification();
  const createOrderNotification = useCreateOrderNotification();
  const { filters, updateFilter, clearFilters, hasActiveFilters } = useNotificationFilters();

  return {
    // Données
    notifications: notifications.data?.data || [],
    stats: stats.data?.data,
    unreadCount: unreadCount.data || 0,
    
    // États de chargement
    isLoading: notifications.isLoading || stats.isLoading || unreadCount.isLoading,
    isError: notifications.isError || stats.isError || unreadCount.isError,
    
    // Actions
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
    createOrderNotification: createOrderNotification.mutate, // ✅ NOUVEAU
    
    // Filtres
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    
    // Utilitaires
    refresh: () => {
      notifications.refetch();
      stats.refetch();
      unreadCount.refetch();
    }
  };
}