// src/hooks/useDashboardSync.ts - SYNCHRONISATION GLOBALE DES DONNÉES

import { useEffect, useCallback, useRef, useState } from 'react';
import { analyticsService, DashboardStats } from '@/services/analyticsService';

// ✅ TYPES TYPESCRIPT STRICTS
interface SyncEvent {
  type: 'interaction' | 'content' | 'stats';
  entity: 'blog_post' | 'social_post' | 'comment';
  entityId: number;
  action: 'like' | 'unlike' | 'comment' | 'uncomment' | 'view' | 'share' | 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
  timestamp: string;
}

interface DashboardSyncState {
  stats: DashboardStats | null;
  lastSync: Date | null;
  isLoading: boolean;
  error: string | null;
}

interface DashboardSyncHook {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
  forceRefresh: () => Promise<void>;
  emitEvent: (event: Omit<SyncEvent, 'timestamp'>) => void;
}

// ✅ GESTIONNAIRE D'ÉVÉNEMENTS GLOBAL
class DashboardSyncManager {
  private static instance: DashboardSyncManager;
  private listeners: Set<(stats: DashboardStats | null) => void> = new Set();
  private currentStats: DashboardStats | null = null;
  private lastSync: Date | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];

  static getInstance(): DashboardSyncManager {
    if (!DashboardSyncManager.instance) {
      DashboardSyncManager.instance = new DashboardSyncManager();
    }
    return DashboardSyncManager.instance;
  }

  /**
   * Ajouter un listener pour les changements de stats
   */
  addListener(callback: (stats: DashboardStats | null) => void): void {
    this.listeners.add(callback);
    
    // Envoyer immédiatement les stats actuelles si disponibles
    if (this.currentStats) {
      callback(this.currentStats);
    }
  }

  /**
   * Supprimer un listener
   */
  removeListener(callback: (stats: DashboardStats | null) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(stats: DashboardStats | null): void {
    this.listeners.forEach(callback => callback(stats));
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  private isUserAuthenticated(): boolean {
    try {
      const token = localStorage.getItem("auth_token");
      const cookies = document.cookie;
      const hasSession = cookies.includes("laravel_session") || cookies.includes("XSRF-TOKEN");
      return !!(token || hasSession);
    } catch (error) {
      return false;
    }
  }

  /**
   * Rafraîchir les statistiques depuis l'API
   */
  async refreshStats(): Promise<DashboardStats | null> {
    // ✅ Ignorer si l'utilisateur n'est pas authentifié (page publique)
    if (!this.isUserAuthenticated()) {
      console.log('🔄 [DashboardSync] Refresh ignoré - utilisateur non connecté');
      return null;
    }

    if (this.isRefreshing) {
      // Si un refresh est en cours, attendre qu'il se termine
      return new Promise((resolve) => {
        this.refreshQueue.push(() => resolve(this.currentStats));
      });
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 [DashboardSync] Rafraîchissement des statistiques...');

      const newStats = await analyticsService.getDashboardStats();
      
      this.currentStats = newStats;
      this.lastSync = new Date();
      
      console.log('✅ [DashboardSync] Statistiques mises à jour:', {
        blog_posts: newStats.blog_stats.total_posts,
        total_views: newStats.engagement_stats.total_views,
        total_likes: newStats.engagement_stats.total_likes,
        engagement_rate: newStats.engagement_stats.engagement_rate
      });

      // Notifier tous les listeners
      this.notifyListeners(newStats);

      // Traiter la queue
      this.refreshQueue.forEach(callback => callback());
      this.refreshQueue = [];

      return newStats;

    } catch (error) {
      console.error('❌ [DashboardSync] Erreur refresh:', error);
      
      // Notifier les listeners de l'erreur
      this.notifyListeners(null);
      
      // Traiter la queue avec null
      this.refreshQueue.forEach(callback => callback());
      this.refreshQueue = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Émettre un événement de synchronisation
   */
  emitSyncEvent(event: Omit<SyncEvent, 'timestamp'>): void {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    console.log('📡 [DashboardSync] Événement émis:', fullEvent);

    // Déclencher un refresh automatique pour certains événements
    if (this.shouldAutoRefresh(fullEvent)) {
      console.log('🔄 [DashboardSync] Auto-refresh déclenché par événement');
      this.refreshStats().catch(console.error);
    }
  }

  /**
   * Déterminer si un événement doit déclencher un auto-refresh
   */
  private shouldAutoRefresh(event: SyncEvent): boolean {
    // Refresh automatique pour les interactions qui affectent les statistiques
    const interactionEvents = ['like', 'unlike', 'comment', 'uncomment', 'view', 'share'];
    const contentEvents = ['create', 'update', 'delete'];
    
    return interactionEvents.includes(event.action) || contentEvents.includes(event.action);
  }

  /**
   * Obtenir les statistiques actuelles
   */
  getCurrentStats(): DashboardStats | null {
    return this.currentStats;
  }

  /**
   * Obtenir la date du dernier sync
   */
  getLastSync(): Date | null {
    return this.lastSync;
  }

  /**
   * Vérifier si un refresh est en cours
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// ✅ HOOK PRINCIPAL
export function useDashboardSync(): DashboardSyncHook {
  const syncManager = DashboardSyncManager.getInstance();
  const [state, setState] = useState<DashboardSyncState>({
    stats: syncManager.getCurrentStats(),
    lastSync: syncManager.getLastSync(),
    isLoading: false,
    error: null
  });

  // Fonction pour mettre à jour l'état local
  const handleStatsUpdate = useCallback((newStats: DashboardStats | null) => {
    setState(prev => ({
      ...prev,
      stats: newStats,
      lastSync: syncManager.getLastSync(),
      isLoading: false,
      error: newStats === null ? 'Erreur de chargement' : null
    }));
  }, [syncManager]);

  // S'abonner aux changements
  useEffect(() => {
    syncManager.addListener(handleStatsUpdate);
    
    return () => {
      syncManager.removeListener(handleStatsUpdate);
    };
  }, [syncManager, handleStatsUpdate]);

  // Charger les stats initiales si pas encore chargées
  useEffect(() => {
    if (!state.stats && !state.isLoading) {
      setState(prev => ({ ...prev, isLoading: true }));
      syncManager.refreshStats().catch(console.error);
    }
  }, [state.stats, state.isLoading, syncManager]);

  // Fonction pour forcer un refresh
  const forceRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await syncManager.refreshStats();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Erreur de chargement'
      }));
    }
  }, [syncManager]);

  // Fonction pour émettre un événement
  const emitEvent = useCallback((event: Omit<SyncEvent, 'timestamp'>) => {
    syncManager.emitSyncEvent(event);
  }, [syncManager]);

  return {
    stats: state.stats,
    isLoading: state.isLoading,
    error: state.error,
    lastSync: state.lastSync,
    forceRefresh,
    emitEvent
  };
}

// ✅ HOOK UTILITAIRE POUR ÉMETTRE DES ÉVÉNEMENTS
export function useEmitDashboardEvent() {
  const syncManager = DashboardSyncManager.getInstance();
  
  return useCallback((event: Omit<SyncEvent, 'timestamp'>) => {
    syncManager.emitSyncEvent(event);
  }, [syncManager]);
}

// ✅ EXPORT DU GESTIONNAIRE POUR USAGE DIRECT
export const dashboardSyncManager = DashboardSyncManager.getInstance();