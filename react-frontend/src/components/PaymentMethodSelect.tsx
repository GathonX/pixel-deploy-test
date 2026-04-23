import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { default as api } from '@/services/api';

// Types de méthodes de paiement
const PAYMENT_METHODS = {
  'orange_money': 'Orange Money',
  'bank_transfer': 'Virement bancaire',
  'airtel_money': 'Airtel Money',
  'mvola': 'Mvola',
  'taptap_send': 'TapTap send',
  'other': 'Autre'
};

interface PaymentMethodSelectProps {
  availableMethods: string[];
  invoiceId?: number;
  onMethodSelect?: (method: string) => void;
}

export const PaymentMethodSelect: React.FC<PaymentMethodSelectProps> = ({
  availableMethods = Object.keys(PAYMENT_METHODS),
  invoiceId,
  onMethodSelect
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    onMethodSelect?.(method);
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

    if (!transactionReference) {
      toast({
        title: '❌ Référence de transaction requise',
        description: 'Veuillez saisir une référence de transaction',
        variant: 'destructive'
      });
      return;
    }

    if (invoiceId) {
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
            description: 'Votre paiement a été soumis avec succès'
          });
        } else {
          toast({
            title: '❌ Erreur de paiement',
            description: response.data.message || 'Une erreur est survenue',
            variant: 'destructive'
          });
        }
      } catch (error) {
        toast({
          title: '❌ Erreur de réseau',
          description: error.response?.data?.message || 'Erreur lors de la soumission du paiement',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="payment-method" className="block mb-2 text-sm font-medium">
          Méthode de paiement
        </label>
        <Select onValueChange={handleMethodChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez une méthode de paiement" />
          </SelectTrigger>
          <SelectContent>
            {availableMethods.map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHODS[method as keyof typeof PAYMENT_METHODS]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMethod && (
        <>
          <div>
            <label htmlFor="transaction-ref" className="block mb-2 text-sm font-medium">
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
            <label htmlFor="payment-proof" className="block mb-2 text-sm font-medium">
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

          <Button 
            onClick={handleSubmitPayment}
            className="w-full"
          >
            Soumettre le paiement
          </Button>
        </>
      )}
    </div>
  );
};
