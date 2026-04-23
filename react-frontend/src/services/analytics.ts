// src/services/analytics.ts - Service Google Analytics sécurisé avec fallback
import type { GtagFunction } from '../types/gtag';

interface AnalyticsConfig {
  trackingId: string;
  enabled: boolean;
  debugMode: boolean;
}

interface AnalyticsError {
  message: string;
  code: string;
  fatal: boolean;
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private isLoaded = false;
  private loadAttempts = 0;
  private maxLoadAttempts = 3;
  private loadTimeout = 10000; // 10 secondes

  constructor() {
    // Désactiver complètement si VITE_ENABLE_ANALYTICS=false
    const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS !== 'false';

    this.config = {
      trackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
      enabled: enableAnalytics,
      debugMode: import.meta.env.VITE_APP_DEBUG === 'true'
    };

    if (enableAnalytics) {
      this.validateConfig();
    }
  }

  private validateConfig(): void {
    if (!this.config.trackingId || this.config.trackingId === 'G-XXXXXXXXXX') {
      if (this.config.debugMode) {
        console.warn('⚠️ Google Analytics: ID de suivi non configuré ou invalide');
      }
      this.config.enabled = false;
      return;
    }

    if (!this.config.trackingId.match(/^G-[A-Z0-9]+$/)) {
      console.error('❌ Google Analytics: Format d\'ID invalide:', this.config.trackingId);
      this.config.enabled = false;
      return;
    }

    this.config.enabled = true;
    if (this.config.debugMode) {
      console.log('🔧 Google Analytics configuré:', {
        trackingId: this.config.trackingId,
        enabled: this.config.enabled
      });
    }
  }

  private createErrorHandler(): (error: Event) => void {
    return (error: Event) => {
      const analyticsError: AnalyticsError = {
        message: 'Échec du chargement de Google Analytics',
        code: 'LOAD_FAILED',
        fatal: false
      };

      console.error('❌ Google Analytics:', analyticsError);
      
      // Ne pas bloquer l'application, juste loguer l'erreur
      if (this.config.debugMode) {
        console.warn('🔄 Google Analytics non disponible, continuons sans tracking');
      }
    };
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isLoaded) {
        resolve();
        return;
      }

      this.loadAttempts++;

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.trackingId}`;
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      script.onerror = this.createErrorHandler();
      
      // Timeout de sécurité
      const timeoutId = setTimeout(() => {
        script.onerror = null;
        script.onload = null;
        reject(new Error(`Timeout lors du chargement de Google Analytics (tentative ${this.loadAttempts})`));
      }, this.loadTimeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Échec du chargement de Google Analytics (tentative ${this.loadAttempts})`));
      };

      document.head.appendChild(script);
    });
  }

  private initializeGtag(): void {
    // Initialiser dataLayer si pas déjà fait
    window.dataLayer = window.dataLayer || [];

    // Créer la fonction gtag
    const gtag: GtagFunction = function(...args: any[]) {
      window.dataLayer.push(args);
    } as GtagFunction;

    // Assigner à window
    window.gtag = gtag;

    // Configuration initiale
    gtag('js', new Date());
    gtag('config', this.config.trackingId, {
      // Configuration pour respecter la vie privée
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    if (this.config.debugMode) {
      console.log('✅ Google Analytics initialisé avec:', {
        trackingId: this.config.trackingId,
        anonymize_ip: true
      });
    }
  }

  private async attemptLoad(): Promise<void> {
    if (this.loadAttempts >= this.maxLoadAttempts) {
      throw new Error(`Échec après ${this.maxLoadAttempts} tentatives`);
    }

    try {
      await this.loadScript();
      this.initializeGtag();
    } catch (error) {
      if (this.loadAttempts < this.maxLoadAttempts) {
        console.warn(`⚠️ Tentative ${this.loadAttempts} échouée, réessai...`);
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, this.loadAttempts) * 1000));
        return this.attemptLoad();
      }
      throw error;
    }
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { 
        success: false, 
        error: 'Google Analytics désactivé (configuration manquante)' 
      };
    }

    try {
      await this.attemptLoad();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      console.error('❌ Impossible d\'initialiser Google Analytics:', errorMessage);
      
      // ✅ FALLBACK: L'application continue de fonctionner
      return { 
        success: false, 
        error: `Google Analytics non disponible: ${errorMessage}` 
      };
    }
  }

  trackPageView(path: string): void {
    console.log(`📊 [ANALYTICS] Tentative tracking page vue: ${path}`);
    
    if (!this.isLoaded || !window.gtag) {
      console.warn('⚠️ [ANALYTICS] Google Analytics non chargé - Mode simulation');
      if (this.config.debugMode) {
        console.log('📊 [SIMULATION] Page vue:', {
          path,
          location: window.location.href,
          title: document.title,
          reason: 'Analytics not loaded'
        });
      }
      return;
    }

    try {
      const eventData = {
        page_path: path,
        page_location: window.location.href,
        page_title: document.title
      };

      window.gtag('event', 'page_view', eventData);

      console.log('✅ [ANALYTICS] Page vue envoyée:', {
        path,
        trackingId: this.config.trackingId,
        eventData
      });

      if (this.config.debugMode) {
        console.log('📊 [DEBUG] DataLayer size after page_view:', window.dataLayer.length);
      }
    } catch (error) {
      console.error('❌ [ANALYTICS] Erreur lors du tracking de page:', {
        error,
        path,
        gtag_available: !!window.gtag,
        dataLayer_size: window.dataLayer?.length || 0
      });
    }
  }

  trackEvent(action: string, category: string = 'general', label?: string, value?: number): void {
    console.log(`📊 [ANALYTICS] Tentative tracking événement: ${action}`);
    
    if (!this.isLoaded || !window.gtag) {
      console.warn('⚠️ [ANALYTICS] Google Analytics non chargé - Mode simulation');
      if (this.config.debugMode) {
        console.log('📊 [SIMULATION] Événement:', { 
          action, 
          category, 
          label, 
          value,
          reason: 'Analytics not loaded'
        });
      }
      return;
    }

    try {
      const eventParams: Record<string, unknown> = {
        event_category: category
      };

      if (label) eventParams.event_label = label;
      if (value !== undefined) eventParams.value = value;

      window.gtag('event', action, eventParams);

      console.log('✅ [ANALYTICS] Événement envoyé:', {
        action,
        category,
        label,
        value,
        trackingId: this.config.trackingId,
        eventParams
      });

      if (this.config.debugMode) {
        console.log('📊 [DEBUG] DataLayer size after event:', window.dataLayer.length);
      }
    } catch (error) {
      console.error('❌ [ANALYTICS] Erreur lors du tracking d\'événement:', {
        error,
        action,
        category,
        gtag_available: !!window.gtag,
        dataLayer_size: window.dataLayer?.length || 0
      });
    }
  }

  // Méthodes utilitaires pour événements courants
  trackConsentAccepted(): void {
    this.trackEvent('consent_accepted', 'privacy');
  }

  trackConsentDeclined(): void {
    this.trackEvent('consent_declined', 'privacy');
  }

  trackFeatureActivation(featureName: string): void {
    this.trackEvent('feature_activated', 'features', featureName);
  }

  // Vérifier si Google Analytics est actif
  isActive(): boolean {
    return this.isLoaded && this.config.enabled && !!window.gtag;
  }

  // Obtenir la configuration actuelle
  getConfig(): Readonly<AnalyticsConfig> {
    return Object.freeze({ ...this.config });
  }
}

// Instance singleton
export const analyticsService = new AnalyticsService();
export default analyticsService;