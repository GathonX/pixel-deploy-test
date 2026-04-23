import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import paymentService from '../../../../services/paymentService';

// ✅ TYPES SIMPLES ET MAINTENABLES
interface PaymentFormProps {
  type: 'credit' | 'subscription';
  item: {
    id: string;
    name: string;
    price: number;
    description: string;
    credits?: number;
    billingCycle?: 'monthly' | 'yearly';
  };
  onBack: () => void;
  onSuccess: (result: unknown) => void;
}

interface PaymentState {
  isLoading: boolean;
  isPayPalReady: boolean;
  transactionId?: string;
  error?: string;
  currentStep: 'form' | 'processing' | 'completed';
  showManualRedirect?: boolean;
  approvalUrl?: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ type, item, onBack, onSuccess }) => {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isLoading: false,
    isPayPalReady: false,
    currentStep: 'form',
  });

  const { toast } = useToast();

  // ✅ CONFIGURATION PAYPAL
  const PAYPAL_CONFIG = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'AaBe036Gpdjjbb2CPDL1guDOsLsJDqTqJm38mb9eGA05iEkiy60fpBi8iDmFB-2vSobM36e37PSdfFFn',
    currency: 'EUR',
    environment: import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox',
  };

  // ✅ CHARGEMENT PAYPAL SDK (facultatif maintenant)
  useEffect(() => {
    setPaymentState((prev) => ({ ...prev, isPayPalReady: true }));
  }, []);

  // ✅ INITIALISATION BOUTONS PAYPAL
  useEffect(() => {
    if (!paymentState.isPayPalReady) return;

    const initializePaymentButtons = async () => {
      try {
        console.log('🔍 Initialisation boutons PayPal pour type:', type);
        if (type === 'credit') {
          await initializeCreditPayment();
        } else {
          await initializeSubscriptionPayment();
        }
      } catch (error) {
        console.error('❌ Erreur initialisation PayPal:', error);
        setPaymentState((prev) => ({
          ...prev,
          error: 'Erreur d\'initialisation PayPal',
        }));
        toast({
          title: 'Erreur',
          description: 'Erreur lors de l\'initialisation du paiement',
          variant: 'destructive',
        });
      }
    };

    initializePaymentButtons();
  }, [paymentState.isPayPalReady, type, item]);

  // ✅ FONCTION UNIVERSELLE : Créer ordre et rediriger
  const createOrderAndRedirect = async (paymentMethod: 'paypal' | 'card') => {
    try {
      console.log(`🚀 Création commande ${paymentMethod}:`, item);

      if (!item.id) {
        throw new Error('ID du package manquant');
      }

      setPaymentState((prev) => ({
        ...prev,
        isLoading: true,
        currentStep: 'processing',
      }));

      let response;
      if (type === 'credit') {
        response = await paymentService.createCreditPurchase({
          package_id: item.id,
          payment_method: paymentMethod,
          billing_info: {
            email: 'user@example.com',
            first_name: 'User',
            last_name: 'Name',
          },
        });
      } else {
        response = await paymentService.createSubscription({
          plan_id: item.id,
          billing_cycle: item.billingCycle || 'monthly',
          payment_method: paymentMethod,
          billing_info: {
            email: 'user@example.com',
            first_name: 'User',
            last_name: 'Name',
          },
        });
      }

      console.log(`✅ Commande ${paymentMethod} créée:`, response);

      if (!response.approval_url) {
        throw new Error('URL d\'approbation manquante');
      }

      // Vérifier si l'URL permet le Guest Checkout
      const guestCheckoutUrl = response.approval_url.includes('useraction=commit')
        ? response.approval_url
        : `${response.approval_url}&useraction=commit`;

      setPaymentState((prev) => ({
        ...prev,
        transactionId: response.transaction?.id?.toString(),
        approvalUrl: guestCheckoutUrl,
        showManualRedirect: true,
      }));

      // ✅ REDIRECTION IMMÉDIATE vers PayPal avec Guest Checkout
      console.log('🔄 Redirection vers PayPal:', guestCheckoutUrl);
      window.location.href = guestCheckoutUrl;

    } catch (error: any) {
      console.error(`❌ Erreur création commande ${paymentMethod}:`, error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la commande',
        variant: 'destructive',
      });
      setPaymentState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: 'form',
        error: error.message || 'Erreur création commande',
      }));
      throw error;
    }
  };

  // ✅ PAIEMENT CRÉDITS - VERSION SIMPLIFIÉE
  const initializeCreditPayment = async () => {
    const buttonContainer = document.getElementById('paypal-button-container') as HTMLElement;
    const cardButtonContainer = document.getElementById('card-button-container') as HTMLElement;

    if (!buttonContainer || !cardButtonContainer) {
      console.error('❌ Conteneurs PayPal ou carte bancaire introuvables');
      return;
    }

    buttonContainer.innerHTML = '';
    cardButtonContainer.innerHTML = '';

    // ✅ BOUTON PAYPAL SIMPLE
    const paypalButton = document.createElement('button');
    paypalButton.className = 'w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors';
    paypalButton.innerHTML = '💳 Payer avec PayPal ou carte';
    paypalButton.onclick = () => createOrderAndRedirect('paypal');
    buttonContainer.appendChild(paypalButton);

    // ✅ BOUTON CARTE SIMPLE (optionnel, peut être combiné avec PayPal)
    const cardButton = document.createElement('button');
    cardButton.className = 'w-full h-12 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-md transition-colors';
    cardButton.innerHTML = '💳 Payer par carte bancaire';
    cardButton.onclick = () => createOrderAndRedirect('card');
    cardButtonContainer.appendChild(cardButton);
  };

  // ✅ ABONNEMENTS (avec lien statique ou dynamique)
  const initializeSubscriptionPayment = async () => {
    const buttonContainer = document.getElementById('paypal-button-container') as HTMLElement;
    if (!buttonContainer) {
      console.error('❌ Conteneur PayPal introuvable');
      return;
    }

    buttonContainer.innerHTML = '';

    const subscribeButton = document.createElement('button');
    subscribeButton.className = 'w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors';
    subscribeButton.innerHTML = '🔄 S\'abonner avec PayPal ou carte';
    subscribeButton.onclick = async () => {
      try {
        setPaymentState((prev) => ({
          ...prev,
          isLoading: true,
          currentStep: 'processing',
        }));

        const response = await paymentService.createSubscription({
          plan_id: item.id,
          billing_cycle: item.billingCycle || 'monthly',
          payment_method: 'paypal',
          billing_info: {
            email: 'user@example.com',
            first_name: 'User',
            last_name: 'Name',
          },
        });

        let approvalUrl = response.approval_url;
        if (!approvalUrl) {
          approvalUrl = 'https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=P-41G17417VX871353KNBW7NWA';
        }

        // Ajouter paramètre pour Guest Checkout si absent
        const guestCheckoutUrl = approvalUrl.includes('useraction=commit')
          ? approvalUrl
          : `${approvalUrl}&useraction=commit`;

        setPaymentState((prev) => ({
          ...prev,
          transactionId: response.transaction?.id?.toString(),
          approvalUrl: guestCheckoutUrl,
          showManualRedirect: true,
        }));

        window.location.href = guestCheckoutUrl;
      } catch (error: any) {
        console.error('❌ Erreur création abonnement:', error);
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible de créer l\'abonnement',
          variant: 'destructive',
        });
        setPaymentState((prev) => ({
          ...prev,
          isLoading: false,
          currentStep: 'form',
        }));
      }
    };
    buttonContainer.appendChild(subscribeButton);
  };

  // ✅ GESTIONNAIRE RETOUR PAYPAL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const paymentId = urlParams.get('PayerID');
    
    if (token && paymentId && paymentState.transactionId) {
      handlePayPalReturn(token, paymentId);
    }
  }, [paymentState.transactionId]);

  const handlePayPalReturn = async (token: string, payerId: string) => {
    try {
      console.log('🔄 Retour PayPal détecté:', { token, payerId });
      
      setPaymentState((prev) => ({
        ...prev,
        isLoading: true,
        currentStep: 'processing',
      }));

      if (!paymentState.transactionId) {
        throw new Error('Transaction ID manquant');
      }

      const result = await paymentService.completeCreditPurchase(
        parseInt(paymentState.transactionId),
        { paypal_order_id: token }
      );

      console.log('✅ Paiement finalisé:', result);

      setPaymentState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: 'completed',
      }));

      toast({
        title: 'Paiement réussi !',
        description: `${item.credits} crédits ajoutés à votre compte`,
      });

      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      onSuccess(result);
    } catch (error: any) {
      console.error('❌ Erreur finalisation:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la finalisation du paiement',
        variant: 'destructive',
      });
      setPaymentState((prev) => ({
        ...prev,
        isLoading: false,
        currentStep: 'form',
        error: 'Erreur finalisation paiement',
      }));
    }
  };

  // ✅ CALCUL TVA
  const calculateTax = (price: number) => (price * 0.2).toFixed(2);
  const calculateTotal = (price: number) => (price * 1.2).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">{type === 'credit' ? 'Achat de crédits' : 'Abonnement'}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Paiement sécurisé
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentState.isLoading && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="text-center">
                      {paymentState.showManualRedirect 
                        ? 'Redirection vers PayPal en cours...' 
                        : 'Traitement en cours...'
                      }
                    </span>
                    {paymentState.approvalUrl && (
                      <div className="text-center space-y-2">
                        <p className="text-sm text-gray-600">Si la redirection ne fonctionne pas :</p>
                        <Button 
                          onClick={() => window.location.href = paymentState.approvalUrl!}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Cliquez ici pour continuer le paiement
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {paymentState.error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-md mb-4">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-700">{paymentState.error}</span>
                  </div>
                )}

                {paymentState.currentStep === 'form' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <h3 className="font-semibold text-lg mb-2">Paiement sécurisé</h3>
                      <p className="text-gray-600 text-sm">Payez avec une carte bancaire sans connexion</p>
                    </div>

                    <div className="space-y-4">
                      <div id="paypal-button-container" className="min-h-[60px]">
                        {!paymentState.isPayPalReady && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="ml-2">Chargement PayPal...</span>
                          </div>
                        )}
                      </div>
                      
                      {type === 'credit' && (
                        <div id="card-button-container" className="min-h-[60px]">
                          {!paymentState.isPayPalReady && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                              <span className="ml-2">Chargement paiement par carte...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm mt-4">
                      <Shield className="h-4 w-4" />
                      <span>Paiement 100% sécurisé</span>
                    </div>
                  </div>
                )}

                {paymentState.currentStep === 'completed' && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Paiement réussi !</h3>
                    <p className="text-gray-600">
                      {type === 'credit' ? `${item.credits} crédits ajoutés à votre compte` : `Abonnement ${item.name} activé`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Récapitulatif de commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>

                  {item.credits && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Crédits inclus:</span>
                      <Badge variant="secondary">{item.credits} crédits</Badge>
                    </div>
                  )}

                  {item.billingCycle && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Facturation:</span>
                      <Badge variant="secondary">{item.billingCycle === 'monthly' ? 'Mensuelle' : 'Annuelle'}</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{item.price}€</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>TVA (20%)</span>
                    <span>{calculateTax(item.price)}€</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{calculateTotal(item.price)}€</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-gray-500">
                  <p>✓ Paiement sécurisé avec chiffrement SSL</p>
                  <p>✓ Remboursement sous 30 jours</p>
                  <p>✓ Support client 24/7</p>
                  <p>✓ Facture automatique par email</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;