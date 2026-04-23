// src/components/payments/src/components/PaymentManager.tsx
// ✅ INTÉGRATION : PaymentService API complètement intégré
// ✅ PRÉSERVATION : Design et structure existants maintenus
// ✅ CORRECTION : Import des types depuis paymentService.ts

import React, { useState } from 'react';
import PaymentForm from './PaymentForm';
import PaymentSuccess from './PaymentSuccess';
import { useToast } from '../hooks/use-toast';

// ✅ IMPORT CORRIGÉ : Depuis paymentService au lieu de types locaux
import paymentService from '../../../../services/paymentService';

interface PaymentItem {
  id: string;
  name: string;
  price: number;
  credits?: number;
  billingCycle?: 'monthly' | 'yearly';
  description: string;
}

interface PaymentManagerProps {
  type: 'credit' | 'subscription';
  item: PaymentItem;
  isOpen: boolean;
  onClose: () => void;
  onPlanChange?: (newPlan: string) => void;
}

const PaymentManager: React.FC<PaymentManagerProps> = ({ 
  type, 
  item, 
  isOpen, 
  onClose, 
  onPlanChange 
}) => {
  const [currentStep, setCurrentStep] = useState<'form' | 'success'>('form');
  const [paymentResult, setPaymentResult] = useState<unknown>(null);
  
  const { toast } = useToast();

  if (!isOpen) return null;

  // ✅ FONCTION API : Gérer le succès du paiement
  const handlePaymentSuccess = async (result: unknown) => {
    try {
      console.log('Payment successful, processing result:', result);
      
      // ✅ MISE À JOUR : Rafraîchir les données après paiement réussi
      if (type === 'credit') {
        // Rafraîchir le solde des crédits
        try {
          const updatedCredits = await paymentService.getUserCredits();
          console.log('Credits updated:', updatedCredits);
          
          toast({
            title: "Crédits mis à jour !",
            description: `Nouveau solde: ${updatedCredits.current_balance} crédits`,
          });
        } catch (error) {
          console.error('Erreur rafraîchissement crédits:', error);
        }
      }
      
      if (type === 'subscription' && onPlanChange) {
        // Rafraîchir l'abonnement actuel
        try {
          const updatedSubscription = await paymentService.getCurrentSubscription();
          console.log('Subscription updated:', updatedSubscription);
          
          if (updatedSubscription) {
            const newPlan = updatedSubscription.plan.plan_key;
            console.log('Payment successful, updating plan to:', newPlan);
            onPlanChange(newPlan);
            
            toast({
              title: "Abonnement activé !",
              description: `Plan ${updatedSubscription.plan.name} maintenant actif`,
            });
          }
        } catch (error) {
          console.error('Erreur rafraîchissement abonnement:', error);
          // Fallback: utiliser l'ID de l'item
          console.log('Fallback: updating plan to item ID:', item.id);
          onPlanChange(item.id);
        }
      }
      
      // Passer à l'étape de succès
      setPaymentResult(result);
      setCurrentStep('success');
      
    } catch (error) {
      console.error('Erreur traitement succès paiement:', error);
      
      // En cas d'erreur, continuer quand même vers l'écran de succès
      setPaymentResult(result);
      setCurrentStep('success');
      
      // Mettre à jour le plan en mode fallback
      if (type === 'subscription' && onPlanChange) {
        console.log('Error fallback: updating plan to item ID:', item.id);
        onPlanChange(item.id);
      }
      
      toast({
        title: "Paiement confirmé",
        description: "Votre paiement a été traité avec succès",
      });
    }
  };

  const handleContinue = () => {
    setCurrentStep('form');
    setPaymentResult(null);
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'success') {
      setCurrentStep('form');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen py-8">
        <div className="bg-white min-h-screen">
          {currentStep === 'form' && (
            <PaymentForm
              type={type}
              item={item}
              onBack={handleBack}
              onSuccess={handlePaymentSuccess}
            />
          )}
          
          {currentStep === 'success' && paymentResult && (
            <PaymentSuccess
              paymentResult={paymentResult}
              onContinue={handleContinue}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentManager;