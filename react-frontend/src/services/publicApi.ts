// src/services/publicApi.ts - SERVICE API PUBLIC SANS AUTHENTIFICATION
import axios, { AxiosInstance } from 'axios';

// ✅ FONCTION UTILITAIRE : Construire l'URL API proprement
const buildApiUrl = (): string => {
  // ✅ CORRECTION: Utiliser VITE_API_BASE_URL qui contient déjà /api
  // Évite le double /api/api causé par l'optimisation Vite
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
};

// Service dédié aux endpoints publics (blog, pages publiques, etc.)
const publicApi: AxiosInstance = axios.create({
  baseURL: buildApiUrl(), // ✅ URL construite proprement
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Pour les cookies de session Laravel si nécessaire
  timeout: 10000, // Timeout de 10 secondes
});

// Intercepteur de requête - PAS de token d'authentification pour les endpoints publics
publicApi.interceptors.request.use(
  (config) => {
    console.log(`🌐 [PublicAPI] Requête publique vers: ${config.url}`);
    console.log(`🌐 [PublicAPI] URL complète: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ [PublicAPI] Erreur de requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse - Gestion d'erreur sans redirection
publicApi.interceptors.response.use(
  (response) => {
    console.log(`✅ [PublicAPI] Réponse reçue de: ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    
    console.warn(`⚠️ [PublicAPI] Erreur ${status} sur endpoint public: ${url}`);
    
    // ✅ PAS DE REDIRECTION AUTOMATIQUE pour les erreurs d'API publique
    // Les composants gèrent leurs propres erreurs
    
    return Promise.reject(error);
  }
);

export default publicApi;