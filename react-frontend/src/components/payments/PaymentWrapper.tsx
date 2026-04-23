// src/components/payments/PaymentWrapper.tsx
// ✅ WRAPPER ISOLÉ POUR LE SYSTÈME DE PAIEMENT
// ✅ PRÉSERVATION : Tous les styles du système payment isolés
// ✅ MODULARITÉ : Même pattern que funnel-crm

import React from 'react';
import './payment-isolated.css';

interface PaymentWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const PaymentWrapper: React.FC<PaymentWrapperProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`payment-isolated ${className}`}>
      {children}
    </div>
  );
};

export default PaymentWrapper;