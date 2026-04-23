// src/providers/AuthProvider.tsx - PROVIDER ÉTENDU AVEC SYNCHRONISATION PROFIL

import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext, User } from '@/contexts/AuthContext';
import api, { initializeCsrfToken, setActiveWorkspaceId } from '@/services/api';
import type { AxiosError } from 'axios';
import { getUniformAvatarUrl } from '@/hooks/useProfileListener'; // ✅ IMPORT UNIFORME

// ✅ INTERFACES TYPESCRIPT STRICTES (corrigées avec website)
interface BackendUser {
  id: number;
  name: string;
  email: string;
  is_admin?: boolean;
  is_premium?: boolean;
  avatar?: string | null;
  email_verified_at?: string | null;
  bio?: string;
  phone?: string;
  address?: string;
  website?: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
  // ✅ Rôle workspace retourné par le backend au login
  workspace_role?: 'owner' | 'admin' | 'member' | 'client' | null;
  workspace_site_id?: string | null;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// ✅ CORRECTION: Interface pour la réponse login Laravel
interface LoginResponse {
  message: string;
  user: BackendUser;
  authenticated: boolean;
  session_id?: string | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ FONCTION UTILITAIRE : Normaliser utilisateur backend vers frontend (CORRIGÉE)
  const normalizeUser = useCallback((userData: BackendUser): User => {
    // ✅ CORRECTION : Utiliser is_premium du backend au lieu de le hardcoder
    // Premium = a acheté au moins une fonctionnalité approuvée par admin
    // Gratuit = aucune fonctionnalité achetée
    const isPremium = userData.is_premium ?? false;

    return {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.is_admin ? 'admin' : 'user',
      avatar: userData.avatar ?? null,
      email_verified_at: userData.email_verified_at ?? null,
      isPremium: isPremium,
      subscription: {
        plan: isPremium ? 'premium' : 'free',
        status: isPremium ? 'active' : 'inactive',
        features: []
      },
      bio: userData.bio,
      phone: userData.phone,
      address: userData.address,
      website: userData.website,
      language: userData.language || 'french',
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: userData.updated_at || new Date().toISOString(),
      // ✅ Rôle workspace pour la redirection post-login
      workspace_role: userData.workspace_role ?? null,
      workspace_site_id: userData.workspace_site_id ?? null,
    };
  }, []);

  // ✅ FONCTION AVATAR UNIFORME : Utilise la fonction centralisée
  const getAvatarUrl = useCallback((avatarPath?: string | null): string => {
    return getUniformAvatarUrl(avatarPath);
  }, []);

  // ✅ NOUVEAU : Fonction pour mettre à jour le profil utilisateur localement
  const updateUserProfile = useCallback((updatedFields: Partial<User>) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        ...updatedFields,
        updated_at: new Date().toISOString()
      };
      setUser(updatedUser);
      
      // ✅ Émettre un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: updatedUser
      }));
      
      console.log('✅ [AuthProvider] Profil mis à jour:', updatedFields);
    }
  }, [user]);

  // ✅ NOUVEAU : Fonction pour synchroniser le profil dans toute l'app
  const syncProfileAcrossApp = useCallback(() => {
    if (user) {
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: user
      }));
      console.log('🔄 [AuthProvider] Synchronisation profil déclenchée');
    }
  }, [user]);

  // ✅ FONCTION SÉCURISÉE : Vérifier session existante UNIQUEMENT
  const checkExistingSession = useCallback(async (): Promise<void> => {
    try {
      console.log('🔍 [AuthProvider] Vérification session existante...');
      
      const res = await api.get<BackendUser>('/user');
      const userData = res.data;
      
      const normalizedUser = normalizeUser(userData);
      
      setUser(normalizedUser);
      console.log('✅ [AuthProvider] Session existante trouvée:', userData.name);
      
      // ✅ NOUVEAU : Déclencher la synchronisation après chargement initial
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: normalizedUser
        }));
      }, 100);
      
    } catch (error) {
      const err = error as AxiosError;
      const status = err.response?.status;
      
      if (status === 401) {
        console.log('ℹ️ [AuthProvider] Aucune session active (401) - Normal');
        setUser(null);
      } else {
        console.warn('⚠️ [AuthProvider] Erreur vérification session:', error);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [normalizeUser]);

  // Re-check session when tab becomes visible (after laptop wakes from sleep)
  // Throttled to once per 5 minutes to avoid spamming the API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const key = 'pr_session_check_at';
        const last = Number(sessionStorage.getItem(key) || 0);
        if (Date.now() - last > 5 * 60 * 1000) {
          sessionStorage.setItem(key, String(Date.now()));
          checkExistingSession();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkExistingSession]);

  // Handle 401 from any API call (session expired mid-navigation)
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn('⚠️ [AuthProvider] Session expirée détectée (401) - Déconnexion');
      setUser(null);
    };
    window.addEventListener('pixelrise:session-expired', handleSessionExpired);
    return () => window.removeEventListener('pixelrise:session-expired', handleSessionExpired);
  }, []);

  // ✅ INITIALISATION SÉCURISÉE (inchangée)
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        console.log('🚀 [AuthProvider] Initialisation provider sécurisé...');
        
        await initializeCsrfToken();
        await checkExistingSession();
        
        console.log('✅ [AuthProvider] Initialisation terminée - Workflow sécurisé');
        
      } catch (error) {
        console.warn('⚠️ [AuthProvider] Erreur initialisation:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [checkExistingSession]);

  // ✅ FONCTION LOGIN CORRIGÉE - Format réponse Laravel
  const login = useCallback(async (email: string, password: string, remember = false): Promise<User> => {
    try {
      setLoading(true);
      console.log('🔐 [AuthProvider] Tentative de login manuel...');
      
      await initializeCsrfToken();
      

      // Dans la méthode login(), juste avant l'appel API
console.log('🔧 [DEBUG] URL complète appelée:', api.defaults.baseURL + '/login');

const loginResponse = await api.post<LoginResponse>('/login', { 
  email, 
  password, 
  remember 
});

// Juste après l'appel
console.log('🔧 [DEBUG] URL réelle de la réponse:', loginResponse.config?.url);
console.log('🔧 [DEBUG] Status réponse:', loginResponse.status);
      

      console.log('🔐 [AuthProvider] Login API réussi');
      console.log('🔍 [AuthProvider] Réponse login:', loginResponse.data);
      
      // ✅ CORRECTION: Récupérer userData directement depuis la réponse
      const userData = loginResponse.data.user;
      
      if (!userData || !userData.id) {
        console.error('❌ [AuthProvider] Structure réponse invalide:', loginResponse.data);
        throw new Error('Données utilisateur manquantes dans la réponse login');
      }
      
      const normalizedUser = normalizeUser(userData);
      
      setUser(normalizedUser);
      console.log('✅ [AuthProvider] Login manuel réussi:', userData.name);
      
      // ✅ NOUVEAU : Synchroniser le profil après login
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('userProfileUpdated', {
          detail: normalizedUser
        }));
      }, 100);
      
      return normalizedUser;
      
    } catch (error) {
      console.error('❌ [AuthProvider] Erreur login:', error);
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [normalizeUser]);

  // ✅ FONCTION LOGOUT (inchangée)
  const logout = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🚪 [AuthProvider] Logout en cours...');
      
      await api.post('/logout');
      
      console.log('✅ [AuthProvider] Logout côté serveur réussi');
      
    } catch (error) {
      console.warn('⚠️ [AuthProvider] Erreur logout côté serveur:', error);
    } finally {
      setUser(null);
      setLoading(false);

      localStorage.removeItem('auth_token');
      setActiveWorkspaceId(null); // Effacer le workspace actif pour éviter interférence entre comptes

      console.log('✅ [AuthProvider] Nettoyage local terminé');

      window.location.href = '/';
    }
  }, []);

  // ✅ FONCTION UTILITAIRE : Rafraîchir l'utilisateur (étendue)
  const refreshUser = useCallback(async (): Promise<void> => {
    console.log('🔄 [AuthProvider] Rafraîchissement utilisateur...');
    await checkExistingSession();
    // ✅ Déclencher la synchronisation après rafraîchissement
    syncProfileAcrossApp();
  }, [checkExistingSession, syncProfileAcrossApp]);

  // ✅ FONCTION UTILITAIRE : Vérifier statut (inchangée)
  const refreshStatus = useCallback(async (): Promise<void> => {
    if (!user) {
      console.log('ℹ️ [AuthProvider] Pas d\'utilisateur pour refresh status');
      return;
    }
    
    try {
      console.log('🔄 [AuthProvider] Rafraîchissement statut...');
      
    } catch (error) {
      console.warn('⚠️ [AuthProvider] Erreur refresh status:', error);
    }
  }, [user]);

  // ✅ VALEUR DU CONTEXTE ÉTENDUE
  const value = {
    // Authentification (existant)
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refreshUser,
    refreshStatus,
    
    // ✅ NOUVEAU : Profil et synchronisation
    updateUserProfile,
    getAvatarUrl,
    syncProfileAcrossApp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};