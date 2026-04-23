// src/components/debug/CookieConsentDebug.tsx - Panneau de debug pour le consentement cookies
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import cookieConsentService from '@/services/cookieConsent';
import analyticsService from '@/services/analytics';

interface DebugLog {
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  details?: any;
}

const CookieConsentDebug: React.FC = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [consentState, setConsentState] = useState<{
    hasConsent: boolean;
    consentValue: boolean | null;
  }>({ hasConsent: false, consentValue: null });
  const [analyticsState, setAnalyticsState] = useState<{
    isActive: boolean;
    config: any;
  }>({ isActive: false, config: {} });
  const [isVisible, setIsVisible] = useState(false);

  // Logger personnalisé pour capturer les logs
  const addLog = (type: DebugLog['type'], message: string, details?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details: details ? JSON.stringify(details, null, 2) : undefined
    };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Garder max 20 logs
  };

  // Intercepter les console.log originaux
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('Google Analytics') || message.includes('Consentement') || message.includes('Cookie')) {
        addLog('info', message, args.length > 1 ? args.slice(1) : undefined);
      }
      originalLog(...args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Analytics') || message.includes('consentement') || message.includes('Cookie')) {
        addLog('error', message, args.length > 1 ? args.slice(1) : undefined);
      }
      originalError(...args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('Analytics') || message.includes('consentement') || message.includes('Cookie')) {
        addLog('warning', message, args.length > 1 ? args.slice(1) : undefined);
      }
      originalWarn(...args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // Vérifier l'état toutes les 2 secondes
  useEffect(() => {
    const checkStates = () => {
      // État du consentement
      const consent = cookieConsentService.hasStoredConsent();
      setConsentState(consent);

      // État d'Analytics  
      const analyticsActive = analyticsService.isActive();
      const analyticsConfig = analyticsService.getConfig();
      setAnalyticsState({
        isActive: analyticsActive,
        config: analyticsConfig
      });
    };

    checkStates();
    const interval = setInterval(checkStates, 2000);
    return () => clearInterval(interval);
  }, []);

  // Tests manuels
  const testConsentAccept = async () => {
    addLog('info', '🧪 TEST: Acceptation du consentement...');
    try {
      const result = await cookieConsentService.acceptConsent();
      if (result.success) {
        addLog('success', '✅ Test réussi: Consentement accepté', result.data);
      } else {
        addLog('error', '❌ Test échoué: Consentement refusé', result.error);
      }
    } catch (error) {
      addLog('error', '💥 Test échoué: Erreur critique', error);
    }
  };

  const testConsentDecline = async () => {
    addLog('info', '🧪 TEST: Refus du consentement...');
    try {
      const result = await cookieConsentService.declineConsent();
      if (result.success) {
        addLog('success', '✅ Test réussi: Consentement refusé', result.data);
      } else {
        addLog('error', '❌ Test échoué: Erreur lors du refus', result.error);
      }
    } catch (error) {
      addLog('error', '💥 Test échoué: Erreur critique', error);
    }
  };

  const testAnalyticsInit = async () => {
    addLog('info', '🧪 TEST: Initialisation Google Analytics...');
    try {
      const result = await analyticsService.initialize();
      if (result.success) {
        addLog('success', '✅ Test réussi: Analytics initialisé');
        analyticsService.trackEvent('test_event', 'debug', 'manual_test');
      } else {
        addLog('warning', '⚠️ Test partiel: Analytics non disponible', result.error);
      }
    } catch (error) {
      addLog('error', '💥 Test échoué: Erreur Analytics', error);
    }
  };

  const testPageView = () => {
    addLog('info', '🧪 TEST: Tracking page vue...');
    analyticsService.trackPageView('/debug/test');
    addLog('success', '✅ Test envoyé: Page vue trackée');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', '🧹 Logs effacés');
  };

  const testGoogleTag = () => {
    addLog('info', '🧪 TEST: Vérification window.gtag...');
    if (window.gtag) {
      addLog('success', '✅ window.gtag existe et est fonctionnel');
      addLog('info', '📊 DataLayer length: ' + window.dataLayer.length);
    } else {
      addLog('error', '❌ window.gtag n\'existe pas');
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200"
        >
          🔧 Debug Consentement
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-96 z-50 max-h-[90vh] overflow-y-auto">
      <Card className="bg-white shadow-2xl border-2 border-yellow-300">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              🔧 Debug Consentement Cookies
            </CardTitle>
            <Button 
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* État du consentement */}
          <div>
            <h4 className="font-semibold mb-2">📊 État Consentement</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span>Stocké:</span>
                {consentState.hasConsent ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Oui
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Non
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Valeur:</span>
                {consentState.consentValue === true ? (
                  <Badge variant="success">Accepté</Badge>
                ) : consentState.consentValue === false ? (
                  <Badge variant="destructive">Refusé</Badge>
                ) : (
                  <Badge variant="secondary">Non défini</Badge>
                )}
              </div>
            </div>
          </div>

          {/* État Google Analytics */}
          <div>
            <h4 className="font-semibold mb-2">📈 État Google Analytics</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span>Actif:</span>
                {analyticsState.isActive ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Oui
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Non
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>ID:</span>
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                  {analyticsState.config.trackingId || 'Non défini'}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span>Activé:</span>
                {analyticsState.config.enabled ? (
                  <Badge variant="success">Oui</Badge>
                ) : (
                  <Badge variant="destructive">Non</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Tests manuels */}
          <div>
            <h4 className="font-semibold mb-2">🧪 Tests Manuels</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button onClick={testConsentAccept} size="sm" variant="outline">
                ✅ Test Accepter
              </Button>
              <Button onClick={testConsentDecline} size="sm" variant="outline">
                ❌ Test Refuser
              </Button>
              <Button onClick={testAnalyticsInit} size="sm" variant="outline">
                📊 Test Analytics
              </Button>
              <Button onClick={testPageView} size="sm" variant="outline">
                📄 Test Page Vue
              </Button>
              <Button onClick={testGoogleTag} size="sm" variant="outline">
                🏷️ Test gtag
              </Button>
              <Button onClick={clearLogs} size="sm" variant="outline">
                🧹 Vider Logs
              </Button>
            </div>
          </div>

          <Separator />

          {/* Logs en temps réel */}
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              📝 Logs Temps Réel 
              <Badge variant="secondary">{logs.length}</Badge>
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-xs p-2 rounded border-l-4 ${
                    log.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                    log.type === 'error' ? 'bg-red-50 border-red-400 text-red-800' :
                    log.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                    'bg-blue-50 border-blue-400 text-blue-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-mono text-xs opacity-70">
                      {log.timestamp}
                    </span>
                    <span className={`px-1 rounded text-xs ${
                      log.type === 'success' ? 'bg-green-100' :
                      log.type === 'error' ? 'bg-red-100' :
                      log.type === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {log.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1">{log.message}</div>
                  {log.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs opacity-70">Détails</summary>
                      <pre className="text-xs mt-1 bg-gray-100 p-1 rounded overflow-x-auto">
                        {log.details}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-4">
                  Aucun log pour le moment...
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsentDebug;