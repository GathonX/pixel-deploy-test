// src/utils/agentTestUtils.ts - Utilitaires pour tester l'agent intelligent

import agentNotificationService from '@/services/agentNotificationService';
import api from '@/services/api';

/**
 * Réinitialiser tous les éléments liés à l'agent pour les tests
 */
export const resetAgentForTesting = () => {
  console.log('🔄 Réinitialisation de l\'agent intelligent pour les tests...');

  // 1. Supprimer le flag d'introduction vue
  localStorage.removeItem('pixelrise-agent-intro-seen');

  // 2. Nettoyer toutes les suggestions d'agent
  const keys = Object.keys(localStorage).filter(key => key.startsWith('agent_suggestion_'));
  keys.forEach(key => localStorage.removeItem(key));

  // 3. Réinitialiser la position de l'agent
  localStorage.removeItem('pixelrise-agent-position');

  // 4. Nettoyer la session
  sessionStorage.removeItem('session_start');
  sessionStorage.removeItem('page_visit_count');

  console.log('✅ Agent réinitialisé ! Rechargez la page pour voir les composants proactifs.');
};

/**
 * Générer des notifications de test
 */
export const generateTestNotifications = async () => {
  console.log('🧪 Génération de notifications de test...');

  try {
    // Test suggestion
    await agentNotificationService.createSuggestion({
      title: 'Test de suggestion',
      message: 'Ceci est une suggestion de test de l\'agent intelligent.',
      suggestionType: 'optimization',
      currentPage: 'dashboard',
      context: { test: true },
      confidenceScore: 0.95,
      expectedImpact: 'high',
      actionUrl: '/dashboard/analytics',
      actionLabel: 'Voir l\'analyse'
    });

    // Test insight
    await agentNotificationService.createInsight({
      title: 'Test d\'insight',
      message: 'Voici un insight de test généré par l\'agent.',
      insightType: 'opportunity',
      domain: 'business',
      metrics: { test_metric: 42 },
      trendDirection: 'up',
      recommendation: 'Continuez sur cette voie !',
      canAutofix: true,
      autofixAction: 'auto_optimize'
    });

    // Test alerte
    await agentNotificationService.createAlert({
      title: 'Test d\'alerte',
      message: 'Ceci est une alerte de test pour vérifier le système.',
      alertType: 'system_issue',
      severity: 'medium',
      affectedFeature: 'Test Feature',
      resolutionSteps: [
        'Vérifier les paramètres',
        'Redémarrer le service',
        'Contacter le support si nécessaire'
      ],
      autoResolutionAvailable: false
    });

    console.log('✅ Notifications de test générées ! Vérifiez la cloche de notifications.');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des notifications de test:', error);
  }
};

/**
 * Activer le mode debug pour l'agent
 */
export const enableAgentDebugMode = () => {
  console.log('🐛 Activation du mode debug pour l\'agent...');

  localStorage.setItem('agent-debug-mode', 'true');

  // Afficher des informations détaillées
  console.log('Agent Debug Info:', {
    introSeen: localStorage.getItem('pixelrise-agent-intro-seen'),
    sessionStart: sessionStorage.getItem('session_start'),
    pageVisitCount: sessionStorage.getItem('page_visit_count'),
    agentPosition: localStorage.getItem('pixelrise-agent-position'),
    agentSuggestions: Object.keys(localStorage).filter(k => k.startsWith('agent_suggestion_'))
  });
};

/**
 * Désactiver le mode debug
 */
export const disableAgentDebugMode = () => {
  localStorage.removeItem('agent-debug-mode');
  console.log('Debug mode désactivé');
};

/**
 * Vérifier l'état actuel de l'agent
 */
export const checkAgentStatus = () => {
  console.log('📊 État actuel de l\'agent intelligent:');

  const status = {
    introductionSeen: !!localStorage.getItem('pixelrise-agent-intro-seen'),
    sessionDuration: (() => {
      const start = sessionStorage.getItem('session_start');
      if (!start) return 0;
      return Math.round((new Date().getTime() - new Date(start).getTime()) / (1000 * 60));
    })(),
    pageVisitCount: parseInt(sessionStorage.getItem('page_visit_count') || '0'),
    suggestionCount: Object.keys(localStorage).filter(k => k.startsWith('agent_suggestion_')).length,
    debugMode: !!localStorage.getItem('agent-debug-mode'),
    currentPage: window.location.pathname
  };

  console.table(status);
  return status;
};

/**
 * Forcer l'affichage du popup d'introduction
 */
export const forceShowIntroPopup = () => {
  console.log('🎯 Forçage de l\'affichage du popup d\'introduction...');
  localStorage.removeItem('pixelrise-agent-intro-seen');
  console.log('✅ Rechargez la page pour voir le popup d\'introduction.');
};

/**
 * Simuler une session longue pour tester les alertes
 */
export const simulateLongSession = () => {
  console.log('⏰ Simulation d\'une session longue...');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  sessionStorage.setItem('session_start', twoHoursAgo);
  sessionStorage.setItem('page_visit_count', '50');
  console.log('✅ Session simulée. Les alertes de session longue devraient apparaître.');
};

/**
 * Diagnostiquer l'API de l'agent
 */
export const diagnoseAgentAPI = async () => {
  console.log('🔍 Diagnostic de l\'API agent...');

  try {
    const response = await api.get('/intelligent-agent/test/diagnose');
    console.log('✅ Diagnostic complet:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    throw error;
  }
};

/**
 * Forcer la création d'un agent
 */
export const forceCreateAgent = async () => {
  console.log('🤖 Création forcée d\'un agent...');

  try {
    const response = await api.post('/intelligent-agent/test/create-agent');
    console.log('✅ Agent créé:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la création d\'agent:', error);
    throw error;
  }
};

/**
 * Forcer la création de préférences
 */
export const forceCreatePreferences = async () => {
  console.log('⚙️ Création forcée de préférences...');

  try {
    const response = await api.post('/intelligent-agent/test/create-preferences');
    console.log('✅ Préférences créées:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erreur lors de la création de préférences:', error);
    throw error;
  }
};

/**
 * Tester la sauvegarde complète
 */
export const testAgentSettings = async () => {
  console.log('🧪 Test complet des paramètres agent...');

  try {
    // 1. Diagnostic initial
    const diagnosis = await diagnoseAgentAPI();

    // 2. Créer agent et préférences si nécessaire
    if (!diagnosis.diagnosis.agent.exists) {
      await forceCreateAgent();
    }

    if (!diagnosis.diagnosis.preferences.exists) {
      await forceCreatePreferences();
    }

    // 3. Test de lecture
    console.log('📖 Test de lecture des paramètres...');
    const getResponse = await api.get('/intelligent-agent/settings');
    console.log('✅ Paramètres récupérés:', getResponse.data);

    // 4. Test de sauvegarde
    console.log('💾 Test de sauvegarde...');
    const updateData = {
      name: 'Assistant Test',
      communication_tone: 'casual',
      proactive_suggestions: true,
      auto_learning: false,
      confidence_threshold: 0.8,
    };

    const updateResponse = await api.put('/intelligent-agent/settings', updateData);
    console.log('✅ Sauvegarde réussie:', updateResponse.data);

    // 5. Vérification de persistance
    console.log('🔄 Vérification de persistance...');
    const verifyResponse = await api.get('/intelligent-agent/settings');
    console.log('✅ Données vérifiées:', verifyResponse.data);

    return {
      success: true,
      tests: {
        diagnosis: diagnosis,
        get: getResponse.data,
        update: updateResponse.data,
        verify: verifyResponse.data
      }
    };

  } catch (error) {
    console.error('❌ Échec du test complet:', error);
    throw error;
  }
};

// Exposer les fonctions globalement pour faciliter les tests en console
if (typeof window !== 'undefined') {
  (window as any).agentTestUtils = {
    resetAgentForTesting,
    generateTestNotifications,
    enableAgentDebugMode,
    disableAgentDebugMode,
    checkAgentStatus,
    forceShowIntroPopup,
    simulateLongSession,
    diagnoseAgentAPI,
    forceCreateAgent,
    forceCreatePreferences,
    testAgentSettings
  };

  console.log('🧪 Agent Test Utils disponibles via window.agentTestUtils');
  console.log('📚 Fonctions disponibles:');
  console.log('  - resetAgentForTesting(): Réinitialise tout');
  console.log('  - generateTestNotifications(): Génère des notifications de test');
  console.log('  - forceShowIntroPopup(): Force l\'affichage du popup');
  console.log('  - checkAgentStatus(): Affiche l\'état actuel');
  console.log('  - simulateLongSession(): Simule une session longue');
  console.log('  - enableAgentDebugMode(): Active le mode debug');
  console.log('  🆕 API TESTS:');
  console.log('  - diagnoseAgentAPI(): Diagnostic complet de l\'API');
  console.log('  - testAgentSettings(): Test complet sauvegarde/chargement');
  console.log('  - forceCreateAgent(): Créer un agent forcément');
  console.log('  - forceCreatePreferences(): Créer des préférences forcément');
}

export default {
  resetAgentForTesting,
  generateTestNotifications,
  enableAgentDebugMode,
  disableAgentDebugMode,
  checkAgentStatus,
  forceShowIntroPopup,
  simulateLongSession,
  diagnoseAgentAPI,
  forceCreateAgent,
  forceCreatePreferences,
  testAgentSettings
};