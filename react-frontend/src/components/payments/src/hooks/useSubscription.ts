
import { useState, useEffect } from 'react';

interface SubscriptionState {
  currentPlan: string | null;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const useSubscription = (initialPlan?: string) => {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    currentPlan: initialPlan || null,
    isLoading: false,
    lastUpdated: null
  });

  const updateCurrentPlan = (newPlan: string) => {
    console.log('Updating current plan to:', newPlan);
    setSubscriptionState(prev => ({
      ...prev,
      currentPlan: newPlan,
      lastUpdated: new Date()
    }));
    
    // Simuler la sauvegarde en localStorage pour persistance
    localStorage.setItem('currentPlan', newPlan);
    localStorage.setItem('planLastUpdated', new Date().toISOString());
  };

  const refreshPlanStatus = () => {
    setSubscriptionState(prev => ({ ...prev, isLoading: true }));
    
    // Simuler un appel API pour vérifier le plan actuel
    setTimeout(() => {
      const savedPlan = localStorage.getItem('currentPlan');
      if (savedPlan && savedPlan !== subscriptionState.currentPlan) {
        setSubscriptionState(prev => ({
          ...prev,
          currentPlan: savedPlan,
          isLoading: false,
          lastUpdated: new Date()
        }));
      } else {
        setSubscriptionState(prev => ({ ...prev, isLoading: false }));
      }
    }, 1000);
  };

  // Charger le plan depuis localStorage au montage
  useEffect(() => {
    const savedPlan = localStorage.getItem('currentPlan');
    if (savedPlan && !subscriptionState.currentPlan) {
      setSubscriptionState(prev => ({
        ...prev,
        currentPlan: savedPlan,
        lastUpdated: new Date()
      }));
    }
  }, []);

  return {
    currentPlan: subscriptionState.currentPlan,
    isLoading: subscriptionState.isLoading,
    lastUpdated: subscriptionState.lastUpdated,
    updateCurrentPlan,
    refreshPlanStatus
  };
};
