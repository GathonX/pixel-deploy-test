// src/hooks/useAdminRedirect.ts - REDIRECTION AUTOMATIQUE ADMIN

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';

// ✅ Mapping des pages utilisateur vers admin correspondantes
const USER_TO_ADMIN_ROUTES: Record<string, string> = {
  '/dashboard': '/admin/dashboard',
  '/dashboard/features': '/admin/features',
  '/features': '/admin/features',
  '/dashboard/users': '/admin/users',
  '/dashboard/tickets': '/admin/tickets',
  '/dashboard/analytics': '/admin/finance/revenue',
  '/dashboard/settings': '/admin/dashboard',
  '/dashboard/blog': '/admin/blog-posts',
  '/profile': '/admin/dashboard',
};

// ✅ Pages utilisateur qui nécessitent une redirection admin
const USER_ONLY_ROUTES = [
  '/dashboard',
  '/dashboard/features',
  '/features',
  '/dashboard/analytics',
  '/dashboard/blog',
  '/profile',
];

export const useAdminRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Attendre que l'authentification soit chargée
    if (loading || !isAuthenticated || !user) {
      return;
    }

    // Vérifier si l'utilisateur est admin
    const isAdmin = user.role === 'admin';
    const currentPath = location.pathname;

    if (isAdmin) {
      // Vérifier si l'admin est sur une page utilisateur
      const isOnUserRoute = USER_ONLY_ROUTES.some(route =>
        currentPath === route || currentPath.startsWith(route + '/')
      );

      if (isOnUserRoute) {
        // Trouver la page admin correspondante
        const adminRoute = USER_TO_ADMIN_ROUTES[currentPath] || '/admin/dashboard';

        console.log('🔄 [AdminRedirect] Admin détecté sur page utilisateur:', {
          currentPath,
          adminRoute,
          userName: user.name,
          userRole: user.role
        });

        // Redirection automatique vers la page admin
        console.log(`🎯 [AdminRedirect] Redirection automatique vers: ${adminRoute}`);

        // Utiliser replace pour éviter de polluer l'historique
        window.location.replace(adminRoute);
      }
    }
  }, [user, isAuthenticated, loading, location.pathname]);

  return {
    isAdmin: user?.role === 'admin',
    currentPath: location.pathname,
  };
};