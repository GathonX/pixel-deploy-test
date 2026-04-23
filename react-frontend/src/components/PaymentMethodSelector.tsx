import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { default as api } from '@/services/api';

// Mapping des méthodes de paiement avec des icônes et des détails
const PAYMENT_METHODS = {
  'orange_money': {
    name: 'Orange Money',
    icon: LucideIcons.Smartphone,
    description: 'Paiement mobile via Orange Money'
  },
  'bank_transfer': {
    name: 'Virement Bancaire',
    icon: LucideIcons.CreditCard, // Utiliser CreditCard comme alternative
    description: 'Transfert direct depuis votre compte bancaire'
  },
  'airtel_money': {
    name: 'Airtel Money',
    icon: LucideIcons.Smartphone,
    description: 'Paiement mobile via Airtel Money'
  },
  'mvola': {
    name: 'Mvola',
    icon: LucideIcons.Smartphone,
    description: 'Solution de paiement mobile de Madagascar'
  },
  'taptap_send': {
    name: 'TapTap Send',
    icon: LucideIcons.DollarSign,
    description: 'Plateforme de transfert international'
  },
  'other': {
    name: 'Autre',
    icon: LucideIcons.CreditCard,
    description: 'Autres méthodes de paiement'
  }
};

interface PaymentMethodSelectorProps {
  invoiceId: number;
  availableMethods: string[];
  onPaymentMethodSelected?: (method: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  invoiceId, 
  availableMethods,
  onPaymentMethodSelected
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method);
  };

  const handleSubmitPayment = async () => {
    if (!selectedMethod) {
      toast({
        title: '❌ Méthode de paiement requise',
        description: 'Veuillez sélectionner une méthode de paiement',
        variant: 'destructive'
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('payment_method', selectedMethod);
      formData.append('transaction_reference', transactionReference);
      
      if (paymentProof) {
        formData.append('payment_proof', paymentProof);
      }

      const response = await api.post(`/features/invoices/${invoiceId}/submit-payment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast({
          title: '✅ Paiement soumis',
          description: 'Votre paiement a été soumis avec succès',
        });

        // Appeler le callback si fourni
        onPaymentMethodSelected?.(selectedMethod);
        
        // Fermer le dialogue
        setIsOpen(false);
      } else {
        toast({
          title: '❌ Erreur de paiement',
          description: response.data.message || 'Une erreur est survenue lors de la soumission du paiement',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erreur de soumission de paiement', error);
      toast({
        title: '❌ Erreur de paiement',
        description: error.response?.data?.message || 'Une erreur réseau est survenue',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Button 
        variant="secondary" 
        onClick={() => setIsOpen(true)}
        className="w-full"
      >
        Choisir une méthode de paiement
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sélectionner une méthode de paiement</DialogTitle>
            <DialogDescription>
              Choisissez votre méthode de paiement pour la facture
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {availableMethods.map((method) => {
              const methodInfo = PAYMENT_METHODS[method];
              const Icon = methodInfo.icon;

              return (
                <div 
                  key={method}
                  onClick={() => handleMethodSelect(method)}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all
                    ${selectedMethod === method 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-400'}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-6 h-6" />
                    <div>
                      <h3 className="font-semibold">{methodInfo.name}</h3>
                      <p className="text-sm text-gray-500">{methodInfo.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedMethod && (
            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="transaction-ref" className="block mb-2">
                  Référence de transaction
                </label>
                <input 
                  id="transaction-ref"
                  type="text" 
                  placeholder="Entrez la référence de transaction"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label htmlFor="payment-proof" className="block mb-2">
                  Preuve de paiement (optionnel)
                </label>
                <input 
                  id="payment-proof"
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPaymentProof(file);
                  }}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitPayment}
              disabled={!selectedMethod || !transactionReference}
            >
              Soumettre le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
