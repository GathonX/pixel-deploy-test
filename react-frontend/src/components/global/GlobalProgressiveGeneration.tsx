// src/components/global/GlobalProgressiveGeneration.tsx
// ✅ COMPOSANT GLOBAL POUR GÉNÉRATION PROGRESSIVE AVEC GESTION UTILISATEUR GRATUIT/PAYANT

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProgressiveGeneration } from '@/hooks/useProgressiveGeneration';

/**
 * ✅ COMPOSANT GLOBAL DE GÉNÉRATION PROGRESSIVE
 *
 * Ce composant :
 * - Se monte une seule fois au niveau de l'App
 * - Gère la génération progressive pour toutes les fonctionnalités
 * - Fonctionne indépendamment des pages visitées
 * - Persiste même lors de la navigation
 * - Gère la distinction utilisateur gratuit/payant
 */
const GlobalProgressiveGeneration = () => {
  const { user } = useAuth();
  const location = useLocation();

  // ✅ Déterminer la page actuelle pour contexte des notifications - COMPLET
  const getCurrentPage = () => {
    const pathname = location.pathname;

    // ===== PAGES SPÉCIFIQUES (ordre important) =====
    if (pathname === '/payment-confirmation') return 'payment-confirmation';
    if (pathname === '/dashboard/analytics') return 'analytics';
    if (pathname === '/dashboard/default-blog') return 'default-blog';
    if (pathname === '/dashboard/default-social') return 'social-media';
    if (pathname === '/dashboard/blog/create') return 'blog-create';
    if (pathname.startsWith('/dashboard/blog/edit/')) return 'blog-edit';
    if (pathname === '/dashboard/blog') return 'blog-management';
    if (pathname === '/dashboard/payment-history') return 'payment-history';
    if (pathname === '/dashboard/reservations') return 'reservations';
    if (pathname === '/dashboard/settings') return 'settings';
    if (pathname === '/dashboard/assistants') return 'assistants';
    if (pathname === '/dashboard/tickets') return 'tickets';
    if (pathname === '/dashboard/tokens') return 'tokens';
    if (pathname === '/dashboard/thank-you') return 'thank-you';
    if (pathname === '/dashboard/embed') return 'dashboard-embed';
    if (pathname === '/dashboard') return 'dashboard';

    // ===== FEATURES & PAYMENTS =====
    if (pathname === '/features') return 'features';
    if (pathname.startsWith('/features/purchase/')) return 'feature-purchase';
    if (pathname === '/features/history') return 'features-history';

    // ===== USER MANAGEMENT =====
    if (pathname === '/profile/change-password') return 'change-password';
    if (pathname === '/profile') return 'profile';

    // ===== SOCIAL MEDIA POSTS =====
    if (pathname.startsWith('/social-media/post/') && pathname.endsWith('/edit')) return 'social-post-edit';
    if (pathname.startsWith('/social-media/post/')) return 'social-post-detail';

    // ===== SUPPORT =====
    if (pathname.startsWith('/tickets/')) return 'ticket-detail';
    if (pathname === '/notifications') return 'notifications';

    // ===== CALENDARS & NEWS =====
    if (pathname === '/blog-calendar') return 'blog-calendar';
    if (pathname === '/calendar') return 'calendar';
    if (pathname === '/mon-actualite') return 'actualite';

    // ===== USER BLOGS =====
    if (pathname.startsWith('/user-blogs/') && pathname !== '/user-blogs') return 'user-blog-detail';
    if (pathname === '/user-blogs') return 'user-blogs-hub';

    // ===== SPRINT & BUSINESS =====
    if (pathname === '/sprint-view') return 'sprint-planning';

    // ===== ADMIN =====
    if (pathname.startsWith('/admin/')) {
      if (pathname === '/admin/dashboard') return 'admin-dashboard';
      if (pathname === '/admin/users') return 'admin-users';
      if (pathname === '/admin/features') return 'admin-features';
      return 'admin-general';
    }

    // ===== DEBUG =====
    if (pathname === '/debug/analytics') return 'debug-analytics';

    // ===== BLOG PUBLIC =====
    if (pathname.startsWith('/blog')) return 'public-blog';

    return 'general';
  };

  const currentPage = getCurrentPage();

  // ✅ Hook pour la génération progressive Blog
  const blogGeneration = useProgressiveGeneration({
    featureKey: 'blog',
    currentPage, // ✅ NOUVEAU : Contexte de page pour notifications
    onPostGenerated: () => {
      console.log('🎉 [GlobalProgressiveGeneration] Nouveau post blog généré globalement');
      // ✅ Émettre un événement global pour notifier les pages
      window.dispatchEvent(new CustomEvent('globalPostGenerated', {
        detail: {
          featureKey: 'blog',
          timestamp: new Date().toISOString()
        }
      }));
    },
    enabled: !!user
  });

  // ✅ Hook pour la génération progressive Social Media
  const socialGeneration = useProgressiveGeneration({
    featureKey: 'social_media',
    currentPage, // ✅ NOUVEAU : Contexte de page pour notifications
    onPostGenerated: () => {
      console.log('🎉 [GlobalProgressiveGeneration] Nouveau post social généré globalement');
      // ✅ Émettre un événement global pour notifier les pages
      window.dispatchEvent(new CustomEvent('globalPostGenerated', {
        detail: {
          featureKey: 'social_media',
          timestamp: new Date().toISOString()
        }
      }));
    },
    enabled: !!user
  });

  // ✅ Écouter les événements d'activation de fonctionnalités
  useEffect(() => {
    if (!user) return;

    const handleFeatureActivation = (event: CustomEvent) => {
      const { featureKey, firstPost } = event.detail;

      console.log(`🚀 [GlobalProgressiveGeneration] Activation détectée: ${featureKey}`, {
        user_id: user.id,
        feature_key: featureKey,
        first_post: firstPost
      });

      // ✅ Démarrer la génération progressive selon la fonctionnalité
      if (featureKey === 'blog' && firstPost) {
        console.log('🎯 [GlobalProgressiveGeneration] Démarrage génération blog globale');
        blogGeneration.startProgressiveGeneration();
      } else if (featureKey === 'social_media' && firstPost) {
        console.log('🎯 [GlobalProgressiveGeneration] Démarrage génération social globale');
        socialGeneration.startProgressiveGeneration();
      }
    };

    // ✅ Écouter l'événement d'activation
    window.addEventListener('featureActivated', handleFeatureActivation as EventListener);

    return () => {
      window.removeEventListener('featureActivated', handleFeatureActivation as EventListener);
    };
  }, [user, blogGeneration, socialGeneration]);

  // ✅ Debug : Afficher l'état de génération (en développement seulement)
  useEffect(() => {
    if (import.meta.env.VITE_APP_DEBUG === 'true') {
      console.log('🔍 [GlobalProgressiveGeneration] États:', {
        user: user?.name || 'Non connecté',
        user_id: user?.id,
        blogActive: blogGeneration.isActive,
        socialActive: socialGeneration.isActive,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, blogGeneration.isActive, socialGeneration.isActive]);

  // ✅ Ce composant ne rend rien visuellement
  return null;
};

export default GlobalProgressiveGeneration;