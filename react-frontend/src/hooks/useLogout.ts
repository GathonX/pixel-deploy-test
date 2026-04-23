// src/hooks/useLogout.ts - VERSION SÉCURISÉE (SANCTUM SESSIONS)

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useLogout = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { logout: authLogout } = useAuth();

  /**
   * ✅ DÉCONNEXION SÉCURISÉE avec sessions Sanctum
   * @param onSuccess Callback exécuté après déconnexion réussie
   */
  const logout = async (onSuccess?: () => void) => {
    if (isLoading) return; // Éviter les double-clics
    
    setIsLoading(true);
    
    try {
      console.log('🚪 [useLogout] Début déconnexion sécurisée...');
      
      // ✅ SÉCURITÉ : Utiliser la fonction logout du AuthProvider
      await authLogout();
      
      console.log('✅ [useLogout] Déconnexion réussie');
      
      // ✅ SUCCESS : Toast de confirmation
      toast.success('Déconnexion réussie', {
        description: 'Vous avez été déconnecté avec succès.',
        duration: 2000,
      });

      // ✅ CALLBACK : Exécuter après le toast
      if (onSuccess) {
        setTimeout(onSuccess, 500); // Délai réduit
      }
      
    } catch (error) {
      console.error('❌ [useLogout] Erreur déconnexion:', error);
      
      // ✅ GESTION D'ERREUR : Toast d'erreur
      toast.error('Erreur de déconnexion', {
        description: 'Un problème est survenu, mais vous êtes déconnecté localement.',
        duration: 3000,
      });
      
      // ✅ SÉCURITÉ : Même en cas d'erreur, exécuter le callback
      // (car la déconnexion locale a eu lieu dans AuthProvider)
      if (onSuccess) {
        setTimeout(onSuccess, 500);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return { logout, isLoading };
};