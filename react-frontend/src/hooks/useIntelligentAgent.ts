import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Types
interface AgentStats {
  basic_info: {
    name: string;
    tier: 'free' | 'premium' | 'enterprise';
    status: 'inactive' | 'active' | 'paused' | 'learning';
    created_at: string;
    last_active_at?: string;
  };
  quota: {
    daily_limit: number;
    used_today: number;
    remaining: number;
    reset_date: string;
  };
  performance: {
    total_interactions: number;
    successful_recommendations: number;
    average_satisfaction: number;
    success_rate: number;
  };
  capabilities: Record<string, any>;
  settings: {
    communication_tone: string;
    confidence_threshold: number;
    auto_learning_enabled: boolean;
    proactive_suggestions: boolean;
  };
}

interface AgentInteractionResponse {
  success: boolean;
  response?: string;
  interaction_id?: string;
  interaction_type?: string;
  confidence?: number;
  agent_tier?: string;
  quota_remaining?: number;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  upgrade_suggestion?: {
    message: string;
    benefits: string[];
    cta: string;
  };
  quota_exceeded?: boolean;
  error?: string;
}

interface UseIntelligentAgentReturn {
  // État
  agentStats: AgentStats | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;

  // Actions
  sendMessage: (message: string, context?: Record<string, any>) => Promise<AgentInteractionResponse>;
  refreshAgent: () => Promise<void>;
  upgradeAgent: (targetTier: 'premium' | 'enterprise') => Promise<boolean>;
  updatePreferences: (preferences: Record<string, any>) => Promise<boolean>;
  getContextualInsights: (page: string, context?: Record<string, any>) => Promise<AgentInsight[]>;
  getRecommendations: (domain: string, context?: Record<string, any>) => Promise<any[]>;

  // Statut
  canSendMessage: boolean;
  quotaPercentage: number;
  isQuotaLimited: boolean;
  currentDomains: string[];
}

export const useIntelligentAgent = (): UseIntelligentAgentReturn => {
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fonction pour faire les appels API avec gestion CSRF
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

    // ✅ NOUVEAU : Récupérer le token XSRF depuis les cookies
    const xsrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers as Record<string, string> || {}),
    };

    // ✅ NOUVEAU : Ajouter le token CSRF pour les requêtes POST/PUT/PATCH/DELETE
    if (xsrfToken && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
    }

    const response = await fetch(`${apiBaseUrl}/intelligent-agent/${endpoint}`, {
      headers,
      credentials: 'include', // Important pour Sanctum
      ...options,
    });

    // ✅ NOUVEAU : Gestion spécifique de l'erreur 419 (CSRF)
    if (response.status === 419) {
      console.warn('⚠️ [useIntelligentAgent] Token CSRF expiré - Tentative de récupération...');

      try {
        // Tenter de récupérer un nouveau token CSRF
        await fetch(`${apiBaseUrl}/sanctum/csrf-cookie`, {
          credentials: 'include'
        });

        // Retry la requête avec le nouveau token
        const newXsrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('XSRF-TOKEN='))
          ?.split('=')[1];

        if (newXsrfToken && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
          headers['X-XSRF-TOKEN'] = decodeURIComponent(newXsrfToken);
        }

        const retryResponse = await fetch(`${apiBaseUrl}/intelligent-agent/${endpoint}`, {
          headers,
          credentials: 'include',
          ...options,
        });

        if (!retryResponse.ok) {
          throw new Error(`API Error: ${retryResponse.status} ${retryResponse.statusText}`);
        }

        return retryResponse.json();

      } catch (csrfError) {
        console.error('❌ [useIntelligentAgent] Échec récupération CSRF:', csrfError);
        throw new Error(`CSRF Error: ${response.status} ${response.statusText}`);
      }
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Charger les statistiques de l'agent
  const loadAgentStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      console.log('🤖 Agent intelligent activé - Chargement...');

      const data = await apiCall('status');

      if (data.success && data.status === 'active') {
        // Agent existe et est actif
        setAgentStats({
          basic_info: {
            name: data.name || 'Agent PixelRise',
            tier: data.tier || 'free',
            status: 'active',
            created_at: data.created_at || new Date().toISOString(),
            last_active_at: data.last_interaction || new Date().toISOString(),
          },
          quota: {
            daily_limit: data.tier === 'free' ? 10 : 100,
            used_today: 0,
            remaining: data.tier === 'free' ? 10 : 100,
            reset_date: new Date().toISOString(),
          },
          performance: {
            total_interactions: data.stats?.total_interactions || 0,
            successful_recommendations: 0,
            average_satisfaction: 4.5,
            success_rate: 0.85,
          },
          capabilities: data.capabilities || {
            business: true,
            technical: true,
            analytics: true,
            personalization: true,
            support: true,
          },
          settings: {
            communication_tone: 'friendly',
            confidence_threshold: 0.7,
            auto_learning_enabled: true,
            proactive_suggestions: true,
          },
        });
      } else {
        // Pas d'agent configuré - créer un agent par défaut
        console.log('🤖 Création d\'un agent par défaut...');
        setAgentStats({
          basic_info: {
            name: 'Agent PixelRise',
            tier: 'free',
            status: 'active',
            created_at: new Date().toISOString(),
          },
          quota: {
            daily_limit: 10,
            used_today: 0,
            remaining: 10,
            reset_date: new Date().toISOString(),
          },
          performance: {
            total_interactions: 0,
            successful_recommendations: 0,
            average_satisfaction: 0,
            success_rate: 0,
          },
          capabilities: {
            business: true,
            technical: true,
            analytics: true,
            personalization: false,
            support: true,
          },
          settings: {
            communication_tone: 'friendly',
            confidence_threshold: 0.7,
            auto_learning_enabled: true,
            proactive_suggestions: true,
          },
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des stats de l\'agent:', err);
      setIsError(true);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');

      toast({
        title: 'Erreur',
        description: 'Impossible de charger les informations de l\'agent',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // Envoyer un message à l'agent universel (mode async avec polling)
  const sendMessage = useCallback(async (
    message: string,
    context: Record<string, any> = {}
  ): Promise<AgentInteractionResponse> => {
    try {
      // Étape 1: Lancer le job async
      const initialResponse = await apiCall('interact', {
        method: 'POST',
        body: JSON.stringify({
          message,
          context: {
            ...context,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        }),
      });

      // Si mode async, poller pour le résultat
      if (initialResponse.async && initialResponse.interaction_id) {
        toast({
          title: 'Traitement en cours...',
          description: 'L\'agent analyse votre demande',
        });

        // Polling avec timeout de 60s
        const maxAttempts = 60;
        let attempts = 0;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;

          const pollResponse = await apiCall(`poll/${initialResponse.interaction_id}`, {
            method: 'GET',
          });

          if (pollResponse.status === 'completed' && pollResponse.response) {
            await loadAgentStats();
            toast({
              title: 'Réponse reçue',
              description: 'L\'agent a traité votre demande avec succès',
            });
            return {
              success: true,
              ...pollResponse.response,
            };
          }

          if (pollResponse.status === 'error' || pollResponse.status === 'failed') {
            throw new Error(pollResponse.error || 'Erreur lors du traitement');
          }
        }

        throw new Error('Timeout: l\'agent met trop de temps à répondre');
      }

      // Mode synchrone (fallback)
      if (initialResponse.success) {
        await loadAgentStats();
        toast({
          title: 'Réponse reçue',
          description: 'L\'agent a traité votre demande avec succès',
        });
      } else if (initialResponse.quota_exceeded) {
        toast({
          title: 'Quota dépassé',
          description: initialResponse.message || 'Limite quotidienne atteinte',
          variant: 'destructive',
        });
      }

      return initialResponse;
    } catch (err) {
      const errorResponse: AgentInteractionResponse = {
        success: false,
        error: err instanceof Error ? err.message : 'Une erreur est survenue',
      };

      toast({
        title: 'Erreur de communication',
        description: 'Impossible de communiquer avec l\'agent',
        variant: 'destructive',
      });

      return errorResponse;
    }
  }, [apiCall, loadAgentStats, toast]);

  // Rafraîchir les données de l'agent
  const refreshAgent = useCallback(async () => {
    await loadAgentStats();
  }, [loadAgentStats]);

  // Upgrader l'agent
  const upgradeAgent = useCallback(async (targetTier: 'premium' | 'enterprise'): Promise<boolean> => {
    try {
      setIsLoading(true);

      const response = await apiCall('upgrade', {
        method: 'POST',
        body: JSON.stringify({ target_tier: targetTier }),
      });

      if (response.success) {
        await loadAgentStats();

        toast({
          title: 'Upgrade réussi',
          description: response.message || `Agent upgradé vers ${targetTier}`,
        });

        return true;
      } else {
        toast({
          title: 'Upgrade impossible',
          description: response.message || 'Conditions non remplies pour l\'upgrade',
          variant: 'destructive',
        });

        return false;
      }
    } catch (err) {
      toast({
        title: 'Erreur d\'upgrade',
        description: 'Impossible de upgrader l\'agent',
        variant: 'destructive',
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, loadAgentStats, toast]);

  // Mettre à jour les préférences
  const updatePreferences = useCallback(async (preferences: Record<string, any>): Promise<boolean> => {
    try {
      const response = await apiCall('preferences', {
        method: 'POST',
        body: JSON.stringify(preferences),
      });

      if (response.success) {
        await loadAgentStats();

        toast({
          title: 'Préférences mises à jour',
          description: 'Les paramètres de votre agent ont été sauvegardés',
        });

        return true;
      }

      return false;
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les préférences',
        variant: 'destructive',
      });

      return false;
    }
  }, [apiCall, loadAgentStats, toast]);

  // Charger les données au montage
  useEffect(() => {
    loadAgentStats();
  }, [loadAgentStats]);

  // Calculer les valeurs dérivées
  const canSendMessage = agentStats?.basic_info.status === 'active' &&
    (agentStats.quota.remaining > 0 || agentStats.quota.daily_limit === -1);

  const quotaPercentage = agentStats?.quota.daily_limit > 0
    ? (agentStats.quota.used_today / agentStats.quota.daily_limit) * 100
    : 0;

  const isQuotaLimited = agentStats?.basic_info.tier === 'free';
  const currentDomains = agentStats?.capabilities ? Object.keys(agentStats.capabilities).filter(key => agentStats.capabilities[key]) : [];

  // Obtenir des insights contextuels
  const getContextualInsights = useCallback(async (
    page: string,
    context: Record<string, any> = {}
  ): Promise<AgentInsight[]> => {
    try {
      const response = await apiCall('contextual-insights', {
        method: 'POST',
        body: JSON.stringify({ page, context }),
      });
      return response.insights || [];
    } catch (err) {
      console.error('Erreur chargement insights contextuels:', err);
      return [];
    }
  }, [apiCall]);

  // Obtenir des recommandations par domaine
  const getRecommendations = useCallback(async (
    domain: string,
    context: Record<string, any> = {}
  ): Promise<any[]> => {
    try {
      const response = await apiCall('domain-recommendations', {
        method: 'POST',
        body: JSON.stringify({ domain, context }),
      });
      return response.recommendations || [];
    } catch (err) {
      console.error('Erreur chargement recommandations:', err);
      return [];
    }
  }, [apiCall]);

  return {
    // État
    agentStats,
    isLoading,
    isError,
    error,

    // Actions
    sendMessage,
    refreshAgent,
    upgradeAgent,
    updatePreferences,
    getContextualInsights,
    getRecommendations,

    // Statut
    canSendMessage,
    quotaPercentage,
    isQuotaLimited,
    currentDomains,
  };
};

// Hook pour les insights de l'agent
interface AgentInsight {
  id: string;
  type: 'recommendation' | 'alert' | 'trend' | 'opportunity' | 'analysis';
  title: string;
  description: string;
  confidence: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  actionable?: boolean;
  timestamp: string;
}

interface UseAgentInsightsReturn {
  insights: AgentInsight[];
  isLoading: boolean;
  refreshInsights: () => Promise<void>;
  handleInsightAction: (insightId: string, action: 'like' | 'dislike' | 'dismiss' | 'implement') => Promise<boolean>;
}

export const useAgentInsights = (): UseAgentInsightsReturn => {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${apiBaseUrl}/intelligent-agent/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }, []);

  const loadInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiCall('insights');
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Erreur lors du chargement des insights:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les insights',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  const handleInsightAction = useCallback(async (
    insightId: string,
    action: 'like' | 'dislike' | 'dismiss' | 'implement'
  ): Promise<boolean> => {
    try {
      const response = await apiCall(`insights/${insightId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });

      if (response.success) {
        // Retirer l'insight de la liste si dismiss
        if (action === 'dismiss') {
          setInsights(prev => prev.filter(insight => insight.id !== insightId));
        }

        toast({
          title: 'Action enregistrée',
          description: 'Votre feedback a été pris en compte',
        });

        return true;
      }

      return false;
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer l\'action',
        variant: 'destructive',
      });

      return false;
    }
  }, [apiCall, toast]);

  const refreshInsights = useCallback(async () => {
    await loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  return {
    insights,
    isLoading,
    refreshInsights,
    handleInsightAction,
  };
};

// Hook pour la gestion des tâches planifiées
interface AgentTask {
  id: string;
  task_name: string;
  task_type: string;
  frequency: string;
  scheduled_time: string;
  status: string;
  next_run_at?: string;
  last_run_at?: string;
  success_rate: number;
}

export const useAgentTasks = () => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${apiBaseUrl}/intelligent-agent/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiCall('tasks');
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiCall]);

  const toggleTask = useCallback(async (taskId: string, action: 'pause' | 'resume') => {
    try {
      await apiCall(`tasks/${taskId}/${action}`, { method: 'POST' });
      await loadTasks();

      toast({
        title: action === 'pause' ? 'Tâche pausée' : 'Tâche reprise',
        description: 'Les modifications ont été sauvegardées',
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la tâche',
        variant: 'destructive',
      });
    }
  }, [apiCall, loadTasks, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    toggleTask,
    refreshTasks: loadTasks,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
//  🤖  ALERTES PROACTIVES
// ─────────────────────────────────────────────────────────────────────────────

export interface ProactiveAlert {
  id: string;
  type: 'checkin' | 'checkout' | 'pending' | 'overdue';
  level: 'info' | 'warning' | 'urgent';
  title: string;
  message: string;
  reservation_id: number;
  client: string;
  actions: { label: string; action: string; id: number }[];
}

export const useProactiveAlerts = () => {
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const res = await fetch('/api/intelligent-agent/proactive-alerts', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setAlerts(data.alerts || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000); // toutes les 5 min
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const executeAction = useCallback(async (action: string, reservationId: number): Promise<boolean> => {
    try {
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      const res = await fetch('/api/intelligent-agent/execute-action', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reservation_id: reservationId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAlerts(); // refresh
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [fetchAlerts]);

  const dismiss = useCallback((alertId: string) => {
    setDismissed(prev => new Set([...prev, alertId]));
  }, []);

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  return { alerts: visibleAlerts, executeAction, dismiss, refresh: fetchAlerts };
};