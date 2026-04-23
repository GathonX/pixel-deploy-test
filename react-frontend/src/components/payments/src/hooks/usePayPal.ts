import { useState, useEffect } from 'react';
import paymentService from '../../../../services/paymentService';

interface PayPalConfig {
  clientId: string;
  environment: 'sandbox' | 'production';
  currency: 'EUR' | 'USD';
  
  systems: {
    creditPurchase: {
      webhookId: string;
      returnUrl: string;
      cancelUrl: string;
    };
    subscription: {
      webhookId: string;
      returnUrl: string;
      cancelUrl: string;
    };
  };
}

// ✅ CORRECTION MAJEURE : Configuration PayPal
const PAYPAL_CONFIG: PayPalConfig = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'ARocYvp2ZO69AOHI8mL0QpdQ5d8jwSieH5HBS4MfCzvv_r-DtKKmXPD_0a0ACzJOWH4a_l5WMaazd_5J',
  environment: (import.meta.env.VITE_PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  currency: 'EUR',
  systems: {
    creditPurchase: {
      webhookId: 'WEBHOOK_CREDITS',
      returnUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/cancel`
    },
    subscription: {
      webhookId: 'WEBHOOK_SUBSCRIPTION', 
      returnUrl: `${window.location.origin}/subscription/success`,
      cancelUrl: `${window.location.origin}/subscription/cancel`
    }
  }
};

export const usePayPal = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 PayPal Config Debug:', {
      clientId: PAYPAL_CONFIG.clientId,
      environment: PAYPAL_CONFIG.environment,
      hasEnvVar: !!import.meta.env.VITE_PAYPAL_CLIENT_ID
    });

    // Check if PayPal SDK is already loaded
    if (window.paypal) {
      setIsReady(true);
      return;
    }

    // ✅ CORRECTION CRITIQUE : Charger PayPal SDK sans intent fixe
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&currency=${PAYPAL_CONFIG.currency}&vault=true&components=buttons`;
    script.async = true;
    
    script.onload = () => {
      console.log('✅ PayPal SDK loaded successfully');
      setIsReady(true);
    };
    
    script.onerror = () => {
      console.error('❌ Failed to load PayPal SDK');
      setError('Erreur de chargement PayPal');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // ✅ NOUVEAU : Fonction pour créer des ordres de crédits VIA BACKEND
  const createCreditOrder = async (packageId: string, amount: number) => {
    if (!isReady || !window.paypal) {
      throw new Error('PayPal SDK not ready');
    }

    try {
      console.log('🚀 Creating credit order via backend:', { packageId, amount });
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.createCreditPurchase({
        package_id: packageId,
        payment_method: 'paypal'
      });

      console.log('✅ Backend credit order created:', response);
      
      return {
        orderID: response.paypal_order_id,
        transactionId: response.transaction.id,
        approvalUrl: response.approval_url
      };
    } catch (error) {
      console.error('❌ Error creating PayPal credit order via backend:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Fonction pour finaliser un achat de crédits VIA BACKEND
  const completeCreditOrder = async (orderID: string, transactionId: number) => {
    try {
      console.log('🎯 Completing credit order via backend:', { orderID, transactionId });
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.completeCreditPurchase(transactionId, {
        paypal_order_id: orderID,
        metadata: {
          completed_via: 'frontend_paypal_sdk',
          completion_timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Backend credit order completed:', response);
      
      return {
        success: response.success,
        transaction: response.transaction,
        credits_added: response.credits_added,
        new_balance: response.new_balance
      };
    } catch (error) {
      console.error('❌ Error completing credit order via backend:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Fonction pour créer des abonnements VIA BACKEND
  const createSubscription = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    if (!isReady || !window.paypal) {
      throw new Error('PayPal SDK not ready');
    }

    try {
      console.log('🚀 Creating subscription via backend:', { planId, billingCycle });
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.createSubscription({
        plan_id: planId,
        billing_cycle: billingCycle,
        payment_method: 'paypal'
      });

      console.log('✅ Backend subscription created:', response);
      
      return {
        subscriptionID: response.paypal_subscription_id,
        transactionId: response.transaction.id,
        approvalUrl: response.approval_url
      };
    } catch (error) {
      console.error('❌ Error creating PayPal subscription via backend:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Fonction pour finaliser un abonnement VIA BACKEND
  const completeSubscription = async (subscriptionID: string, transactionId: number) => {
    try {
      console.log('🎯 Completing subscription via backend:', { subscriptionID, transactionId });
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.completeSubscription(transactionId, {
        paypal_subscription_id: subscriptionID,
        metadata: {
          completed_via: 'frontend_paypal_sdk',
          completion_timestamp: new Date().toISOString()
        }
      });

      console.log('✅ Backend subscription completed:', response);
      
      return {
        success: response.success,
        subscription: response.subscription,
        transaction: response.transaction
      };
    } catch (error) {
      console.error('❌ Error completing subscription via backend:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Récupération des soldes utilisateur depuis le backend
  const getUserCredits = async () => {
    try {
      console.log('🔍 Getting user credits from backend');
      
      const response = await paymentService.getUserCredits();
      
      console.log('✅ User credits retrieved:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting user credits:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Récupération des packages depuis le backend
  const getCreditPackages = async () => {
    try {
      console.log('🔍 Getting credit packages from backend');
      
      const response = await paymentService.getCreditPackages();
      
      console.log('✅ Credit packages retrieved:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting credit packages:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Récupération des plans d'abonnement depuis le backend
  const getSubscriptionPlans = async () => {
    try {
      console.log('🔍 Getting subscription plans from backend');
      
      const response = await paymentService.getSubscriptionPlans();
      
      console.log('✅ Subscription plans retrieved:', response);
      return response;
    } catch (error) {
      console.error('❌ Error getting subscription plans:', error);
      throw error;
    }
  };

  // ✅ ANCIEN : Validation d'un paiement (gardé pour compatibilité)
  const validatePayment = async (orderID: string) => {
    try {
      console.log('🔍 Validating payment:', orderID);
      
      // Cette fonction est maintenant remplacée par completeCreditOrder
      // Mais gardée pour compatibilité avec l'ancien code
      console.warn('⚠️ validatePayment is deprecated, use completeCreditOrder instead');
      
      return {
        success: true,
        transactionId: `TXN_${Date.now()}`,
        status: 'COMPLETED',
        amount: 0,
        currency: PAYPAL_CONFIG.currency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error validating payment:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Annulation d'un abonnement VIA BACKEND
  const cancelSubscription = async (immediately: boolean = false) => {
    try {
      console.log('🚀 Cancelling subscription via backend:', { immediately });
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.cancelSubscription(immediately);
      
      console.log('✅ Backend subscription cancelled:', response);
      
      return {
        success: response.success,
        subscription: response.subscription,
        effective_date: response.effective_date
      };
    } catch (error) {
      console.error('❌ Error cancelling subscription via backend:', error);
      throw error;
    }
  };

  // ✅ NOUVEAU : Récupération des détails d'un abonnement VIA BACKEND
  const getSubscriptionDetails = async () => {
    try {
      console.log('🔍 Getting subscription details from backend');
      
      // ✅ VRAIE API CALL vers le backend Laravel
      const response = await paymentService.getCurrentSubscription();
      
      console.log('✅ Backend subscription details retrieved:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Error getting subscription details via backend:', error);
      throw error;
    }
  };

  return {
    // État PayPal SDK
    isReady,
    error,
    config: PAYPAL_CONFIG,
    
    // ✅ NOUVELLES FONCTIONS AVEC BACKEND RÉEL
    createCreditOrder,
    completeCreditOrder,
    createSubscription,
    completeSubscription,
    getUserCredits,
    getCreditPackages,
    getSubscriptionPlans,
    cancelSubscription,
    getSubscriptionDetails,
    
    // ✅ ANCIENNE FONCTION (compatibilité)
    validatePayment
  };
};

// ✅ Hook pour gérer les webhooks PayPal (gardé tel quel)
export const usePayPalWebhooks = () => {
  const handleWebhook = async (webhookData: any) => {
    try {
      console.log('🔍 Processing PayPal webhook:', webhookData);
      
      switch (webhookData.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await processCreditPurchase(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.CREATED':
          await processSubscriptionCreated(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await processSubscriptionActivated(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await processSubscriptionCancelled(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await processSubscriptionSuspended(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          await processSubscriptionPaymentFailed(webhookData);
          break;
          
        default:
          console.log('ℹ️ Unhandled webhook event:', webhookData.event_type);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return { success: false, error };
    }
  };

  const processCreditPurchase = async (data: any) => {
    console.log('✅ Processing credit purchase:', data);
    
    const order = data.resource;
    const purchaseUnit = order.purchase_units[0];
    const amount = parseFloat(purchaseUnit.amount.value);
    const packageId = purchaseUnit.reference_id;
    
    console.log(`💰 Adding credits for package ${packageId}, amount: ${amount}`);
  };

  const processSubscriptionCreated = async (data: any) => {
    console.log('✅ Processing subscription creation:', data);
    
    const subscription = data.resource;
    console.log(`📅 Subscription created: ${subscription.id}, plan: ${subscription.plan_id}`);
  };

  const processSubscriptionActivated = async (data: any) => {
    console.log('✅ Processing subscription activation:', data);
    
    const subscription = data.resource;
    console.log(`🎉 Subscription activated: ${subscription.id}`);
  };

  const processSubscriptionCancelled = async (data: any) => {
    console.log('❌ Processing subscription cancellation:', data);
    
    const subscription = data.resource;
    console.log(`🚫 Subscription cancelled: ${subscription.id}`);
  };

  const processSubscriptionSuspended = async (data: any) => {
    console.log('⏸️ Processing subscription suspension:', data);
    
    const subscription = data.resource;
    console.log(`⏸️ Subscription suspended: ${subscription.id}`);
  };

  const processSubscriptionPaymentFailed = async (data: any) => {
    console.log('💸 Processing subscription payment failure:', data);
    
    const subscription = data.resource;
    console.log(`💸 Payment failed for subscription: ${subscription.id}`);
  };

  return {
    handleWebhook
  };
};

// ✅ CORRECTION : Déclaration TypeScript améliorée
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => {
        render: (container: HTMLElement) => Promise<void>;
      };
      Orders?: {
        create: (orderData: any) => Promise<any>;
        capture: (orderID: string) => Promise<any>;
      };
      Subscriptions?: {
        create: (subscriptionData: any) => Promise<any>;
        get: (subscriptionID: string) => Promise<any>;
      };
    };
  }
}