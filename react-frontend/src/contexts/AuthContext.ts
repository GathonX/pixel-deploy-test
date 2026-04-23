// src/contexts/AuthContext.ts - VERSION ÉTENDUE AVEC SYNCHRONISATION PROFIL

import { createContext } from 'react';

// ✅ INTERFACE SUBSCRIPTION INCHANGÉE
export interface SubscriptionInfo {
  plan?: string;
  status?: 'active' | 'inactive' | 'expired';
  expires_at?: string;
  features?: string[];
}

// ✅ INTERFACE UTILISATEUR UNIFIÉE (compatible avec userService)
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string | null;
  email_verified_at: string | null;
  isPremium: boolean;
  subscription: SubscriptionInfo;
  // ✅ CHAMPS DE PROFIL (compatibles avec userService)
  // ✅ CHAMPS DE PROFIL (compatibles avec userService)
bio?: string;
phone?: string;
address?: string;
website?: string;  // ✅ AJOUTER CETTE LIGNE
language?: string;

  created_at: string; // ✅ OBLIGATOIRE comme dans userService
  updated_at: string; // ✅ OBLIGATOIRE comme dans userService
  // ✅ Rôle workspace (null = propriétaire ou indépendant)
  workspace_role?: 'owner' | 'admin' | 'member' | 'client' | null;
  workspace_site_id?: string | null;
  // ✅ STATISTIQUES SOCIALES
  articles_count?: number;
  followers_count?: number;
  following_count?: number;
  total_likes?: number;
  total_views?: number;
  total_comments?: number;
}

// ✅ INTERFACE CONTEXTE D'AUTHENTIFICATION ÉTENDUE
export interface AuthContextType {
  // Authentification (existant)
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  
  // ✅ NOUVEAU : Gestion du profil et synchronisation
  updateUserProfile: (updatedFields: Partial<User>) => void;
  getAvatarUrl: (avatarPath?: string) => string;
  syncProfileAcrossApp: () => void;
}

// ✅ VALEUR PAR DÉFAUT DU CONTEXTE ÉTENDUE
const defaultValue: AuthContextType = {
  // Authentification (existant)
  user: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {
    throw new Error('AuthProvider non initialisé');
  },
  logout: async () => {
    throw new Error('AuthProvider non initialisé');
  },
  refreshUser: async () => {
    throw new Error('AuthProvider non initialisé');
  },
  refreshStatus: async () => {
    throw new Error('AuthProvider non initialisé');
  },
  
  // ✅ NOUVEAU : Profil et synchronisation
  updateUserProfile: () => {
    throw new Error('AuthProvider non initialisé');
  },
  getAvatarUrl: () => {
    throw new Error('AuthProvider non initialisé');
  },
  syncProfileAcrossApp: () => {
    throw new Error('AuthProvider non initialisé');
  },
};

// ✅ CRÉATION DU CONTEXTE
export const AuthContext = createContext<AuthContextType>(defaultValue);