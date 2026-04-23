// src/services/api.ts - CONFIGURATION CORRIGÉE PORTS

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Ajouter un token d'authentification par défaut pour le développement
const token = localStorage.getItem('sanctum_token') || 'votre_token_sanctum_ici';
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// ✅ TYPES TYPESCRIPT STRICTS
interface ApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
  headers: Record<string, string>;
}

interface CSRFResponse {
  success: boolean;
  message?: string;
}

interface AuthCheckResponse {
  authenticated: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

// ✅ FONCTION CORRIGÉE : URLs avec ports corrects
const getBackendUrl = (): string => {
  // ✅ CRITIQUE : Backend Laravel DOIT être sur port 8000
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const buildApiUrl = (): string => {
  // ✅ CORRECTION FINALE: Utiliser VITE_API_BASE_URL qui contient déjà /api
  // Évite le double /api/api causé par l'optimisation Vite
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
};

// ✅ FONCTION CORRIGÉE : URL CSRF - HARDCODÉE car Vite optimise trop agressivement
const buildCsrfUrl = (): string => {
  // ✅ CORRECTION FINALE: Hardcoder pour production, éviter l'optimisation Vite
  // Vite remplace toutes les variables d'env AVANT d'appliquer .replace()
  const isDev = window.location.hostname === 'localhost';
  if (isDev) {
    return 'http://localhost:8000/sanctum/csrf-cookie';
  }
  return 'https://app.pixel-rise.com/sanctum/csrf-cookie';
};

// ✅ CONFIGURATION API PRINCIPALE
const apiConfig: ApiConfig = {
  baseURL: buildApiUrl(), // http://localhost:8000/api
  timeout: 300000, // 5 minutes pour génération admin (7 posts + OpenAI + images)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
};

// ✅ INSTANCE AXIOS PRINCIPALE
const api: AxiosInstance = axios.create(apiConfig);

// ✅ STATE GLOBAL POUR ÉVITER LES BOUCLES
let csrfInitialized = false;
let csrfInitializing = false;

// ✅ FONCTION CORRIGÉE : Initialisation CSRF avec URL correcte
export const initializeCsrfToken = async (): Promise<void> => {
  if (csrfInitialized) {
    console.log('✅ [API] Token CSRF déjà initialisé');
    return;
  }

  if (csrfInitializing) {
    console.log('⏳ [API] Token CSRF en cours d\'initialisation...');
    while (csrfInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  try {
    csrfInitializing = true;

    // ✅ CRITIQUE : URL CSRF CORRIGÉE - Port 8000 backend
    const csrfUrl = buildCsrfUrl(); // http://localhost:8000/sanctum/csrf-cookie

    console.log('🔄 [API] Initialisation token CSRF...');
    console.log('🌐 [API] URL CSRF (corrigée):', csrfUrl);
    console.log('🌐 [API] URL API Base:', buildApiUrl());

    // ✅ Vérifier les cookies AVANT
    console.log('🍪 [API] Cookies AVANT CSRF:', document.cookie);

    const response = await axios.get(csrfUrl, {
      withCredentials: true,
      timeout: 10000
    });

    console.log('📨 [API] Réponse CSRF:', response.status);

    // ✅ Vérifier les cookies APRÈS
    console.log('🍪 [API] Cookies APRÈS CSRF:', document.cookie);

    // ✅ Vérifier le token XSRF spécifiquement
    const xsrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];

    if (xsrfToken) {
      console.log('🔑 [API] Token XSRF récupéré avec succès');
      csrfInitialized = true;
    } else {
      console.warn('⚠️ [API] Token XSRF non trouvé dans les cookies');
    }

  } catch (error) {
    const err = error as AxiosError;
    console.warn('⚠️ [API] CSRF non disponible (404) - Continuation sans CSRF:', {
      status: err.response?.status,
      message: err.message,
      url: buildCsrfUrl(),
    });

    // Ne pas lancer d'erreur pour CSRF 404 - continuer sans
    if (err.response?.status === 404) {
      console.log('ℹ️ [API] API fonctionne sans CSRF - Routes Sanctum non configurées');
      csrfInitialized = true; // Marquer comme "initialisé" pour éviter les re-tentatives
    } else {
      throw error;
    }
  } finally {
    csrfInitializing = false;
  }
};

// ─── Workspace selection (multi-workspace support) ────────────────────────────
const WS_KEY = 'active_workspace_id';

export const getActiveWorkspaceId = (): string | null =>
  localStorage.getItem(WS_KEY);

export const setActiveWorkspaceId = (id: string | null): void => {
  if (id) localStorage.setItem(WS_KEY, id);
  else localStorage.removeItem(WS_KEY);
};

// ✅ INTERCEPTEUR REQUEST : Injection token CSRF + Workspace-Id
api.interceptors.request.use(
  (config) => {
    // Récupérer le token XSRF depuis les cookies
    const xsrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];

    if (xsrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
      console.log('🔑 [API] Token CSRF injecté pour:', config.method, config.url);
    }

    // Injecter le workspace sélectionné si pas déjà défini par l'appelant
    if (!config.headers['X-Workspace-Id']) {
      const wsId = getActiveWorkspaceId();
      if (wsId) {
        config.headers['X-Workspace-Id'] = wsId;
      }
    }

    console.log('📤 [API] Requête:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ [API] Erreur intercepteur request:', error);
    return Promise.reject(error);
  }
);

// ✅ INTERCEPTEUR RESPONSE : Gestion erreurs
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 [API] Réponse réussie:', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error('❌ [API] Erreur réponse:', {
      status,
      url,
      message: error.message,
    });

    // Gestion spécifique des erreurs CSRF
    if (status === 419) {
      console.warn('⚠️ [API] Token CSRF expiré - Réinitialisation...');
      csrfInitialized = false;
    }

    // Gestion erreurs d'authentification
    if (status === 401) {
      if (url?.endsWith('/user')) {
        // Expected 401 at startup when not logged in — not a session expiry
        console.log('ℹ️ [API] Utilisateur non authentifié (normal)');
      } else {
        // Session expired during navigation → notify AuthProvider
        window.dispatchEvent(new CustomEvent('pixelrise:session-expired'));
      }
    }

    return Promise.reject(error);
  }
);

// ✅ FONCTION UTILITAIRE : Test connectivité backend
export const testBackendConnectivity = async (): Promise<boolean> => {
  try {
    const backendUrl = getBackendUrl();
    console.log('🔍 [API] Test connectivité backend:', backendUrl);

    const response = await axios.get(backendUrl, {
      timeout: 5000,
      withCredentials: true
    });

    console.log('✅ [API] Backend accessible:', response.status);
    return true;
  } catch (error) {
    const err = error as AxiosError;
    console.error('❌ [API] Backend inaccessible:', {
      message: err.message,
      url: getBackendUrl(),
    });
    return false;
  }
};

// ✅ FONCTION UTILITAIRE : Vérification configuration
export const debugApiConfiguration = (): void => {
  console.log('🔧 [API] Configuration Debug:', {
    'Frontend URL': window.location.origin,
    'Backend URL': getBackendUrl(),
    'API Base URL': buildApiUrl(),
    'CSRF URL': buildCsrfUrl(),
    'VITE_API_URL': import.meta.env.VITE_API_URL,
    'With Credentials': apiConfig.withCredentials,
    'Cookies': document.cookie,
  });
};

// ✅ INSTANCE API POUR OPÉRATIONS LONGUES (ex: génération de sprints)
export const longOperationApi: AxiosInstance = axios.create({
  ...apiConfig,
  timeout: 120000, // 2 minutes pour les opérations IA très longues
});

// ✅ AJOUT DES MÊMES INTERCEPTEURS POUR L'API LONGUE
longOperationApi.interceptors.request.use(
  (config) => {
    const xsrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];

    if (xsrfToken && config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
      console.log('🔑 [LONG-API] Token CSRF injecté pour:', config.method, config.url);
    }

    console.log('📤 [LONG-API] Requête longue:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ [LONG-API] Erreur intercepteur request:', error);
    return Promise.reject(error);
  }
);

longOperationApi.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('📥 [LONG-API] Réponse réussie:', response.status, response.config.url);
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;

    console.error('❌ [LONG-API] Erreur réponse:', {
      status,
      url,
      message: error.message,
    });

    if (status === 419) {
      console.warn('⚠️ [LONG-API] Token CSRF expiré - Réinitialisation...');
      csrfInitialized = false;
    }

    return Promise.reject(error);
  }
);

export default api;