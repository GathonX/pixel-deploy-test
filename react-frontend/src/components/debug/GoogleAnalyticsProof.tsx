// src/components/debug/GoogleAnalyticsProof.tsx - Système de preuve Google Analytics
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProofResult {
  timestamp: string;
  test: string;
  status: 'success' | 'error' | 'pending';
  details: string;
  evidence?: any;
}

const GoogleAnalyticsProof: React.FC = () => {
  const [proofs, setProofs] = useState<ProofResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0
  });

  const addProof = (test: string, status: ProofResult['status'], details: string, evidence?: any) => {
    const proof: ProofResult = {
      timestamp: new Date().toLocaleTimeString(),
      test,
      status,
      details,
      evidence: evidence ? JSON.stringify(evidence, null, 2) : undefined
    };
    
    setProofs(prev => [proof, ...prev.slice(0, 14)]); // Max 15 preuves
  };

  const runCompleteProof = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setProofs([]);
    
    addProof('Démarrage test complet', 'pending', 'Initialisation des tests de validation...');

    try {
      // Test 1: Variables d'environnement
      addProof('Variables environnement', 'pending', 'Vérification VITE_GA_TRACKING_ID...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const trackingId = import.meta.env.VITE_GA_TRACKING_ID;
      if (trackingId && trackingId !== 'G-XXXXXXXXXX') {
        addProof('Variables environnement', 'success', `✅ VITE_GA_TRACKING_ID = ${trackingId}`, { trackingId });
      } else {
        addProof('Variables environnement', 'error', '❌ VITE_GA_TRACKING_ID non configuré', { trackingId });
      }

      // Test 2: Consentement cookies
      addProof('Consentement cookies', 'pending', 'Vérification stockage local...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const consent = localStorage.getItem('cookie_consent');
      if (consent === 'true') {
        addProof('Consentement cookies', 'success', '✅ Consentement accepté et stocké', { consent });
      } else {
        addProof('Consentement cookies', 'error', `❌ Consentement: ${consent || 'null'}`, { consent });
      }

      // Test 3: Script Google Analytics chargé
      addProof('Script Google chargé', 'pending', 'Vérification présence script gtag...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const scripts = Array.from(document.querySelectorAll('script')).filter(s => 
        s.src.includes('googletagmanager.com/gtag')
      );
      
      if (scripts.length > 0) {
        addProof('Script Google chargé', 'success', `✅ ${scripts.length} script(s) gtag détecté(s)`, {
          scripts: scripts.map(s => s.src)
        });
      } else {
        addProof('Script Google chargé', 'error', '❌ Aucun script gtag détecté', { scripts: [] });
      }

      // Test 4: Fonction window.gtag
      addProof('Fonction gtag', 'pending', 'Vérification window.gtag...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (typeof window.gtag === 'function') {
        addProof('Fonction gtag', 'success', '✅ window.gtag est une fonction', {
          type: typeof window.gtag
        });
      } else {
        addProof('Fonction gtag', 'error', `❌ window.gtag: ${typeof window.gtag}`, {
          type: typeof window.gtag
        });
      }

      // Test 5: DataLayer
      addProof('DataLayer Google', 'pending', 'Vérification window.dataLayer...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (Array.isArray(window.dataLayer) && window.dataLayer.length > 0) {
        addProof('DataLayer Google', 'success', `✅ DataLayer actif (${window.dataLayer.length} éléments)`, {
          length: window.dataLayer.length,
          sample: window.dataLayer.slice(-3)
        });
      } else {
        addProof('DataLayer Google', 'error', '❌ DataLayer vide ou inexistant', {
          dataLayer: window.dataLayer
        });
      }

      // Test 6: Envoi événement test
      addProof('Test événement', 'pending', 'Envoi événement de test...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (window.gtag) {
        const testEventId = `test_${Date.now()}`;
        const initialSize = window.dataLayer.length;
        
        window.gtag('event', 'validation_test', {
          event_category: 'proof_system',
          event_label: testEventId,
          custom_parameter_1: new Date().toISOString(),
          debug: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (window.dataLayer.length > initialSize) {
          addProof('Test événement', 'success', `✅ Événement envoyé (ID: ${testEventId})`, {
            eventId: testEventId,
            dataLayerBefore: initialSize,
            dataLayerAfter: window.dataLayer.length
          });
        } else {
          addProof('Test événement', 'error', '❌ Événement non ajouté au dataLayer', {
            eventId: testEventId,
            dataLayerSize: window.dataLayer.length
          });
        }
      } else {
        addProof('Test événement', 'error', '❌ window.gtag non disponible', {});
      }

      // Test 7: Connectivité réseau Google
      addProof('Connectivité réseau', 'pending', 'Test connexion vers Google Analytics...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await fetch('https://www.google-analytics.com/g/collect?v=2&t=pageview&tid=G-TEST', {
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        
        clearTimeout(timeoutId);
        addProof('Connectivité réseau', 'success', '✅ Connexion Google Analytics OK', {});
      } catch (error: any) {
        addProof('Connectivité réseau', 'error', `❌ Erreur réseau: ${error.message}`, {
          error: error.message
        });
      }

      // Test 8: Validation finale
      await new Promise(resolve => setTimeout(resolve, 300));
      const finalCheck = window.gtag && window.dataLayer && window.dataLayer.length > 0;
      
      if (finalCheck) {
        addProof('✅ VALIDATION FINALE', 'success', '🎉 Google Analytics complètement fonctionnel !', {
          trackingId,
          gtagAvailable: !!window.gtag,
          dataLayerSize: window.dataLayer.length,
          timestamp: new Date().toISOString()
        });
      } else {
        addProof('❌ VALIDATION FINALE', 'error', '💥 Google Analytics non fonctionnel', {
          trackingId,
          gtagAvailable: !!window.gtag,
          dataLayerSize: window.dataLayer?.length || 0
        });
      }

    } catch (error: any) {
      addProof('Erreur système', 'error', `💥 Erreur inattendue: ${error.message}`, {
        error: error.message,
        stack: error.stack
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Calcul du résumé
  useEffect(() => {
    const total = proofs.length;
    const passed = proofs.filter(p => p.status === 'success').length;
    const failed = proofs.filter(p => p.status === 'error').length;
    const pending = proofs.filter(p => p.status === 'pending').length;
    
    setSummary({ total, passed, failed, pending });
  }, [proofs]);

  const copyProofToClipboard = () => {
    const proofText = proofs.map(p => 
      `${p.timestamp} - ${p.test}: ${p.details}`
    ).join('\n');
    
    navigator.clipboard.writeText(proofText);
    toast({
      title: "📋 Preuves copiées",
      description: "Les résultats ont été copiés dans le presse-papiers"
    });
  };

  const openGoogleAnalytics = () => {
    const trackingId = import.meta.env.VITE_GA_TRACKING_ID || 'G-CYH5VGVLTS';
    window.open(`https://analytics.google.com/analytics/web/#/p${trackingId.replace('G-', '')}/realtime/overview`, '_blank');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-xl border-2 border-green-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🧪 Système de Preuve Google Analytics
          </span>
          <div className="flex gap-2">
            <Button onClick={openGoogleAnalytics} size="sm" variant="outline">
              <ExternalLink className="w-4 h-4 mr-1" />
              Ouvrir GA
            </Button>
            <Button onClick={copyProofToClipboard} size="sm" variant="outline" disabled={proofs.length === 0}>
              <Copy className="w-4 h-4 mr-1" />
              Copier
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé */}
        <div className="flex gap-4 items-center p-4 bg-gray-50 rounded-lg">
          <div className="text-sm">
            <span className="font-semibold">Total:</span> {summary.total}
          </div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">{summary.passed}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            <span className="font-semibold">{summary.failed}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-yellow-600">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">{summary.pending}</span>
          </div>
        </div>

        {/* Bouton de test */}
        <Button 
          onClick={runCompleteProof} 
          disabled={isRunning}
          className="w-full"
          variant="default"
        >
          {isRunning ? '⏳ Tests en cours...' : '🚀 LANCER TESTS DE PREUVE COMPLETS'}
        </Button>

        {/* Résultats des tests */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {proofs.map((proof, index) => (
            <div 
              key={index}
              className={`p-3 rounded border-l-4 text-sm ${
                proof.status === 'success' ? 'bg-green-50 border-green-400' :
                proof.status === 'error' ? 'bg-red-50 border-red-400' :
                'bg-yellow-50 border-yellow-400'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{proof.test}</span>
                    <Badge 
                      variant={
                        proof.status === 'success' ? 'default' :
                        proof.status === 'error' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {proof.status === 'success' ? '✅ OK' :
                       proof.status === 'error' ? '❌ KO' :
                       '⏳ EN COURS'}
                    </Badge>
                  </div>
                  <div className="text-gray-700">{proof.details}</div>
                  {proof.evidence && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-mono text-gray-500">
                        📄 Preuves techniques
                      </summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                        {proof.evidence}
                      </pre>
                    </details>
                  )}
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {proof.timestamp}
                </span>
              </div>
            </div>
          ))}
          
          {proofs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun test lancé pour le moment</p>
              <p className="text-xs">Cliquez sur le bouton ci-dessus pour commencer</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">📝 Instructions de validation</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. <strong>Acceptez les cookies</strong> si pas encore fait</li>
            <li>2. <strong>Cliquez "LANCER TESTS"</strong> pour vérification complète</li>
            <li>3. <strong>Attendez</strong> que tous les tests soient ✅ verts</li>
            <li>4. <strong>Ouvrez Google Analytics</strong> (bouton "Ouvrir GA")</li>
            <li>5. <strong>Vérifiez</strong> dans "Temps réel" → 1 utilisateur actif</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleAnalyticsProof;