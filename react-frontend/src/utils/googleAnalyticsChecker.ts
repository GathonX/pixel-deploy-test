// src/utils/googleAnalyticsChecker.ts - Vérificateur Google Analytics
interface GAVerificationResult {
  success: boolean;
  message: string;
  details: {
    trackingIdValid: boolean;
    scriptLoaded: boolean;
    gtagAvailable: boolean;
    dataLayerAvailable: boolean;
    realtimeTest?: boolean;
    networkTest?: boolean;
  };
  recommendations: string[];
}

export class GoogleAnalyticsChecker {
  private trackingId: string;

  constructor(trackingId: string) {
    this.trackingId = trackingId;
  }

  // Vérification complète
  async verify(): Promise<GAVerificationResult> {
    const result: GAVerificationResult = {
      success: false,
      message: '',
      details: {
        trackingIdValid: false,
        scriptLoaded: false,
        gtagAvailable: false,
        dataLayerAvailable: false
      },
      recommendations: []
    };

    // 1. Vérifier format du Tracking ID
    result.details.trackingIdValid = this.isValidTrackingId();
    if (!result.details.trackingIdValid) {
      result.recommendations.push('Corriger le format du Tracking ID (doit être G-XXXXXXXXXX)');
    }

    // 2. Vérifier si le script Google Analytics est chargé
    result.details.scriptLoaded = this.isScriptLoaded();
    if (!result.details.scriptLoaded) {
      result.recommendations.push('Charger le script Google Analytics');
    }

    // 3. Vérifier si window.gtag est disponible
    result.details.gtagAvailable = this.isGtagAvailable();
    if (!result.details.gtagAvailable) {
      result.recommendations.push('Initialiser la fonction gtag');
    }

    // 4. Vérifier si dataLayer existe
    result.details.dataLayerAvailable = this.isDataLayerAvailable();
    if (!result.details.dataLayerAvailable) {
      result.recommendations.push('Initialiser window.dataLayer');
    }

    // 5. Test temps réel (si tout est prêt)
    if (result.details.gtagAvailable && result.details.dataLayerAvailable) {
      result.details.realtimeTest = await this.testRealtime();
      if (!result.details.realtimeTest) {
        result.recommendations.push('Vérifier la connexion et les bloqueurs de publicité');
      }
    }

    // 6. Test de connectivité réseau vers Google Analytics
    result.details.networkTest = await this.testNetworkConnectivity();
    if (!result.details.networkTest) {
      result.recommendations.push('Vérifier la connectivité vers google-analytics.com');
    }

    // Évaluation globale
    const criticalChecks = [
      result.details.trackingIdValid,
      result.details.gtagAvailable,
      result.details.dataLayerAvailable
    ];

    result.success = criticalChecks.every(check => check);

    if (result.success) {
      result.message = '✅ Google Analytics correctement configuré et fonctionnel';
    } else {
      result.message = `❌ ${result.recommendations.length} problème(s) détecté(s) avec Google Analytics`;
    }

    return result;
  }

  // Vérifications individuelles
  private isValidTrackingId(): boolean {
    return /^G-[A-Z0-9]+$/.test(this.trackingId);
  }

  private isScriptLoaded(): boolean {
    const scripts = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
    return scripts.length > 0;
  }

  private isGtagAvailable(): boolean {
    return typeof window.gtag === 'function';
  }

  private isDataLayerAvailable(): boolean {
    return Array.isArray(window.dataLayer);
  }

  private async testRealtime(): Promise<boolean> {
    try {
      const initialSize = window.dataLayer.length;
      
      // Envoyer un événement de test
      window.gtag?.('event', 'test_verification', {
        event_category: 'debug',
        event_label: 'analytics_checker',
        custom_parameter: Date.now()
      });

      // Vérifier que dataLayer a été modifié
      await new Promise(resolve => setTimeout(resolve, 100));
      return window.dataLayer.length > initialSize;
    } catch (error) {
      console.error('Erreur test temps réel:', error);
      return false;
    }
  }

  private async testNetworkConnectivity(): Promise<boolean> {
    try {
      // Test simple de connectivité vers Google Analytics
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(`https://www.google-analytics.com/g/collect?v=2&tid=${this.trackingId}&t=pageview&dp=/test`, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Évite les problèmes CORS pour ce test
      });

      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.warn('Test de connectivité échoué:', error);
      return false;
    }
  }

  // Diagnostique détaillé pour le debug
  getDiagnostic(): Record<string, any> {
    return {
      trackingId: this.trackingId,
      environment: {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        cookieEnabled: navigator.cookieEnabled
      },
      googleAnalytics: {
        scriptElements: Array.from(document.querySelectorAll('script[src*="google"]')).map(s => (s as HTMLScriptElement).src),
        gtagFunction: typeof window.gtag,
        dataLayerSize: window.dataLayer?.length || 0,
        dataLayerSample: window.dataLayer?.slice(-3) || []
      },
      localStorage: {
        cookieConsent: localStorage.getItem('cookie_consent'),
        otherGAKeys: Object.keys(localStorage).filter(key => 
          key.includes('ga') || key.includes('analytics') || key.includes('google')
        )
      },
      adBlocker: {
        suspectedBlocked: this.detectAdBlocker()
      }
    };
  }

  private detectAdBlocker(): boolean {
    // Méthode simple de détection d'ad-blocker
    try {
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '&nbsp;';
      testDiv.className = 'adsbox';
      testDiv.style.position = 'absolute';
      testDiv.style.left = '-10000px';
      document.body.appendChild(testDiv);
      
      const blocked = testDiv.offsetHeight === 0;
      document.body.removeChild(testDiv);
      
      return blocked;
    } catch {
      return false;
    }
  }

  // Méthode statique utilitaire
  static async quickCheck(trackingId: string): Promise<{ isWorking: boolean; issues: string[] }> {
    const checker = new GoogleAnalyticsChecker(trackingId);
    const result = await checker.verify();
    
    return {
      isWorking: result.success,
      issues: result.recommendations
    };
  }
}

// Export d'une instance par défaut
export const createGoogleAnalyticsChecker = (trackingId: string) => 
  new GoogleAnalyticsChecker(trackingId);

export default GoogleAnalyticsChecker;