// src/hooks/useUserTypeNotifications.ts
// ✅ HOOK POUR GESTION NOTIFICATIONS UTILISATEUR GRATUIT/PAYANT

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NotificationOptions {
  featureKey?: string;
  currentPage?: string;
  persistent?: boolean;
  showBanner?: boolean;
  showToast?: boolean;
  showSystemNotification?: boolean;
  customMessage?: string;
}

interface UserNotification {
  id: string;
  type: 'free_user_limitation' | 'feature_not_purchased' | 'upgrade_suggestion';
  title: string;
  description: string;
  featureKey?: string;
  currentPage?: string;
  persistent: boolean;
  timestamp: Date;
}

export const useUserTypeNotifications = () => {
  const { user } = useAuth();
  const [activeBanners, setActiveBanners] = useState<UserNotification[]>([]);

  /**
   * ✅ NOTIFICATION POUR UTILISATEUR GRATUIT SANS FONCTIONNALITÉS
   */
  const notifyFreeUserLimitation = useCallback((options: NotificationOptions = {}) => {
    const {
      featureKey,
      currentPage,
      persistent = false,
      showBanner = true,
      showToast = true,
      showSystemNotification = false,
      customMessage
    } = options;

    const title = '💎 Fonctionnalité Premium';
    const description = customMessage ||
      `La génération automatique ${featureKey ? `de ${featureKey}` : ''} est réservée aux clients avec des fonctionnalités payantes.`;

    // ✅ 1. Toast (toujours affiché, léger)
    if (showToast) {
      toast.info(title, {
        description: description,
        duration: 8000,
        action: {
          label: "Voir offres",
          onClick: () => {
            window.location.href = '/features';
          }
        }
      });
    }

    // ✅ 2. Banner persistant (optionnel, plus visible)
    if (showBanner) {
      const bannerId = `free_limitation_${featureKey || 'general'}_${Date.now()}`;

      const notification: UserNotification = {
        id: bannerId,
        type: 'free_user_limitation',
        title,
        description,
        featureKey,
        currentPage,
        persistent,
        timestamp: new Date()
      };

      setActiveBanners(prev => [...prev, notification]);

      // Auto-remove non-persistent banners after 15 seconds
      if (!persistent) {
        setTimeout(() => {
          setActiveBanners(prev => prev.filter(banner => banner.id !== bannerId));
        }, 15000);
      }
    }

    // ✅ 3. Notification système navigateur (optionnel, très visible)
    if (showSystemNotification && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body: description,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `pixelrise-${featureKey || 'general'}`,
            requireInteraction: true
          });
        }
      });
    }

    console.log('🚫 [USER_NOTIFICATION] Utilisateur gratuit notifié', {
      user_id: user?.id,
      feature_key: featureKey,
      current_page: currentPage,
      notification_types: {
        toast: showToast,
        banner: showBanner,
        system: showSystemNotification
      }
    });

  }, [user]);

  /**
   * ✅ NOTIFICATION POUR UTILISATEUR PAYANT SANS FONCTIONNALITÉ SPÉCIFIQUE
   */
  const notifyFeatureNotPurchased = useCallback((options: NotificationOptions = {}) => {
    const {
      featureKey,
      currentPage,
      persistent = false,
      showBanner = true,
      showToast = true,
      customMessage
    } = options;

    const title = '🛒 Fonctionnalité non achetée';
    const description = customMessage ||
      `Vous devez acheter la fonctionnalité "${featureKey}" pour y accéder pleinement.`;

    // ✅ Toast avec action d'achat
    if (showToast) {
      toast.warning(title, {
        description: description,
        duration: 8000,
        action: {
          label: `Acheter ${featureKey}`,
          onClick: () => {
            window.location.href = `/features?focus=${featureKey}`;
          }
        }
      });
    }

    // ✅ Banner spécifique
    if (showBanner) {
      const bannerId = `feature_purchase_${featureKey}_${Date.now()}`;

      const notification: UserNotification = {
        id: bannerId,
        type: 'feature_not_purchased',
        title,
        description,
        featureKey,
        currentPage,
        persistent,
        timestamp: new Date()
      };

      setActiveBanners(prev => [...prev, notification]);

      if (!persistent) {
        setTimeout(() => {
          setActiveBanners(prev => prev.filter(banner => banner.id !== bannerId));
        }, 20000); // Un peu plus long pour les achats
      }
    }

    console.log('🛒 [USER_NOTIFICATION] Utilisateur payant sans fonctionnalité notifié', {
      user_id: user?.id,
      feature_key: featureKey,
      current_page: currentPage
    });

  }, [user]);

  /**
   * ✅ SUGGESTION D'UPGRADE GÉNÉRAL
   */
  const notifyUpgradeSuggestion = useCallback((options: NotificationOptions = {}) => {
    const {
      currentPage,
      persistent = false,
      showBanner = true,
      showToast = false, // Plus discret pour les suggestions
      customMessage
    } = options;

    const title = '⭐ Améliorez votre expérience';
    const description = customMessage ||
      'Débloquez toutes les fonctionnalités avec un plan premium.';

    if (showToast) {
      toast.success(title, {
        description: description,
        duration: 6000,
        action: {
          label: "Voir plans",
          onClick: () => {
            window.location.href = '/features';
          }
        }
      });
    }

    if (showBanner) {
      const bannerId = `upgrade_suggestion_${currentPage}_${Date.now()}`;

      const notification: UserNotification = {
        id: bannerId,
        type: 'upgrade_suggestion',
        title,
        description,
        currentPage,
        persistent,
        timestamp: new Date()
      };

      setActiveBanners(prev => [...prev, notification]);

      if (!persistent) {
        setTimeout(() => {
          setActiveBanners(prev => prev.filter(banner => banner.id !== bannerId));
        }, 30000); // Plus long pour les suggestions
      }
    }

  }, []);

  /**
   * ✅ FERMER UN BANNER SPÉCIFIQUE
   */
  const dismissBanner = useCallback((bannerId: string) => {
    setActiveBanners(prev => prev.filter(banner => banner.id !== bannerId));
  }, []);

  /**
   * ✅ FERMER TOUS LES BANNERS
   */
  const dismissAllBanners = useCallback(() => {
    setActiveBanners([]);
  }, []);

  /**
   * ✅ OBTENIR LES SUGGESTIONS CONTEXTUELLES SELON LA PAGE
   */
  const getPageContextualSuggestions = useCallback((currentPage: string) => {
    const suggestions: Record<string, string[]> = {
      'dashboard': [
        'Consultez vos métriques en temps réel',
        'Activez la génération automatique de contenu',
        'Configurez vos notifications'
      ],
      'blog': [
        'Générez des articles automatiquement',
        'Programmez vos publications',
        'Optimisez votre SEO'
      ],
      'social-media': [
        'Automatisez vos posts sociaux',
        'Planifiez votre contenu sur plusieurs plateformes',
        'Analysez vos performances'
      ],
      'analytics': [
        'Accédez aux analytics avancés',
        'Créez des tableaux de bord personnalisés',
        'Configurez des alertes automatiques'
      ],
      'calendar': [
        'Synchronisez avec vos outils externes',
        'Programmez des événements récurrents',
        'Recevez des rappels intelligents'
      ],
      'projects': [
        'Gestion de projets avancée',
        'Collaboration en équipe',
        'Suivi automatique du temps'
      ]
    };

    return suggestions[currentPage] || [
      'Débloquez toutes les fonctionnalités',
      'Boostez votre productivité',
      'Accédez au support prioritaire'
    ];
  }, []);

  return {
    // Notifications
    notifyFreeUserLimitation,
    notifyFeatureNotPurchased,
    notifyUpgradeSuggestion,

    // Gestion des banners
    activeBanners,
    dismissBanner,
    dismissAllBanners,

    // Utilitaires
    getPageContextualSuggestions
  };
};

export default useUserTypeNotifications;