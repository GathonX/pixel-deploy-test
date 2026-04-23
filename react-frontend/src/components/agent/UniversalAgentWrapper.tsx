import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import GlobalAgentChat from './GlobalAgentChat';
import { AgentMemoryProvider } from '@/contexts/AgentMemoryContext';
import { useIntelligentAgent } from '@/hooks/useIntelligentAgent';
import agentNotificationService from '@/services/agentNotificationService';

interface UniversalAgentWrapperProps {
  children: React.ReactNode;
  userId: string;
}

interface PageContextMap {
  [key: string]: {
    name: string;
    domain: string;
    contextExtractor: (params: any, location: any) => Record<string, any>;
  };
}

// Configuration COMPLÈTE des pages avec leurs contextes
const PAGE_CONTEXTS: PageContextMap = {
  // ===== DASHBOARD & ANALYTICS =====
  '/dashboard': {
    name: 'dashboard',
    domain: 'analytics',
    contextExtractor: () => ({
      section: 'main_dashboard',
      widgets_active: true,
    }),
  },
  '/dashboard/embed': {
    name: 'dashboard-embed',
    domain: 'analytics',
    contextExtractor: () => ({
      section: 'embed_dashboard',
      mode: 'embedded',
    }),
  },
  '/dashboard/analytics': {
    name: 'analytics',
    domain: 'analytics',
    contextExtractor: () => ({
      section: 'analytics',
      view: 'overview',
    }),
  },
  '/dashboard/reservations': {
    name: 'reservations',
    domain: 'business',
    contextExtractor: () => ({
      section: 'reservations',
      feature: 'booking_system',
    }),
  },

  // ===== BUSINESS & PROJECTS =====
  '/sprint-view': {
    name: 'sprint-planning',
    domain: 'business',
    contextExtractor: () => ({
      section: 'sprint_planning',
      feature: 'agile_management',
    }),
  },

  // ===== BLOG & CONTENT =====
  '/dashboard/blog': {
    name: 'blog-management',
    domain: 'business',
    contextExtractor: () => ({
      section: 'blog_management',
      feature: 'content_creation',
    }),
  },
  '/dashboard/blog/create': {
    name: 'blog-create',
    domain: 'business',
    contextExtractor: () => ({
      section: 'blog_creation',
      mode: 'new_post',
    }),
  },
  '/dashboard/blog/edit/:id': {
    name: 'blog-edit',
    domain: 'business',
    contextExtractor: (params) => ({
      section: 'blog_editing',
      post_id: params.id,
    }),
  },
  '/dashboard/default-blog': {
    name: 'default-blog',
    domain: 'business',
    contextExtractor: () => ({
      section: 'default_blog',
      feature: 'automated_generation',
    }),
  },

  // ===== SOCIAL MEDIA =====
  '/dashboard/default-social': {
    name: 'social-media',
    domain: 'business',
    contextExtractor: () => ({
      section: 'social_media',
      feature: 'automation',
    }),
  },
  '/social-media/post/:id': {
    name: 'social-post-detail',
    domain: 'business',
    contextExtractor: (params) => ({
      section: 'social_post_detail',
      post_id: params.id,
    }),
  },
  '/social-media/post/:id/edit': {
    name: 'social-post-edit',
    domain: 'business',
    contextExtractor: (params) => ({
      section: 'social_post_editing',
      post_id: params.id,
    }),
  },

  // ===== FEATURES & PAYMENTS =====
  '/features': {
    name: 'features',
    domain: 'business',
    contextExtractor: () => ({
      section: 'features_marketplace',
      action: 'browse',
    }),
  },
  '/features/purchase/:featureId': {
    name: 'feature-purchase',
    domain: 'business',
    contextExtractor: (params) => ({
      section: 'feature_purchase',
      feature_id: params.featureId,
    }),
  },
  '/payment-confirmation': {
    name: 'payment-confirmation',
    domain: 'business',
    contextExtractor: () => ({
      section: 'payment_confirmation',
      status: 'completed',
    }),
  },
  '/dashboard/payment-history': {
    name: 'payment-history',
    domain: 'business',
    contextExtractor: () => ({
      section: 'payment_history',
      view: 'transactions',
    }),
  },
  '/features/history': {
    name: 'features-history',
    domain: 'business',
    contextExtractor: () => ({
      section: 'features_history',
      view: 'purchases',
    }),
  },

  // ===== USER MANAGEMENT =====
  '/profile': {
    name: 'profile',
    domain: 'personalization',
    contextExtractor: () => ({
      section: 'user_profile',
      editing: false,
    }),
  },
  '/profile/change-password': {
    name: 'change-password',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'password_change',
      security: 'account_security',
    }),
  },
  '/dashboard/settings': {
    name: 'settings',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'settings',
      tab: 'general',
    }),
  },

  // ===== SUPPORT & COMMUNICATION =====
  '/dashboard/tickets': {
    name: 'tickets',
    domain: 'support',
    contextExtractor: () => ({
      section: 'support_tickets',
      status: 'all',
    }),
  },
  '/tickets/:ticketId': {
    name: 'ticket-detail',
    domain: 'support',
    contextExtractor: (params) => ({
      section: 'ticket_detail',
      ticket_id: params.ticketId,
    }),
  },
  '/notifications': {
    name: 'notifications',
    domain: 'general',
    contextExtractor: () => ({
      section: 'notifications',
      type: 'all',
    }),
  },

  '/dashboard/assistants': {
    name: 'assistants',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'ai_assistants',
      feature: 'management',
    }),
  },

  // ===== TOKENS & RESOURCES =====
  '/dashboard/tokens': {
    name: 'tokens',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'api_tokens',
      management: 'access_control',
    }),
  },
  '/dashboard/thank-you': {
    name: 'thank-you',
    domain: 'general',
    contextExtractor: () => ({
      section: 'thank_you',
      status: 'onboarding_complete',
    }),
  },

  // ===== CALENDRIER & ACTUALITÉS =====
  '/calendar': {
    name: 'calendar',
    domain: 'general',
    contextExtractor: () => ({
      section: 'calendar',
      view: 'month',
    }),
  },
  '/blog-calendar': {
    name: 'blog-calendar',
    domain: 'business',
    contextExtractor: () => ({
      section: 'blog_calendar',
      feature: 'content_planning',
    }),
  },
  '/mon-actualite': {
    name: 'actualite',
    domain: 'general',
    contextExtractor: () => ({
      section: 'news_feed',
      personalized: true,
    }),
  },

  // ===== USER BLOGS =====
  '/user-blogs': {
    name: 'user-blogs-hub',
    domain: 'business',
    contextExtractor: () => ({
      section: 'user_blogs_hub',
      view: 'overview',
    }),
  },
  '/user-blogs/:slug': {
    name: 'user-blog-detail',
    domain: 'business',
    contextExtractor: (params) => ({
      section: 'user_blog_detail',
      blog_slug: params.slug,
    }),
  },

  // ===== ADMIN ROUTES =====
  '/admin/dashboard': {
    name: 'admin-dashboard',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'admin_dashboard',
      role: 'administrator',
    }),
  },
  '/admin/users': {
    name: 'admin-users',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'user_management',
      role: 'administrator',
    }),
  },
  '/admin/features': {
    name: 'admin-features',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'feature_management',
      role: 'administrator',
    }),
  },

  // ===== DEBUG =====
  '/debug/analytics': {
    name: 'debug-analytics',
    domain: 'technical',
    contextExtractor: () => ({
      section: 'debug_analytics',
      mode: 'development',
    }),
  },
};

export const UniversalAgentWrapper: React.FC<UniversalAgentWrapperProps> = ({
  children,
  userId,
}) => {
  const location = useLocation();
  const params = useParams();
  const { agentStats, getContextualInsights } = useIntelligentAgent();

  // État pour le contexte de page actuel
  const [currentPageContext, setCurrentPageContext] = useState<{
    page: string;
    domain: string;
    context: Record<string, any>;
  }>({
    page: 'unknown',
    domain: 'general',
    context: {},
  });

  // État pour les insights contextuels
  const [contextualInsights, setContextualInsights] = useState<any[]>([]);

  // Fonction pour déterminer le contexte de la page courante
  const determinePageContext = React.useCallback(() => {
    const pathname = location.pathname;

    // Trouver la configuration de page correspondante
    let matchedConfig = null;

    for (const [path, config] of Object.entries(PAGE_CONTEXTS)) {
      // Vérification exacte pour les routes simples
      if (path === pathname) {
        matchedConfig = config;
        break;
      }

      // Vérification avec paramètres pour les routes dynamiques
      const pathPattern = path.replace(/:[^/]+/g, '([^/]+)');
      const regex = new RegExp(`^${pathPattern}$`);

      if (regex.test(pathname)) {
        matchedConfig = config;
        break;
      }
    }

    if (matchedConfig) {
      const context = matchedConfig.contextExtractor(params, location);

      return {
        page: matchedConfig.name,
        domain: matchedConfig.domain,
        context: {
          ...context,
          pathname,
          search: location.search,
          params: params,
          // ✅ NOUVEAU : Extraction automatique des paramètres d'URL
          query_params: Object.fromEntries(new URLSearchParams(location.search)),
        },
      };
    }

    // ✅ AMÉLIORATION : Configuration par défaut avec détection de page basique
    const pageName = pathname.split('/').filter(Boolean).join('-') || 'home';

    return {
      page: pageName,
      domain: 'general',
      context: {
        pathname,
        search: location.search,
        params: params,
        query_params: Object.fromEntries(new URLSearchParams(location.search)),
        detected_page: pageName,
        fallback: true,
      },
    };
  }, [location.pathname, location.search, params]);

  // Charger les insights contextuels
  const loadContextualInsights = useCallback(async (page: string, context: Record<string, any>) => {
    try {
      const insights = await getContextualInsights(page, context);
      setContextualInsights(insights);

      // 🤖 NOUVEAU : Générer des notifications d'agent automatiques
      if (agentStats?.basic_info?.status === 'active') {
        // Générer des suggestions contextuelles
        await agentNotificationService.generateContextualSuggestions(page, context);

        // Exemple d'insight automatique basé sur le contexte
        if (insights.length > 0) {
          await agentNotificationService.createInsight({
            title: 'Nouvelles opportunités détectées',
            message: `J'ai identifié ${insights.length} opportunités d'amélioration sur cette page.`,
            insightType: 'opportunity',
            domain: 'business',
            metrics: { opportunities_count: insights.length },
            trendDirection: 'up',
            recommendation: 'Consultez les suggestions pour optimiser votre workflow.',
          });
        }
      }
    } catch (error) {
      console.error('Erreur chargement insights contextuels:', error);
      setContextualInsights([]);
    }
  }, [agentStats]); // Ajouter agentStats aux dépendances

  // Mettre à jour le contexte de page lors des changements de route
  useEffect(() => {
    const newContext = determinePageContext();
    setCurrentPageContext(newContext);

    // Charger les insights contextuels si l'agent est actif
    if (agentStats?.basic_info?.status === 'active') {
      loadContextualInsights(newContext.page, newContext.context);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, agentStats?.basic_info?.status]);

  // Fonction pour détecter l'inactivité et sauvegarder la session
  useEffect(() => {
    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // L'utilisateur est inactif depuis 10 minutes
        // Sauvegarder la session de l'agent dans le provider de mémoire
        console.log('Session agent sauvegardée après inactivité');
      }, 10 * 60 * 1000); // 10 minutes
    };

    // Événements à écouter pour détecter l'activité
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Initialiser le timer
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }, []);

  // Fonction pour enrichir le contexte avec des données supplémentaires
  const enrichContext = (baseContext: Record<string, any>): Record<string, any> => {
    return {
      ...baseContext,
      // Informations sur l'appareil et navigateur
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      user_agent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      // Informations sur la session
      session_start: sessionStorage.getItem('session_start') || new Date().toISOString(),
      page_visit_count: parseInt(sessionStorage.getItem('page_visit_count') || '0') + 1,

      // Agent stats si disponible
      agent_active: agentStats?.basic_info.status === 'active',
      agent_tier: agentStats?.basic_info.tier,

      // Insights disponibles
      contextual_insights_count: contextualInsights.length,
    };
  };

  // Mettre à jour le compteur de visites de pages
  useEffect(() => {
    const currentCount = parseInt(sessionStorage.getItem('page_visit_count') || '0');
    sessionStorage.setItem('page_visit_count', (currentCount + 1).toString());

    if (!sessionStorage.getItem('session_start')) {
      sessionStorage.setItem('session_start', new Date().toISOString());
    }
  }, [location.pathname]);

  // 🤖 NOUVEAU : Système de notifications périodiques
  useEffect(() => {
    if (agentStats?.basic_info?.status !== 'active') return;

    // Nettoyer les anciennes suggestions
    agentNotificationService.cleanupOldSuggestions();

    // Vérifications périodiques (toutes les 15 minutes)
    const periodicChecks = setInterval(async () => {
      const sessionStartTime = sessionStorage.getItem('session_start');
      if (sessionStartTime) {
        const sessionDuration = (new Date().getTime() - new Date(sessionStartTime).getTime()) / (1000 * 60);

        // Alerte de session longue (après 2 heures)
        if (sessionDuration > 120) {
          await agentNotificationService.createAlert({
            title: 'Session prolongée détectée',
            message: 'Vous travaillez depuis plus de 2 heures. Pensez à faire une pause !',
            alertType: 'system_issue',
            severity: 'low',
            resolutionSteps: ['Prenez une pause de 15 minutes', 'Hydratez-vous', 'Faites quelques étirements'],
          });
        }

        // Suggestion de productivité (après 30 minutes)
        if (sessionDuration > 30 && sessionDuration < 35) {
          await agentNotificationService.createSuggestion({
            title: 'Optimisation de productivité',
            message: 'Basé sur votre activité, je peux suggérer des raccourcis pour accélérer votre workflow.',
            suggestionType: 'workflow',
            currentPage: currentPageContext.page,
            context: currentPageContext.context,
            confidenceScore: 0.8,
            expectedImpact: 'medium',
          });
        }
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(periodicChecks);
  }, [agentStats, currentPageContext]);

  // Contexte enrichi pour le chat
  const enrichedContext = enrichContext(currentPageContext.context);

  return (
    <AgentMemoryProvider userId={userId}>
      {/* Contenu de l'application */}
      {children}

      {/* Interface de chat globale si l'agent existe */}
      {agentStats && (
        <GlobalAgentChat
          currentPage={currentPageContext.page}
          pageContext={enrichedContext}
          className="universal-agent-chat"
        />
      )}

      {/* Insights contextuels flottants (optionnel) */}
      {contextualInsights.length > 0 && (
        <div className="fixed top-20 right-6 z-40 max-w-sm">
          {/* Affichage discret des insights les plus importants */}
          {contextualInsights
            .filter(insight => insight.priority === 'high' || insight.priority === 'urgent')
            .slice(0, 2)
            .map((insight, index) => (
              <div
                key={insight.id || index}
                className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-sm animate-fade-in"
              >
                <p className="text-xs font-medium text-blue-800">{insight.title}</p>
                <p className="text-xs text-blue-600 mt-1">{insight.description?.slice(0, 80)}...</p>
              </div>
            ))
          }
        </div>
      )}

      {/* Indicateurs de contexte pour le développement (peut être supprimé en production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 left-2 z-50 bg-black bg-opacity-70 text-white text-xs p-2 rounded max-w-xs">
          <div>Page: {currentPageContext.page}</div>
          <div>Domain: {currentPageContext.domain}</div>
          <div>Context Keys: {Object.keys(enrichedContext).length}</div>
          <div>Agent: {agentStats?.basic_info.status || 'none'}</div>
          <div>Insights: {contextualInsights.length}</div>
        </div>
      )}

    </AgentMemoryProvider>
  );
};

export default UniversalAgentWrapper;