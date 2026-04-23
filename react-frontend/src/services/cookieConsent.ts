// src/services/cookieConsent.ts - Service dédié au consentement cookies sécurisé
import axios, { AxiosInstance, AxiosError } from 'axios';

interface ConsentResponse {
  message: string;
  consent: boolean;
  session_id?: string;
}

interface ConsentError {
  message: string;
  details?: string;
  shouldRetry?: boolean;
}

class CookieConsentService {
  private axiosInstance: AxiosInstance;
  private maxRetries = 2;
  private retryDelay = 1000; // 1 seconde

  constructor() {
    // ✅ Service unifié pour le consentement (utilisateurs connectés ET visiteurs)
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_URL, // Sans /api pour sanctum et tracking
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      withCredentials: true,
      timeout: 10000, // 10 secondes max
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Intercepteur pour ajouter le token CSRF automatiquement
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const csrfToken = this.getCSRFToken();
        if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
          config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse pour gérer les erreurs CSRF
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Si erreur 419 (CSRF), on renouvelle le token et on réessaye
        if (error.response?.status === 419) {
          try {
            await this.refreshCSRFToken();
            // Réessayer la requête originale
            return this.axiosInstance.request(error.config!);
          } catch (csrfError) {
            console.error('❌ Impossible de renouveler le token CSRF:', csrfError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getCSRFToken(): string | null {
    const cookies = document.cookie.split('; ');
    const csrfCookie = cookies.find(c => c.startsWith('XSRF-TOKEN='));
    return csrfCookie ? decodeURIComponent(csrfCookie.split('=')[1]) : null;
  }

  private async refreshCSRFToken(): Promise<void> {
    await this.axiosInstance.get('/sanctum/csrf-cookie');
  }

  private getClientTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatError(error: unknown): ConsentError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'NETWORK_ERR' || axiosError.code === 'ERR_NETWORK') {
        return {
          message: 'Problème de connexion réseau',
          details: 'Vérifiez votre connexion internet',
          shouldRetry: true
        };
      }

      if (axiosError.response?.status === 419) {
        return {
          message: 'Session expirée',
          details: 'Veuillez recharger la page',
          shouldRetry: true
        };
      }

      if (axiosError.response?.status === 500) {
        return {
          message: 'Erreur serveur temporaire',
          details: 'Réessayez dans quelques instants',
          shouldRetry: true
        };
      }

      return {
        message: 'Erreur de communication avec le serveur',
        details: `Code: ${axiosError.response?.status || 'inconnu'}`,
        shouldRetry: false
      };
    }

    return {
      message: 'Erreur inattendue',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      shouldRetry: false
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<{ success: true; data: T } | { success: false; error: ConsentError }> {
    let lastError: ConsentError = { message: 'Erreur inconnue' };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${context} - Tentative ${attempt}/${this.maxRetries}`);
        const result = await operation();
        console.log(`✅ ${context} - Succès`);
        return { success: true, data: result };
      } catch (error) {
        lastError = this.formatError(error);
        console.error(`❌ ${context} - Échec tentative ${attempt}:`, lastError);

        // Si c'est la dernière tentative ou que l'erreur ne justifie pas un retry
        if (attempt === this.maxRetries || !lastError.shouldRetry) {
          break;
        }

        // Attendre avant le prochain essai
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    return { success: false, error: lastError };
  }

  async acceptConsent(): Promise<{ success: true; data: ConsentResponse } | { success: false; error: ConsentError }> {
    return this.executeWithRetry(async () => {
      // 1. S'assurer qu'on a un token CSRF
      await this.refreshCSRFToken();

      // 2. Envoyer le consentement
      const response = await this.axiosInstance.post<ConsentResponse>('/api/tracking/consent', {
        consent: true,
        timezone: this.getClientTimezone(),
      });

      return response.data;
    }, 'Acceptation du consentement');
  }

  async declineConsent(): Promise<{ success: true; data: ConsentResponse } | { success: false; error: ConsentError }> {
    return this.executeWithRetry(async () => {
      // 1. S'assurer qu'on a un token CSRF
      await this.refreshCSRFToken();

      // 2. Envoyer le refus
      const response = await this.axiosInstance.post<ConsentResponse>('/api/tracking/consent', {
        consent: false,
      });

      return response.data;
    }, 'Refus du consentement');
  }

  // Vérifier si le consentement a été donné précédemment
  hasStoredConsent(): { hasConsent: boolean; consentValue: boolean | null } {
    const stored = localStorage.getItem('cookie_consent');
    
    if (stored === null) {
      return { hasConsent: false, consentValue: null };
    }

    return {
      hasConsent: true,
      consentValue: stored === 'true'
    };
  }

  // Sauvegarder le consentement localement
  storeConsent(consent: boolean): void {
    localStorage.setItem('cookie_consent', consent.toString());
    console.log(`💾 Consentement sauvegardé: ${consent}`);
  }

  // Effacer le consentement stocké
  clearStoredConsent(): void {
    localStorage.removeItem('cookie_consent');
    console.log('🗑️ Consentement effacé');
  }
}

// Instance singleton
export const cookieConsentService = new CookieConsentService();
export default cookieConsentService;