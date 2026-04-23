// src/hooks/useAuthUser.ts - VERSION DE REMPLACEMENT (BACKWARD COMPATIBILITY)

import { useAuth } from '@/hooks/useAuth';

/**
 * ✅ HOOK DE COMPATIBILITÉ
 * 
 * Ce hook remplace l'ancien useAuthUser en utilisant le contexte Auth étendu.
 * Il maintient la même interface pour éviter de casser le code existant.
 * 
 * @deprecated Utilisez directement useAuth() à la place
 */
export function useAuthUser() {
  const { user, loading } = useAuth();
  
  return { 
    user, 
    loading 
  };
}

// ✅ Export du type User pour la compatibilité
export type { User } from '@/contexts/AuthContext';