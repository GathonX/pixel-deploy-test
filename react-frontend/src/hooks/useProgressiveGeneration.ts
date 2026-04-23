// src/hooks/useProgressiveGeneration.ts
// ✅ HOOK SÉCURISÉ POUR GÉNÉRATION PROGRESSIVE GLOBALE AVEC NOTIFICATIONS RICHES
import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserTypeNotifications } from "@/hooks/useUserTypeNotifications";
import api from "@/services/api";

interface UseProgressiveGenerationProps {
  featureKey: 'blog' | 'social_media';
  onPostGenerated?: (post: any) => void;
  enabled?: boolean;
  currentPage?: string; // ✅ NOUVEAU : Page actuelle pour notifications contextuelles
}

interface GenerationResponse {
  success: boolean;
  message: string;
  posts_generated: number;
  posts_remaining: number;
  total_generated?: number;
  target_total?: number;
  content_type?: string;
  next_generation_at?: string;
}

/**
 * ✅ HOOK CENTRALISÉ POUR GÉNÉRATION PROGRESSIVE
 * 
 * Avantages:
 * - Logique partagée entre pages
 * - Timers persistants avec localStorage
 * - Gestion d'erreurs centralisée
 * - Toasts cohérents
 */
export const useProgressiveGeneration = ({
  featureKey,
  onPostGenerated,
  enabled = true,
  currentPage
}: UseProgressiveGenerationProps) => {
  const { user } = useAuth();
  const {
    notifyFreeUserLimitation,
    notifyFeatureNotPurchased,
    getPageContextualSuggestions
  } = useUserTypeNotifications();
  const timersRef = useRef<{
    initial?: NodeJS.Timeout;
    interval?: NodeJS.Timeout;
  }>({});

  // ✅ Clés de stockage pour persistance
  const STORAGE_KEY = `progressive_generation_${featureKey}_${user?.id}`;
  const LAST_GENERATION_KEY = `last_generation_${featureKey}_${user?.id}`;

  /**
   * ✅ FONCTION DE GÉNÉRATION CENTRALISÉE
   */
  const generateRemainingPosts = useCallback(async () => {
    if (!user || !enabled) {
      console.log(`⚠️ [useProgressiveGeneration] Génération annulée - user: ${!!user}, enabled: ${enabled}`);
      return;
    }

    try {
      console.log(`🎯 [useProgressiveGeneration] Tentative génération ${featureKey}...`, {
        user_id: user.id,
        user_name: user.name,
        feature_key: featureKey,
        timestamp: new Date().toISOString()
      });

      const response = await api.post('/features/generate-remaining', {
        feature_key: featureKey
      });

      const result: GenerationResponse = response.data;

      if (result.success && result.posts_generated > 0) {
        // ✅ Succès avec génération
        console.log(`✅ [useProgressiveGeneration] ${result.posts_generated} post(s) ${featureKey} généré(s)`);
        
        // Stocker la dernière génération réussie
        localStorage.setItem(LAST_GENERATION_KEY, new Date().toISOString());
        
        // Toast de succès
        toast.success(`✨ Nouveau ${featureKey === 'blog' ? 'article' : 'post social'} généré !`, {
          description: result.message,
          duration: 4000,
          action: {
            label: "Voir",
            onClick: () => console.log(`Voir ${featureKey} généré`)
          }
        });

        // Callback pour mettre à jour la page si fourni
        if (onPostGenerated && result) {
          onPostGenerated(result);
        }

        // ✅ Si génération terminée, arrêter les timers
        if (result.posts_remaining === 0) {
          console.log(`🎉 [useProgressiveGeneration] Génération ${featureKey} terminée`);
          clearTimers();
          localStorage.removeItem(STORAGE_KEY);
        }

      } else if (result.success && result.posts_generated === 0) {
        // ✅ Pas de post à générer pour le moment
        console.log(`ℹ️ [useProgressiveGeneration] Pas de génération ${featureKey} nécessaire`);
        
        // Si aucun post restant, arrêter les timers
        if (result.posts_remaining === 0) {
          clearTimers();
          localStorage.removeItem(STORAGE_KEY);
        }
      } else {
        // ❌ Échec de génération
        console.warn(`⚠️ [useProgressiveGeneration] Échec génération ${featureKey}:`, result.message);
      }

    } catch (error: any) {
      console.error(`❌ [useProgressiveGeneration] Erreur génération ${featureKey}:`, error);

      // ✅ NOUVEAU : Gestion spécifique des erreurs 403 avec distinction utilisateur
      if (error.response?.status === 403) {
        const errorData = error.response?.data;

        if (errorData?.user_type === 'free' && errorData?.reason === 'no_paid_features') {
          // ✅ Utilisateur gratuit sans fonctionnalités payantes
          console.warn('🚫 [PROGRESSIVE] Utilisateur gratuit détecté - arrêt génération', {
            featureKey,
            user_type: errorData.user_type,
            reason: errorData.reason,
            current_page: currentPage
          });

          // Arrêter complètement la génération progressive
          clearTimers();
          localStorage.removeItem(STORAGE_KEY);

          // ✅ NOUVEAU : Notification riche multicouche pour utilisateur gratuit
          notifyFreeUserLimitation({
            featureKey,
            currentPage,
            persistent: true, // Banner persistant car limitation importante
            showBanner: true, // Banner visible sur la page
            showToast: true,  // Toast léger
            showSystemNotification: false, // Pas de notification système (trop intrusif)
            customMessage: errorData.suggestion ||
              `La génération automatique ${featureKey === 'blog' ? 'd\'articles' : 'de posts sociaux'} est réservée aux clients avec des fonctionnalités payantes.`
          });

          return; // Arrêter complètement

        } else if (errorData?.user_type === 'paid' && errorData?.reason === 'feature_not_purchased') {
          // ✅ Utilisateur payant sans cette fonctionnalité spécifique
          console.warn('🚫 [PROGRESSIVE] Utilisateur payant sans cette fonctionnalité', {
            featureKey,
            user_type: errorData.user_type,
            reason: errorData.reason,
            current_page: currentPage
          });

          // Arrêter la génération pour cette fonctionnalité spécifique
          clearTimers();
          localStorage.removeItem(STORAGE_KEY);

          // ✅ NOUVEAU : Notification ciblée pour utilisateur payant
          notifyFeatureNotPurchased({
            featureKey,
            currentPage,
            persistent: false, // Banner temporaire car c'est un achat spécifique
            showBanner: true,
            showToast: true,
            customMessage: errorData.suggestion ||
              `Vous devez acheter la fonctionnalité "${featureKey}" pour accéder à la génération automatique.`
          });

          return; // Arrêter complètement
        }

        // ✅ Autres erreurs 403 (permissions, expiration, etc.)
        console.warn('🚫 [PROGRESSIVE] Erreur d\'autorisation', {
          featureKey,
          status: 403,
          message: errorData?.message
        });

        // Toast générique pour erreur 403
        toast.error(`🔒 Accès refusé`, {
          description: errorData?.message || 'Vérifiez vos permissions',
          duration: 6000
        });

        // Arrêter la génération en cas d'erreur 403
        clearTimers();
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // ✅ Gestion d'autres erreurs (429, 500, réseau, etc.)
      if (error.response?.status !== 429) {
        console.warn(`⚠️ [useProgressiveGeneration] Erreur ${featureKey}, retry au prochain intervalle`);
      }

      // En cas d'erreur répétée, espacer les tentatives
      const lastError = localStorage.getItem(`${STORAGE_KEY}_last_error`);
      const now = new Date().toISOString();

      if (lastError) {
        const errorTime = new Date(lastError);
        const diffMinutes = (new Date().getTime() - errorTime.getTime()) / (1000 * 60);

        // Si erreurs fréquentes, ralentir les tentatives
        if (diffMinutes < 5) {
          console.log(`🐌 [useProgressiveGeneration] Ralentissement temporaire des tentatives ${featureKey}`);
          return;
        }
      }

      localStorage.setItem(`${STORAGE_KEY}_last_error`, now);
    }
  }, [user, enabled, featureKey, onPostGenerated, STORAGE_KEY, LAST_GENERATION_KEY]);

  /**
   * ✅ NETTOYER LES TIMERS
   */
  const clearTimers = useCallback(() => {
    if (timersRef.current.initial) {
      clearTimeout(timersRef.current.initial);
      timersRef.current.initial = undefined;
    }
    if (timersRef.current.interval) {
      clearInterval(timersRef.current.interval);
      timersRef.current.interval = undefined;
    }
    console.log(`🧹 [useProgressiveGeneration] Timers ${featureKey} nettoyés`);
  }, [featureKey]);

  /**
   * ✅ DÉMARRER LA GÉNÉRATION PROGRESSIVE
   */
  const startProgressiveGeneration = useCallback(() => {
    if (!user || !enabled) return;

    console.log(`🚀 [useProgressiveGeneration] Démarrage génération progressive ${featureKey}`);

    // Marquer comme actif dans le localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      feature_key: featureKey,
      user_id: user.id,
      started_at: new Date().toISOString(),
      status: 'active'
    }));

    // Nettoyer les anciens timers au cas où
    clearTimers();

    // ✅ TEMPORAIRE : Réduction drastique pour éviter génération excessive
    // Première vérification après 30 minutes au lieu de 3 minutes
    timersRef.current.initial = setTimeout(generateRemainingPosts, 30 * 60 * 1000);

    // ✅ TEMPORAIRE : Puis toutes les 6 heures au lieu de 3 minutes
    timersRef.current.interval = setInterval(generateRemainingPosts, 6 * 60 * 60 * 1000);

    console.log(`⏰ [useProgressiveGeneration] Timers ${featureKey} programmés: 3min + 3min intervals`);
  }, [user, enabled, featureKey, generateRemainingPosts, clearTimers, STORAGE_KEY]);

  /**
   * ✅ ARRÊTER LA GÉNÉRATION PROGRESSIVE
   */
  const stopProgressiveGeneration = useCallback(() => {
    console.log(`🛑 [useProgressiveGeneration] Arrêt génération progressive ${featureKey}`);
    clearTimers();
    localStorage.removeItem(STORAGE_KEY);
  }, [featureKey, clearTimers, STORAGE_KEY]);

  /**
   * ✅ VÉRIFIER SI LA GÉNÉRATION EST ACTIVE
   */
  const isGenerationActive = useCallback((): boolean => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    try {
      const data = JSON.parse(stored);
      return data.status === 'active' && data.user_id === user?.id;
    } catch {
      return false;
    }
  }, [STORAGE_KEY, user?.id]);

  /**
   * ✅ EFFET PRINCIPAL - GESTION DU CYCLE DE VIE
   */
  useEffect(() => {
    if (!user || !enabled) {
      clearTimers();
      return;
    }

    // ✅ Auto-démarrage si génération déjà active (persistance entre pages)
    if (isGenerationActive()) {
      console.log(`🔄 [useProgressiveGeneration] Reprise génération ${featureKey} persistée`);
      startProgressiveGeneration();
    }

    // ✅ Nettoyage à la désactivation du hook
    return () => {
      clearTimers();
    };
  }, [user, enabled, featureKey, startProgressiveGeneration, clearTimers, isGenerationActive]);

  // ✅ Interface publique du hook
  return {
    startProgressiveGeneration,
    stopProgressiveGeneration,
    generateNow: generateRemainingPosts,
    isActive: isGenerationActive(),
    clearTimers
  };
};